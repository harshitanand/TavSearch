const Query = require('../models/Query');
const Result = require('../models/Result');
const User = require('../models/User');
const workflowService = require('./workflow.service');
const cacheService = require('./cache.service');
const { logger } = require('../utils/logger');
const { AnalysisError, ValidationError } = require('../utils/errors');
const { v4: uuidv4 } = require('uuid');

class AnalysisService {
  constructor() {
    this.activeAnalyses = new Map();
  }

  async startAnalysis({ userId, query, priority = 1, tags = [] }) {
    // Validate user
    const user = await User.findOne({ userId });
    if (!user) {
      throw new ValidationError('User not found');
    }

    // Check usage limits
    if (!user.canPerformAnalysis()) {
      throw new AnalysisError('Monthly analysis limit exceeded', 429);
    }

    // Check for duplicate recent analysis
    const recentQuery = await Query.findOne({
      userId,
      queryText: query,
      createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // 5 minutes
    });

    if (recentQuery) {
      throw new AnalysisError('Identical query submitted recently. Please wait.', 409);
    }

    // Create query record
    const queryDoc = new Query({
      userId,
      queryText: query,
      priority,
      tags,
      status: 'pending',
      metadata: {
        estimatedDuration: this.estimateAnalysisDuration(query)
      }
    });

    await queryDoc.save();

    // Start workflow asynchronously
    this.executeAnalysisWorkflow(queryDoc._id.toString(), userId, query)
      .catch(error => {
        logger.error('Workflow execution failed:', error);
        this.handleWorkflowError(queryDoc._id.toString(), error);
      });

    // Update user usage
    await user.incrementUsage();

    return {
      queryId: queryDoc._id.toString(),
      status: 'pending',
      estimatedDuration: queryDoc.metadata.estimatedDuration
    };
  }

  async executeAnalysisWorkflow(queryId, userId, query) {
    try {
      // Update status to processing
      await Query.findByIdAndUpdate(queryId, { status: 'processing' });

      const startTime = Date.now();
      logger.info(`Starting workflow for query ${queryId}`);

      // Execute workflow
      const workflowResult = await workflowService.executeWorkflow(query, userId);

      // Save results
      const result = new Result({
        queryId,
        searchStrategy: workflowResult.searchStrategy,
        rawData: workflowResult.rawData,
        processedData: workflowResult.processedData,
        analysisResults: workflowResult.analysisResults,
        finalReport: workflowResult.finalReport,
        visualizations: workflowResult.visualizations,
        performance: {
          ...workflowResult.metadata.performance,
          totalDuration: Date.now() - startTime
        }
      });

      await result.save();

      // Update query status
      await Query.findByIdAndUpdate(queryId, {
        status: 'completed',
        'metadata.actualDuration': Date.now() - startTime
      });

      // Cache results
      await cacheService.setAnalysisResults(queryId, result);

      logger.info(`Analysis completed for query ${queryId}`, {
        duration: Date.now() - startTime
      });

    } catch (error) {
      await this.handleWorkflowError(queryId, error);
      throw error;
    }
  }

  async handleWorkflowError(queryId, error) {
    logger.error(`Workflow error for query ${queryId}:`, error);

    await Query.findByIdAndUpdate(queryId, {
      status: 'failed',
      'metadata.errorMessage': error.message
    });
  }

  async getAnalysisStatus(queryId, userId) {
    const query = await Query.findOne({ _id: queryId, userId });
    
    if (!query) {
      return null;
    }

    const response = {
      queryId: query._id.toString(),
      status: query.status,
      query: query.queryText,
      createdAt: query.createdAt,
      updatedAt: query.updatedAt,
      metadata: query.metadata
    };

    // Add progress info if processing
    if (query.status === 'processing') {
      const progress = await workflowService.getWorkflowProgress(queryId);
      response.progress = progress;
    }

    return response;
  }

  async getAnalysisResults(queryId, userId, format = 'json') {
    const query = await Query.findOne({ _id: queryId, userId });
    
    if (!query) {
      return null;
    }

    if (query.status !== 'completed') {
      throw new AnalysisError(`Analysis is ${query.status}, results not available`, 400);
    }

    // Try cache first
    const cached = await cacheService.getAnalysisResults(queryId);
    if (cached) {
      return this.formatResults(cached, format);
    }

    // Fetch from database
    const result = await Result.findOne({ queryId }).populate('query');
    
    if (!result) {
      throw new AnalysisError('Results not found', 404);
    }

    // Cache for future requests
    await cacheService.setAnalysisResults(queryId, result);

    return this.formatResults(result, format);
  }

  async cancelAnalysis(queryId, userId) {
    const query = await Query.findOne({ _id: queryId, userId });
    
    if (!query) {
      throw new AnalysisError('Analysis not found', 404);
    }

    if (query.status === 'completed') {
      throw new AnalysisError('Cannot cancel completed analysis', 400);
    }

    if (query.status === 'failed') {
      throw new AnalysisError('Analysis already failed', 400);
    }

    // Cancel workflow if running
    await workflowService.cancelWorkflow(queryId);

    // Update status
    await query.updateStatus('cancelled');
  }

  async retryAnalysis(queryId, userId) {
    const originalQuery = await Query.findOne({ _id: queryId, userId });
    
    if (!originalQuery) {
      throw new AnalysisError('Original analysis not found', 404);
    }

    if (originalQuery.status !== 'failed') {
      throw new AnalysisError('Can only retry failed analyses', 400);
    }

    // Increment retry count
    await originalQuery.incrementRetry();

    if (originalQuery.metadata.retryCount >= 3) {
      throw new AnalysisError('Maximum retry attempts exceeded', 429);
    }

    // Start new analysis
    return this.startAnalysis({
      userId,
      query: originalQuery.queryText,
      priority: originalQuery.priority,
      tags: originalQuery.tags
    });
  }

  async getUserAnalyses(userId, options = {}) {
    const { limit, skip, status, sortBy, sortOrder } = options;
    
    const queries = await Query.findByUser(userId, { limit, skip, status })
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 });

    const total = await Query.countDocuments({ userId });

    return {
      analyses: queries,
      pagination: {
        total,
        limit,
        skip,
        hasMore: skip + queries.length < total
      }
    };
  }

  formatResults(result, format) {
    switch (format.toLowerCase()) {
      case 'summary':
        return {
          queryId: result.queryId,
          query: result.query?.queryText,
          status: 'completed',
          keyTrends: result.analysisResults?.keyTrends || [],
          recommendations: result.analysisResults?.recommendations || [],
          confidence: result.analysisResults?.dataConfidence,
          createdAt: result.createdAt
        };
      
      case 'json':
      default:
        return result;
    }
  }

  estimateAnalysisDuration(query) {
    // Simple heuristic for estimation
    const wordCount = query.split(' ').length;
    const baseTime = 60000; // 1 minute base
    const additionalTime = wordCount * 5000; // 5 seconds per word
    return Math.min(baseTime + additionalTime, 300000); // Max 5 minutes
  }
}

module.exports = new AnalysisService();

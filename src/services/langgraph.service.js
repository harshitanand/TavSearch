const MarketIntelligenceGraph = require('../workflows/MarketIntelligenceGraph');
const Query = require('../models/Query');
const Result = require('../models/Result');
const { logger } = require('../utils/logger');
const { EventEmitter } = require('events');

class LangGraphService extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.graph = new MarketIntelligenceGraph(config);
    this.activeWorkflows = new Map();
    this.maxConcurrentWorkflows = config.analysis?.maxConcurrent || 5;
  }

  static async startAnalysis({ userId, query, priority = 1, tags = [] }) {
    // Check concurrent workflow limit
    if (this.activeWorkflows.size >= this.maxConcurrentWorkflows) {
      throw new Error('Maximum concurrent analyses reached. Please try again later.');
    }

    try {
      // Create database record
      const queryRecord = new Query({
        userId,
        queryText: query,
        priority,
        tags,
        status: 'pending',
        framework: 'langgraph',
        createdAt: new Date(),
      });

      await queryRecord.save();
      const queryId = queryRecord._id.toString();

      // Track active workflow
      this.activeWorkflows.set(queryId, {
        startTime: Date.now(),
        status: 'running',
        userId,
      });

      // Start async processing
      this.processAnalysisAsync(queryId, query, userId, queryRecord);

      return {
        queryId,
        status: 'started',
        estimatedDuration: '2-5 minutes',
        framework: 'langgraph',
      };
    } catch (error) {
      logger.error('Failed to start LangGraph analysis:', error);
      throw error;
    }
  }

  static async processAnalysisAsync(queryId, query, userId, queryRecord) {
    try {
      logger.info(`Starting LangGraph analysis for query ${queryId}`);

      // Update status to processing
      await Query.findByIdAndUpdate(queryId, {
        status: 'processing',
        startedAt: new Date(),
      });

      // Execute LangGraph workflow
      const result = await this.graph.execute(query, userId);

      if (result.success) {
        // Save successful results
        const resultRecord = new Result({
          queryId,
          userId,
          data: result.data,
          metadata: result.metadata,
          framework: 'langgraph',
          analysisType: 'market_intelligence',
          createdAt: new Date(),
        });

        await resultRecord.save();

        // Update query status
        await Query.findByIdAndUpdate(queryId, {
          status: 'completed',
          completedAt: new Date(),
          resultId: resultRecord._id,
        });

        logger.info(`LangGraph analysis completed successfully for query ${queryId}`);

        // Emit completion event
        this.emit('analysis_completed', {
          queryId,
          userId,
          status: 'completed',
          resultId: resultRecord._id,
        });
      } else {
        // Handle failure
        await Query.findByIdAndUpdate(queryId, {
          status: 'failed',
          error: result.error,
          completedAt: new Date(),
        });

        logger.error(`LangGraph analysis failed for query ${queryId}:`, result.error);

        this.emit('analysis_failed', {
          queryId,
          userId,
          status: 'failed',
          error: result.error,
        });
      }
    } catch (error) {
      logger.error(`LangGraph analysis processing error for query ${queryId}:`, error);

      // Update database with error
      await Query.findByIdAndUpdate(queryId, {
        status: 'failed',
        error: error.message,
        completedAt: new Date(),
      });

      this.emit('analysis_failed', {
        queryId,
        userId,
        status: 'failed',
        error: error.message,
      });
    } finally {
      // Remove from active workflows
      this.activeWorkflows.delete(queryId);
    }
  }

  static async getAnalysisStatus(queryId, userId) {
    try {
      const query = await Query.findOne({ _id: queryId, userId });

      if (!query) {
        return null;
      }

      // Get workflow info if still active
      const activeWorkflow = this.activeWorkflows.get(queryId);
      let progress = null;

      if (activeWorkflow) {
        const runtime = Date.now() - activeWorkflow.startTime;
        progress = {
          status: 'processing',
          runtime: Math.floor(runtime / 1000),
          estimatedRemaining: Math.max(0, 180 - Math.floor(runtime / 1000)), // 3 min est
        };
      }

      return {
        queryId,
        status: query.status,
        query: query.queryText,
        framework: 'langgraph',
        createdAt: query.createdAt,
        startedAt: query.startedAt,
        completedAt: query.completedAt,
        progress,
        error: query.error,
      };
    } catch (error) {
      logger.error('Failed to get LangGraph analysis status:', error);
      throw error;
    }
  }

  static async getAnalysisResults(queryId, userId) {
    try {
      const query = await Query.findOne({ _id: queryId, userId });

      if (!query) {
        return null;
      }

      if (query.status !== 'completed') {
        return {
          status: query.status,
          error: query.error,
        };
      }

      const result = await Result.findOne({ queryId, userId });

      if (!result) {
        throw new Error('Results not found');
      }

      return {
        queryId,
        status: 'completed',
        framework: 'langgraph',
        query: query.queryText,
        results: result.data,
        metadata: result.metadata,
        createdAt: result.createdAt,
        // Transform for frontend compatibility
        finalReport: result.data?.finalReport,
        analysisResults: result.data?.analysisResults,
        processedData: result.data?.processedData,
        rawData: result.data?.rawData?.slice(0, 20), // Limit for performance
      };
    } catch (error) {
      logger.error('Failed to get LangGraph analysis results:', error);
      throw error;
    }
  }

  static async cancelAnalysis(queryId, userId) {
    try {
      const query = await Query.findOne({ _id: queryId, userId });

      if (!query) {
        throw new Error('Analysis not found');
      }

      if (query.status === 'completed') {
        throw new Error('Cannot cancel completed analysis');
      }

      // Update status
      await Query.findByIdAndUpdate(queryId, {
        status: 'cancelled',
        completedAt: new Date(),
      });

      // Remove from active workflows
      this.activeWorkflows.delete(queryId);

      logger.info(`LangGraph analysis cancelled: ${queryId}`);

      return { success: true };
    } catch (error) {
      logger.error('Failed to cancel LangGraph analysis:', error);
      throw error;
    }
  }

  static async retryAnalysis(queryId, userId) {
    try {
      const originalQuery = await Query.findOne({ _id: queryId, userId });

      if (!originalQuery) {
        throw new Error('Original analysis not found');
      }

      // Start new analysis with same parameters
      return await this.startAnalysis({
        userId,
        query: originalQuery.queryText,
        priority: originalQuery.priority,
        tags: originalQuery.tags,
      });
    } catch (error) {
      logger.error('Failed to retry LangGraph analysis:', error);
      throw error;
    }
  }

  static async getUserAnalyses(userId, options = {}) {
    try {
      const { limit = 10, skip = 0, status, sortBy = 'createdAt', sortOrder = 'desc' } = options;

      const query = { userId, framework: 'langgraph' };
      if (status) {
        query.status = status;
      }

      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const analyses = await Query.find(query)
        .sort(sortOptions)
        .limit(limit)
        .skip(skip)
        .select('_id queryText status priority tags createdAt completedAt error framework');

      const total = await Query.countDocuments(query);

      return {
        analyses: analyses.map((analysis) => ({
          queryId: analysis._id,
          query: analysis.queryText,
          status: analysis.status,
          framework: analysis.framework,
          priority: analysis.priority,
          tags: analysis.tags,
          createdAt: analysis.createdAt,
          completedAt: analysis.completedAt,
          error: analysis.error,
        })),
        pagination: {
          total,
          limit,
          skip,
          hasMore: skip + analyses.length < total,
        },
      };
    } catch (error) {
      logger.error('Failed to get user LangGraph analyses:', error);
      throw error;
    }
  }

  // Health check method
  getStatus() {
    return {
      framework: 'langgraph',
      activeWorkflows: this.activeWorkflows.size,
      maxConcurrentWorkflows: this.maxConcurrentWorkflows,
      healthy: true,
    };
  }
}

module.exports = LangGraphService;

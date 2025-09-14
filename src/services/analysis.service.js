const LangChainMultiAgent = require('../workflows/LangChainMultiAgent');
const Query = require('../models/Query');
const Result = require('../models/Result');
const { logger } = require('../utils/logger');
const { EventEmitter } = require('events');

class AnalysisService extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.multiAgent = new LangChainMultiAgent(config);
    this.activeWorkflows = new Map();
    this.maxConcurrentWorkflows = config.analysis?.maxConcurrent || 5;
  }

  async startAnalysis({ userId, query, priority = 1, tags = [] }) {
    // Check concurrent workflow limit
    if (this.activeWorkflows?.size >= this.maxConcurrentWorkflows) {
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
        framework: 'langchain-multiagent',
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
        framework: 'langchain-multiagent',
      };
    } catch (error) {
      logger.error('Failed to start LangChain Multi-Agent analysis:', error);
      throw error;
    }
  }

  async processAnalysisAsync(queryId, query, userId, queryRecord) {
    try {
      logger.info(`Starting LangChain Multi-Agent analysis for query ${queryId}`);

      // Update status to processing
      await Query.findByIdAndUpdate(queryId, {
        status: 'processing',
        startedAt: new Date(),
      });

      // Execute Multi-Agent workflow (now includes formatter)
      const result = await this.multiAgent.execute(query, userId);

      if (result.success && result.data) {
        logger.info('Workflow completed, data should now be clean', {
          queryId,
          rawDataType: typeof result.data?.rawData,
          rawDataIsArray: Array.isArray(result.data?.rawData),
          rawDataCount: result.data?.rawData?.length || 0,
        });

        // Data should now be clean from the formatter agent
        const cleanRawData = result.data.rawData || [];

        // Verify it's actually an array
        if (!Array.isArray(cleanRawData)) {
          logger.error('Data is still not an array after formatting!', {
            queryId,
            type: typeof cleanRawData,
          });
          throw new Error('Data formatting failed - not an array');
        }

        // Create result record with clean data
        const resultRecord = new Result({
          queryId: queryId,

          searchStrategy: {
            primaryTerms: result.data.searchPlan?.primaryTerms || [],
            secondaryTerms: result.data.searchPlan?.secondaryTerms || [],
            searchCategories: result.data.searchPlan?.searchCategories || [],
            timeRange: result.data.searchPlan?.timeframe || 'recent',
          },

          metaData: result,
          rawData: cleanRawData, // This should now be a clean array

          processedData: {
            totalSources: result.data.processedData.totalSources || 0,
            qualityMetrics: {
              averageRelevanceScore:
                result.data.processedData.qualityMetrics.averageRelevanceScore || 0,
              highQualitySources: result.data.processedData.qualityMetrics.highQualitySources || 0,
              recentSources: result.data.processedData.qualityMetrics.recentSources || 0,
            },
            domainDistribution: this.calculateDomainDistribution(cleanRawData),
          },

          analysisResults: {
            keyTrends: result.data.analysisResults?.keyTrends || [],
            marketOpportunities: result.data.analysisResults?.opportunities || [],
            competitiveLandscape: {
              majorPlayers: result.data.analysisResults?.keyPlayers || [],
              marketPosition: result.data.analysisResults?.sentiment || 'neutral',
            },
            insights: result.data.analysisResults?.insights || [],
            recommendations: result.data.analysisResults?.recommendations || [],
            riskFactors: result.data.analysisResults?.challenges || [],
            dataConfidence: result.data.analysisResults?.confidence || 'medium',
            summary: result.data.analysisResults?.summary || 'Analysis completed',
          },

          finalReport: result.data.finalReport || 'Report generated',

          performance: {
            searchDuration: 0,
            analysisDuration: 0,
            totalDuration: result.metadata?.duration || 0,
            sourcesProcessed: cleanRawData.length,
            apiCallsCount: result.data.metadata?.searchTermsUsed || 0,
          },
        });

        // Save to database
        logger.info('Saving clean result to database', { queryId });
        await resultRecord.save();

        logger.info('Result saved successfully', {
          queryId,
          resultId: resultRecord._id,
          rawDataCount: resultRecord.rawData.length,
        });

        // Update query status
        await Query.findByIdAndUpdate(queryId, {
          status: 'completed',
          completedAt: new Date(),
          metadata: {
            ...queryRecord.metadata,
            resultId: resultRecord._id,
          },
        });

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
          metadata: {
            ...queryRecord.metadata,
            error: result.error,
          },
        });

        this.emit('analysis_failed', {
          queryId,
          userId,
          status: 'failed',
          error: result.error,
        });
      }
    } catch (error) {
      logger.error(`Analysis processing error for query ${queryId}:`, error);

      await Query.findByIdAndUpdate(queryId, {
        status: 'failed',
        metadata: {
          ...queryRecord.metadata,
          error: error.message,
        },
      });

      this.emit('analysis_failed', {
        queryId,
        userId,
        status: 'failed',
        error: error.message,
      });
    } finally {
      this.activeWorkflows.delete(queryId);
    }
  }

  async getAnalysisStatus(queryId, userId) {
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
        framework: 'langchain-multiagent',
        createdAt: query.createdAt,
        startedAt: query.startedAt,
        completedAt: query.completedAt,
        progress,
        error: query.error,
      };
    } catch (error) {
      logger.error('Failed to get LangChain Multi-Agent analysis status:', error);
      throw error;
    }
  }

  extractAgentSteps(data) {
    if (!data || !data.messages) return [];

    return data.messages.map((message, index) => ({
      step: index + 1,
      agent: this.identifyAgentFromMessage(message, index),
      message: message.content || message.text,
      timestamp: data.metadata?.timestamps?.[index] || new Date().toISOString(),
    }));
  }

  identifyAgentFromMessage(message, index) {
    const agentMap = {
      0: 'User Input',
      1: 'Planner Agent',
      2: 'Search Agent',
      3: 'Analysis Agent',
      4: 'Synthesis Agent',
      5: 'Validator Agent',
    };
    return agentMap[index] || 'Unknown Agent';
  }

  async cancelAnalysis(queryId, userId) {
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

      logger.info(`LangChain Multi-Agent analysis cancelled: ${queryId}`);

      return { success: true };
    } catch (error) {
      logger.error('Failed to cancel LangChain Multi-Agent analysis:', error);
      throw error;
    }
  }

  async retryAnalysis(queryId, userId) {
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
      logger.error('Failed to retry LangChain Multi-Agent analysis:', error);
      throw error;
    }
  }

  async getUserAnalyses(userId, options = {}) {
    try {
      const { limit = 10, skip = 0, status, sortBy = 'createdAt', sortOrder = 'desc' } = options;

      const query = { userId, framework: 'langchain-multiagent' };
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
      logger.error('Failed to get user LangChain Multi-Agent analyses:', error);
      throw error;
    }
  }

  async getAnalysisResults(queryId, userId) {
    try {
      // Check if query exists and belongs to user
      const query = await Query.findOne({ _id: queryId, userId });
      if (!query) {
        return null;
      }

      // Get the result
      const result = await Result.findOne({ queryId }).populate('queryId');
      if (!result) {
        return null;
      }

      return {
        queryId,
        status: query.status,
        queryText: query.queryText,
        createdAt: query.createdAt,
        completedAt: query.metadata?.completedAt,
        searchStrategy: result.searchStrategy,
        rawData: result.rawData,
        processedData: result.processedData,
        analysisResults: result.analysisResults,
        finalReport: result.finalReport,
        performance: result.performance,
        metadata: {
          framework: 'langchain-multiagent',
          totalSources: result.processedData?.totalSources || 0,
          dataConfidence: result.analysisResults?.dataConfidence || 'medium',
        },
      };
    } catch (error) {
      logger.error('Failed to get analysis results:', error);
      throw error;
    }
  }

  getStatus() {
    return {
      framework: 'langchain-multiagent',
      activeWorkflows: this.activeWorkflows.size,
      maxConcurrentWorkflows: this.maxConcurrentWorkflows,
      agents: [
        'PlannerAgent - Search strategy creation',
        'SearchAgent - Data gathering via Tavily API',
        'AnalysisAgent - Data processing and analysis',
        'SynthesisAgent - Report generation',
        'ValidatorAgent - Quality control',
      ],
      healthy: true,
    };
  }

  calculateAverageRelevance(rawData) {
    if (!rawData || rawData.length === 0) return 0;
    const total = rawData.reduce((sum, item) => sum + (item.relevanceScore || item.score || 0), 0);
    return Math.round((total / rawData.length) * 100) / 100;
  }

  calculateDomainDistribution(rawData) {
    if (!rawData || rawData.length === 0) return {};

    const domains = {};
    rawData.forEach((item) => {
      if (item.url) {
        try {
          const domain = new URL(item.url).hostname;
          domains[domain] = (domains[domain] || 0) + 1;
        } catch (error) {
          // Invalid URL, skip
        }
      }
    });

    return domains;
  }
}

module.exports = AnalysisService;

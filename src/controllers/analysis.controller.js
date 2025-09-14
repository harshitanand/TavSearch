const analysisService = require('../services/analysis.service');
const { logger } = require('../utils/logger');
const { ApiResponse } = require('../utils/response');
const { AnalysisError } = require('../utils/errors');

class AnalysisController {
  async startAnalysis(req, res, next) {
    try {
      const { query, priority = 1, tags = [] } = req.body;
      const userId = req.user.userId;

      logger.info(`Starting analysis for user ${userId}`, { query, priority });

      const result = await analysisService.startAnalysis({
        userId,
        query: query.trim(),
        priority,
        tags,
      });

      res.status(202).json(
        new ApiResponse(true, 'Analysis started successfully', {
          queryId: result.queryId,
          estimatedDuration: result.estimatedDuration,
          status: result.status,
        })
      );
    } catch (error) {
      logger.error('Failed to start analysis:', error);
      next(error);
    }
  }

  async getAnalysisStatus(req, res, next) {
    try {
      const { queryId } = req.params;
      const userId = req.user.userId;

      const status = await analysisService.getAnalysisStatus(queryId, userId);

      if (!status) {
        throw new AnalysisError('Analysis not found', 404);
      }

      res.json(new ApiResponse(true, 'Status retrieved successfully', status));
    } catch (error) {
      logger.error('Failed to get analysis status:', error);
      next(error);
    }
  }

  async getAnalysisResults(req, res, next) {
    try {
      const { queryId } = req.params;
      const userId = req.user.userId;
      const { format = 'json' } = req.query;

      const results = await analysisService.getAnalysisResults(queryId, userId, format);

      if (!results) {
        throw new AnalysisError('Analysis results not found', 404);
      }

      res.json(new ApiResponse(true, 'Results retrieved successfully', results));
    } catch (error) {
      logger.error('Failed to get analysis results:', error);
      next(error);
    }
  }

  async cancelAnalysis(req, res, next) {
    try {
      const { queryId } = req.params;
      const userId = req.user.userId;

      await analysisService.cancelAnalysis(queryId, userId);

      res.json(new ApiResponse(true, 'Analysis cancelled successfully'));
    } catch (error) {
      logger.error('Failed to cancel analysis:', error);
      next(error);
    }
  }

  async retryAnalysis(req, res, next) {
    try {
      const { queryId } = req.params;
      const userId = req.user.userId;

      const result = await analysisService.retryAnalysis(queryId, userId);

      res.json(
        new ApiResponse(true, 'Analysis retry started', {
          newQueryId: result.queryId,
          status: result.status,
        })
      );
    } catch (error) {
      logger.error('Failed to retry analysis:', error);
      next(error);
    }
  }

  async getUserAnalyses(req, res, next) {
    try {
      const userId = req.user.userId;
      const { limit = 10, skip = 0, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

      const analyses = await analysisService.getUserAnalyses(userId, {
        limit: parseInt(limit),
        skip: parseInt(skip),
        status,
        sortBy,
        sortOrder,
      });

      res.json(new ApiResponse(true, 'Analyses retrieved successfully', analyses));
    } catch (error) {
      logger.error('Failed to get user analyses:', error);
      next(error);
    }
  }
}

module.exports = new AnalysisController();

const Query = require('../models/Query');
const Result = require('../models/Result');
const User = require('../models/User');
const { logger } = require('../utils/logger');
const { ApiResponse } = require('../utils/response');

class AnalyticsController {
  async getSystemAnalytics(req, res, next) {
    try {
      const { startDate, endDate } = req.query;
      const dateFilter = this.buildDateFilter(startDate, endDate);

      const [
        totalUsers,
        totalQueries,
        completedAnalyses,
        failedAnalyses,
        avgDuration,
        topQueries
      ] = await Promise.all([
        User.countDocuments(),
        Query.countDocuments(dateFilter),
        Query.countDocuments({ ...dateFilter, status: 'completed' }),
        Query.countDocuments({ ...dateFilter, status: 'failed' }),
        this.getAverageDuration(dateFilter),
        this.getTopQueries(dateFilter)
      ]);

      const analytics = {
        overview: {
          totalUsers,
          totalQueries,
          completedAnalyses,
          failedAnalyses,
          successRate: totalQueries > 0 ? (completedAnalyses / totalQueries * 100).toFixed(2) : 0,
          avgDuration: avgDuration || 0
        },
        trends: {
          topQueries
        }
      };

      res.json(new ApiResponse(true, 'System analytics retrieved', analytics));

    } catch (error) {
      logger.error('Failed to get system analytics:', error);
      next(error);
    }
  }

  async getUserAnalytics(req, res, next) {
    try {
      const userId = req.user.userId;
      const { startDate, endDate } = req.query;
      const dateFilter = { userId, ...this.buildDateFilter(startDate, endDate) };

      const [
        totalQueries,
        completedAnalyses,
        failedAnalyses,
        avgDuration,
        recentActivity
      ] = await Promise.all([
        Query.countDocuments(dateFilter),
        Query.countDocuments({ ...dateFilter, status: 'completed' }),
        Query.countDocuments({ ...dateFilter, status: 'failed' }),
        this.getAverageDuration(dateFilter),
        this.getRecentActivity(userId, 7) // Last 7 days
      ]);

      const analytics = {
        overview: {
          totalQueries,
          completedAnalyses,
          failedAnalyses,
          successRate: totalQueries > 0 ? (completedAnalyses / totalQueries * 100).toFixed(2) : 0,
          avgDuration: avgDuration || 0
        },
        activity: recentActivity
      };

      res.json(new ApiResponse(true, 'User analytics retrieved', analytics));

    } catch (error) {
      logger.error('Failed to get user analytics:', error);
      next(error);
    }
  }

  async getQueryTrends(req, res, next) {
    try {
      const { period = '30d' } = req.query;
      const days = parseInt(period.replace('d', ''));
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const trends = await Query.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            },
            count: { $sum: 1 },
            completed: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            failed: {
              $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
            }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      res.json(new ApiResponse(true, 'Query trends retrieved', trends));

    } catch (error) {
      logger.error('Failed to get query trends:', error);
      next(error);
    }
  }

  async getPerformanceMetrics(req, res, next) {
    try {
      const performanceMetrics = await Result.aggregate([
        {
          $group: {
            _id: null,
            avgTotalDuration: { $avg: '$performance.totalDuration' },
            avgSearchDuration: { $avg: '$performance.searchDuration' },
            avgAnalysisDuration: { $avg: '$performance.analysisDuration' },
            avgSourcesProcessed: { $avg: '$performance.sourcesProcessed' },
            totalApiCalls: { $sum: '$performance.apiCallsCount' }
          }
        }
      ]);

      res.json(new ApiResponse(true, 'Performance metrics retrieved', 
        performanceMetrics[0] || {}));

    } catch (error) {
      logger.error('Failed to get performance metrics:', error);
      next(error);
    }
  }

  buildDateFilter(startDate, endDate) {
    const filter = {};
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    return filter;
  }

  async getAverageDuration(filter) {
    const result = await Query.aggregate([
      { $match: filter },
      { $match: { 'metadata.actualDuration': { $exists: true } } },
      {
        $group: {
          _id: null,
          avgDuration: { $avg: '$metadata.actualDuration' }
        }
      }
    ]);

    return result[0]?.avgDuration || 0;
  }

  async getTopQueries(filter, limit = 10) {
    return Query.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$queryText',
          count: { $sum: 1 },
          successCount: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      },
      { $sort: { count: -1 } },
      { $limit: limit }
    ]);
  }

  async getRecentActivity(userId, days) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return Query.aggregate([
      { $match: { userId, createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
  }
}

module.exports = new AnalyticsController();

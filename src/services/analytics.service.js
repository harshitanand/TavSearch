const Query = require('../models/Query');
const Result = require('../models/Result');
const User = require('../models/User');
const { logger } = require('../utils/logger');
const { ApiError } = require('../utils/errors');

class AnalyticsService {
  constructor() {
    this.logger = logger;
  }

  async getSystemAnalytics(dateFilter = {}) {
    try {
      this.logger.info('Getting system analytics', { dateFilter });

      const [
        totalUsers,
        activeUsers,
        totalQueries,
        completedAnalyses,
        failedAnalyses,
        totalResults,
        avgProcessingTime,
        systemHealth,
      ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({
          lastLoginAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        }),
        Query.countDocuments(dateFilter),
        Query.countDocuments({ ...dateFilter, status: 'completed' }),
        Query.countDocuments({ ...dateFilter, status: 'failed' }),
        Result.countDocuments(),
        this.calculateAverageProcessingTime(dateFilter),
        this.getSystemHealthMetrics(),
      ]);

      const successRate = totalQueries > 0 ? (completedAnalyses / totalQueries) * 100 : 0;

      return {
        overview: {
          totalUsers,
          activeUsers,
          totalQueries,
          completedAnalyses,
          failedAnalyses,
          totalResults,
          successRate: Number(successRate.toFixed(2)),
          avgProcessingTime: Number((avgProcessingTime || 0).toFixed(2)),
        },
        health: systemHealth,
        trends: await this.getSystemTrends(dateFilter),
        topQueries: await this.getTopQueries(dateFilter),
        userEngagement: await this.getUserEngagementMetrics(dateFilter),
      };
    } catch (error) {
      this.logger.error('Failed to get system analytics', { error: error.message });
      throw new ApiError('Failed to retrieve system analytics', 500);
    }
  }

  async getUserAnalytics(userId, dateFilter = {}) {
    try {
      this.logger.info('Getting user analytics', { userId, dateFilter });

      const userFilter = { userId, ...dateFilter };

      const [
        userProfile,
        totalQueries,
        completedAnalyses,
        failedAnalyses,
        avgProcessingTime,
        recentActivity,
        categoryBreakdown,
        performanceMetrics,
      ] = await Promise.all([
        User.findOne({ userId }) || { userId, name: `User ${userId}` },
        Query.countDocuments(userFilter),
        Query.countDocuments({ ...userFilter, status: 'completed' }),
        Query.countDocuments({ ...userFilter, status: 'failed' }),
        this.calculateAverageProcessingTime(userFilter),
        this.getUserRecentActivity(userId, 30), // Last 30 days
        this.getUserCategoryBreakdown(userId, dateFilter),
        this.getUserPerformanceMetrics(userId, dateFilter),
      ]);

      const successRate = totalQueries > 0 ? (completedAnalyses / totalQueries) * 100 : 0;

      return {
        user: userProfile,
        overview: {
          totalQueries,
          completedAnalyses,
          failedAnalyses,
          successRate: Number(successRate.toFixed(2)),
          avgProcessingTime: Number((avgProcessingTime || 0).toFixed(2)),
        },
        activity: recentActivity,
        categories: categoryBreakdown,
        performance: performanceMetrics,
        insights: await this.generateUserInsights(userId, {
          totalQueries,
          successRate,
          avgProcessingTime,
        }),
      };
    } catch (error) {
      this.logger.error('Failed to get user analytics', { userId, error: error.message });
      throw new ApiError('Failed to retrieve user analytics', 500);
    }
  }

  async getQueryTrends(period = '30d', granularity = 'day') {
    try {
      this.logger.info('Getting query trends', { period, granularity });

      const days = parseInt(period.replace('d', ''));
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const groupBy = this.getGroupByExpression(granularity);

      const trends = await Query.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: groupBy,
            totalQueries: { $sum: 1 },
            completedQueries: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
            },
            failedQueries: {
              $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
            },
            processingQueries: {
              $sum: { $cond: [{ $eq: ['$status', 'processing'] }, 1, 0] },
            },
            avgPriority: { $avg: '$priority' },
          },
        },
        { $sort: { _id: 1 } },
        {
          $project: {
            date: '$_id',
            totalQueries: 1,
            completedQueries: 1,
            failedQueries: 1,
            processingQueries: 1,
            successRate: {
              $cond: [
                { $eq: ['$totalQueries', 0] },
                0,
                { $multiply: [{ $divide: ['$completedQueries', '$totalQueries'] }, 100] },
              ],
            },
            avgPriority: { $round: ['$avgPriority', 2] },
          },
        },
      ]);

      return {
        period,
        granularity,
        dataPoints: trends.length,
        trends,
      };
    } catch (error) {
      this.logger.error('Failed to get query trends', { error: error.message });
      throw new ApiError('Failed to retrieve query trends', 500);
    }
  }

  async getPerformanceMetrics(dateFilter = {}) {
    try {
      this.logger.info('Getting performance metrics', { dateFilter });

      const performance = await Result.aggregate([
        ...(Object.keys(dateFilter).length > 0 ? [{ $match: dateFilter }] : []),
        {
          $group: {
            _id: null,
            totalResults: { $sum: 1 },
            avgTotalDuration: { $avg: '$performance.totalDuration' },
            avgSearchDuration: { $avg: '$performance.searchDuration' },
            avgAnalysisDuration: { $avg: '$performance.analysisDuration' },
            avgSynthesisDuration: { $avg: '$performance.synthesisDuration' },
            avgSourcesProcessed: { $avg: '$performance.sourcesProcessed' },
            totalApiCalls: { $sum: '$performance.apiCallsCount' },
            avgQualityScore: { $avg: '$qualityMetrics.overallScore' },
            maxDuration: { $max: '$performance.totalDuration' },
            minDuration: { $min: '$performance.totalDuration' },
          },
        },
        {
          $project: {
            _id: 0,
            totalResults: 1,
            avgTotalDuration: { $round: ['$avgTotalDuration', 2] },
            avgSearchDuration: { $round: ['$avgSearchDuration', 2] },
            avgAnalysisDuration: { $round: ['$avgAnalysisDuration', 2] },
            avgSynthesisDuration: { $round: ['$avgSynthesisDuration', 2] },
            avgSourcesProcessed: { $round: ['$avgSourcesProcessed', 0] },
            totalApiCalls: 1,
            avgQualityScore: { $round: ['$avgQualityScore', 2] },
            maxDuration: { $round: ['$maxDuration', 2] },
            minDuration: { $round: ['$minDuration', 2] },
          },
        },
      ]);

      const metrics = performance[0] || this.getDefaultPerformanceMetrics();

      // Add additional computed metrics
      metrics.efficiency =
        metrics.avgTotalDuration > 0
          ? Number(((metrics.avgSourcesProcessed / metrics.avgTotalDuration) * 100).toFixed(2))
          : 0;

      metrics.apiEfficiency =
        metrics.totalApiCalls > 0
          ? Number((metrics.totalResults / metrics.totalApiCalls).toFixed(2))
          : 0;

      return metrics;
    } catch (error) {
      this.logger.error('Failed to get performance metrics', { error: error.message });
      throw new ApiError('Failed to retrieve performance metrics', 500);
    }
  }

  async getTopQueries(dateFilter = {}, limit = 10) {
    try {
      const topQueries = await Query.aggregate([
        ...(Object.keys(dateFilter).length > 0 ? [{ $match: dateFilter }] : []),
        {
          $group: {
            _id: '$query',
            count: { $sum: 1 },
            avgDuration: { $avg: '$duration' },
            successRate: {
              $avg: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
            },
            lastUsed: { $max: '$createdAt' },
          },
        },
        { $sort: { count: -1 } },
        { $limit: limit },
        {
          $project: {
            query: '$_id',
            count: 1,
            avgDuration: { $round: ['$avgDuration', 2] },
            successRate: { $round: [{ $multiply: ['$successRate', 100] }, 1] },
            lastUsed: 1,
            _id: 0,
          },
        },
      ]);

      return topQueries;
    } catch (error) {
      this.logger.error('Failed to get top queries', { error: error.message });
      throw new ApiError('Failed to retrieve top queries', 500);
    }
  }

  // Helper methods
  async calculateAverageProcessingTime(filter = {}) {
    try {
      const result = await Query.aggregate([
        { $match: { ...filter, duration: { $exists: true, $ne: null } } },
        {
          $group: {
            _id: null,
            avgDuration: { $avg: '$duration' },
          },
        },
      ]);

      return result[0]?.avgDuration || 0;
    } catch (error) {
      return 0;
    }
  }

  async getSystemHealthMetrics() {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const [recentQueries, recentFailures, avgResponseTime, activeUsers] = await Promise.all([
        Query.countDocuments({ createdAt: { $gte: oneHourAgo } }),
        Query.countDocuments({
          createdAt: { $gte: oneHourAgo },
          status: 'failed',
        }),
        this.calculateAverageProcessingTime({ createdAt: { $gte: oneDayAgo } }),
        User.countDocuments({ lastLoginAt: { $gte: oneDayAgo } }),
      ]);

      const errorRate = recentQueries > 0 ? (recentFailures / recentQueries) * 100 : 0;

      return {
        status: errorRate < 5 ? 'healthy' : errorRate < 15 ? 'warning' : 'critical',
        errorRate: Number(errorRate.toFixed(2)),
        avgResponseTime: Number(avgResponseTime.toFixed(2)),
        recentActivity: recentQueries,
        activeUsers,
      };
    } catch (error) {
      return {
        status: 'unknown',
        errorRate: 0,
        avgResponseTime: 0,
        recentActivity: 0,
        activeUsers: 0,
      };
    }
  }

  async getSystemTrends(dateFilter = {}) {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const trends = await Query.aggregate([
        {
          $match: {
            createdAt: { $gte: sevenDaysAgo },
            ...dateFilter,
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            queries: { $sum: 1 },
            users: { $addToSet: '$userId' },
          },
        },
        {
          $project: {
            date: '$_id',
            queries: 1,
            uniqueUsers: { $size: '$users' },
            _id: 0,
          },
        },
        { $sort: { date: 1 } },
      ]);

      return trends;
    } catch (error) {
      return [];
    }
  }

  async getUserEngagementMetrics(dateFilter = {}) {
    try {
      const engagement = await User.aggregate([
        {
          $lookup: {
            from: 'queries',
            localField: 'userId',
            foreignField: 'userId',
            as: 'queries',
            pipeline: [...(Object.keys(dateFilter).length > 0 ? [{ $match: dateFilter }] : [])],
          },
        },
        {
          $project: {
            userId: 1,
            queryCount: { $size: '$queries' },
            lastActivity: '$lastLoginAt',
          },
        },
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            activeUsers: {
              $sum: { $cond: [{ $gt: ['$queryCount', 0] }, 1, 0] },
            },
            avgQueriesPerUser: { $avg: '$queryCount' },
            powerUsers: {
              $sum: { $cond: [{ $gt: ['$queryCount', 10] }, 1, 0] },
            },
          },
        },
      ]);

      const metrics = engagement[0] || {
        totalUsers: 0,
        activeUsers: 0,
        avgQueriesPerUser: 0,
        powerUsers: 0,
      };

      metrics.engagementRate =
        metrics.totalUsers > 0
          ? Number(((metrics.activeUsers / metrics.totalUsers) * 100).toFixed(2))
          : 0;

      return metrics;
    } catch (error) {
      return {
        totalUsers: 0,
        activeUsers: 0,
        avgQueriesPerUser: 0,
        powerUsers: 0,
        engagementRate: 0,
      };
    }
  }

  async getUserRecentActivity(userId, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const activity = await Query.aggregate([
        {
          $match: {
            userId,
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            queries: { $sum: 1 },
            completed: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
            },
          },
        },
        {
          $project: {
            date: '$_id',
            queries: 1,
            completed: 1,
            _id: 0,
          },
        },
        { $sort: { date: 1 } },
      ]);

      return activity;
    } catch (error) {
      return [];
    }
  }

  async getUserCategoryBreakdown(userId, dateFilter = {}) {
    try {
      const categories = await Query.aggregate([
        {
          $match: {
            userId,
            ...dateFilter,
          },
        },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            successRate: {
              $avg: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
            },
          },
        },
        {
          $project: {
            category: { $ifNull: ['$_id', 'uncategorized'] },
            count: 1,
            successRate: { $round: [{ $multiply: ['$successRate', 100] }, 1] },
            _id: 0,
          },
        },
        { $sort: { count: -1 } },
      ]);

      return categories;
    } catch (error) {
      return [];
    }
  }

  async getUserPerformanceMetrics(userId, dateFilter = {}) {
    try {
      // Get user's query IDs for the period
      const userQueries = await Query.find({
        userId,
        ...dateFilter,
      }).select('_id');

      const queryIds = userQueries.map((q) => q._id);

      if (queryIds.length === 0) {
        return this.getDefaultPerformanceMetrics();
      }

      const performance = await Result.aggregate([
        { $match: { queryId: { $in: queryIds } } },
        {
          $group: {
            _id: null,
            avgDuration: { $avg: '$performance.totalDuration' },
            avgSources: { $avg: '$performance.sourcesProcessed' },
            avgQuality: { $avg: '$qualityMetrics.overallScore' },
          },
        },
      ]);

      const metrics = performance[0] || this.getDefaultPerformanceMetrics();

      return {
        avgDuration: Number((metrics.avgDuration || 0).toFixed(2)),
        avgSources: Number((metrics.avgSources || 0).toFixed(0)),
        avgQuality: Number((metrics.avgQuality || 0).toFixed(2)),
      };
    } catch (error) {
      return this.getDefaultPerformanceMetrics();
    }
  }

  async generateUserInsights(userId, stats) {
    const insights = [];

    try {
      // Performance insights
      if (stats.avgProcessingTime > 0) {
        if (stats.avgProcessingTime < 30) {
          insights.push({
            type: 'positive',
            category: 'performance',
            message: 'Your queries are processed efficiently with fast response times.',
          });
        } else if (stats.avgProcessingTime > 120) {
          insights.push({
            type: 'suggestion',
            category: 'performance',
            message: 'Consider refining your queries for faster results.',
          });
        }
      }

      // Usage insights
      if (stats.totalQueries > 50) {
        insights.push({
          type: 'positive',
          category: 'usage',
          message: "You're a power user! Consider upgrading for enhanced features.",
        });
      } else if (stats.totalQueries < 5) {
        insights.push({
          type: 'suggestion',
          category: 'usage',
          message: 'Explore more analysis features to get better insights.',
        });
      }

      // Success rate insights
      if (stats.successRate > 95) {
        insights.push({
          type: 'positive',
          category: 'quality',
          message: 'Excellent success rate! Your queries are well-formed.',
        });
      } else if (stats.successRate < 80) {
        insights.push({
          type: 'warning',
          category: 'quality',
          message: 'Some queries are failing. Try more specific search terms.',
        });
      }

      return insights;
    } catch (error) {
      return [];
    }
  }

  getGroupByExpression(granularity) {
    switch (granularity) {
      case 'hour':
        return {
          $dateToString: { format: '%Y-%m-%d %H:00', date: '$createdAt' },
        };
      case 'day':
        return {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
        };
      case 'week':
        return {
          $dateToString: { format: '%Y-W%U', date: '$createdAt' },
        };
      case 'month':
        return {
          $dateToString: { format: '%Y-%m', date: '$createdAt' },
        };
      default:
        return {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
        };
    }
  }

  getDefaultPerformanceMetrics() {
    return {
      totalResults: 0,
      avgTotalDuration: 0,
      avgSearchDuration: 0,
      avgAnalysisDuration: 0,
      avgSynthesisDuration: 0,
      avgSourcesProcessed: 0,
      totalApiCalls: 0,
      avgQualityScore: 0,
      maxDuration: 0,
      minDuration: 0,
      efficiency: 0,
      apiEfficiency: 0,
    };
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
}

module.exports = AnalyticsService;

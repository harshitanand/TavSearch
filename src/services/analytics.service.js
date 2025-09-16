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

  // Add this method to your existing AnalyticsService class

  /**
   * Get comprehensive dashboard metrics - integrates with existing architecture
   */
  async getDashboardMetrics(options = {}) {
    try {
      const {
        timeframe = '24h',
        userId = null,
        includeCharts = true,
        includeComparisons = true,
      } = options;

      this.logger.info('Getting dashboard metrics', {
        timeframe,
        userId,
        includeCharts,
        includeComparisons,
      });

      // Build date filter using existing helper
      const dateFilter = this.buildTimeframeFilter(timeframe);
      const previousDateFilter = this.buildPreviousTimeframeFilter(timeframe);

      // Build base query
      const baseQuery = {
        ...dateFilter,
        ...(userId && { userId: String(userId) }),
      };

      const previousQuery = {
        ...previousDateFilter,
        ...(userId && { userId: String(userId) }),
      };

      // Use existing methods where possible, add new parallel queries
      const [
        totalAnalyses,
        completedAnalyses,
        failedAnalyses,
        processingAnalyses,
        queuedAnalyses,
        cancelledAnalyses,
        avgProcessingTime,
        systemHealth,
        previousTotalAnalyses,
        uniqueUsers,
        topQueries,
        performanceMetrics,
        recentTrends,
      ] = await Promise.all([
        // Core counts
        Query.countDocuments(baseQuery),
        Query.countDocuments({ ...baseQuery, status: 'completed' }),
        Query.countDocuments({ ...baseQuery, status: 'failed' }),
        Query.countDocuments({ ...baseQuery, status: 'processing' }),
        Query.countDocuments({ ...baseQuery, status: 'queued' }),
        Query.countDocuments({ ...baseQuery, status: 'cancelled' }),

        // Use existing method
        this.calculateAverageProcessingTime(baseQuery),

        // Use existing method
        this.getSystemHealthMetrics(),

        // Previous period for comparison
        includeComparisons ? Query.countDocuments(previousQuery) : Promise.resolve(0),

        // Unique users (skip if user-specific request)
        userId ? Promise.resolve(1) : this.getUniqueUsersInPeriod(baseQuery),

        // Use existing method
        this.getTopQueries(baseQuery, 5),

        // Use existing method
        this.getPerformanceMetrics(baseQuery),

        // Get trends for charts
        includeCharts ? this.getDashboardTrends(baseQuery, timeframe) : Promise.resolve([]),
      ]);

      // Calculate derived metrics
      const successRate =
        totalAnalyses > 0 ? Math.round((completedAnalyses / totalAnalyses) * 100) : 0;

      const growthPercentage =
        includeComparisons && previousTotalAnalyses > 0
          ? Math.round(((totalAnalyses - previousTotalAnalyses) / previousTotalAnalyses) * 100)
          : 0;

      // Build comprehensive response
      const metrics = {
        // Core metrics
        totalAnalyses,
        completedAnalyses,
        processingAnalyses,
        failedAnalyses,
        queuedAnalyses,
        cancelledAnalyses,
        activeUsers: uniqueUsers,
        successRate: `${successRate}%`,
        avgProcessingTime: this.formatDuration(avgProcessingTime),

        // Growth comparison
        ...(includeComparisons && {
          growthPercentage,
          growthDirection: growthPercentage > 0 ? 'up' : growthPercentage < 0 ? 'down' : 'stable',
          previousPeriodTotal: previousTotalAnalyses,
        }),

        // Status breakdown
        statusBreakdown: {
          completed: completedAnalyses,
          processing: processingAnalyses,
          failed: failedAnalyses,
          queued: queuedAnalyses,
          cancelled: cancelledAnalyses,
        },

        // System health from existing method
        systemHealth,

        // Performance metrics from existing method
        performance: {
          avgTotalDuration: performanceMetrics.avgTotalDuration,
          avgSourcesProcessed: performanceMetrics.avgSourcesProcessed,
          avgQualityScore: performanceMetrics.avgQualityScore,
          efficiency: performanceMetrics.efficiency,
          apiEfficiency: performanceMetrics.apiEfficiency,
        },

        // Top queries from existing method
        topQueries,

        // Charts data (if requested)
        ...(includeCharts && {
          trends: recentTrends,
          statusChart: this.buildStatusChartData({
            completed: completedAnalyses,
            processing: processingAnalyses,
            failed: failedAnalyses,
            queued: queuedAnalyses,
            cancelled: cancelledAnalyses,
          }),
          activityChart: await this.getActivityChartData(baseQuery, timeframe),
        }),

        // Metadata
        timeframe,
        period: {
          start: dateFilter.createdAt?.$gte,
          end: dateFilter.createdAt?.$lte || new Date(),
        },
        generatedAt: new Date().toISOString(),
      };

      this.logger.info('Dashboard metrics generated successfully', {
        totalAnalyses,
        successRate: `${successRate}%`,
        timeframe,
        userId: userId || 'system-wide',
      });

      return metrics;
    } catch (error) {
      this.logger.error('Failed to get dashboard metrics', {
        error: error.message,
        stack: error.stack,
        options,
      });
      throw new ApiError('Failed to retrieve dashboard metrics', 500);
    }
  }

  /**
   * Helper method to build timeframe filter
   */
  buildTimeframeFilter(timeframe) {
    const endDate = new Date();
    let startDate;

    switch (timeframe) {
      case '1h':
        startDate = new Date(endDate.getTime() - 60 * 60 * 1000);
        break;
      case '6h':
        startDate = new Date(endDate.getTime() - 6 * 60 * 60 * 1000);
        break;
      case '24h':
      default:
        startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    return {
      createdAt: { $gte: startDate, $lte: endDate },
    };
  }

  /**
   * Helper method to build previous period filter for comparison
   */
  buildPreviousTimeframeFilter(timeframe) {
    const currentFilter = this.buildTimeframeFilter(timeframe);
    const duration =
      currentFilter.createdAt.$lte.getTime() - currentFilter.createdAt.$gte.getTime();

    const previousEnd = new Date(currentFilter.createdAt.$gte);
    const previousStart = new Date(previousEnd.getTime() - duration);

    return {
      createdAt: { $gte: previousStart, $lte: previousEnd },
    };
  }

  /**
   * Get unique users in period
   */
  async getUniqueUsersInPeriod(filter) {
    try {
      const users = await Query.distinct('userId', filter);
      return users.length;
    } catch (error) {
      this.logger.error('Failed to get unique users', { error: error.message });
      return 0;
    }
  }

  /**
   * Get dashboard trends for charts
   */
  async getDashboardTrends(baseQuery, timeframe) {
    try {
      let groupBy;

      switch (timeframe) {
        case '1h':
        case '6h':
          groupBy = { $dateToString: { format: '%Y-%m-%d %H:00', date: '$createdAt' } };
          break;
        case '24h':
          groupBy = { $dateToString: { format: '%Y-%m-%d %H:00', date: '$createdAt' } };
          break;
        case '7d':
          groupBy = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
          break;
        case '30d':
        default:
          groupBy = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
          break;
      }

      const trends = await Query.aggregate([
        { $match: baseQuery },
        {
          $group: {
            _id: groupBy,
            total: { $sum: 1 },
            completed: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
            },
            failed: {
              $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      return trends.map((item) => ({
        period: item._id,
        total: item.total,
        completed: item.completed,
        failed: item.failed,
        successRate: item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0,
      }));
    } catch (error) {
      this.logger.error('Failed to get dashboard trends', { error: error.message });
      return [];
    }
  }

  /**
   * Build status chart data for frontend
   */
  buildStatusChartData(statusCounts) {
    return {
      type: 'pie',
      title: 'Analysis Status Distribution',
      data: {
        labels: Object.keys(statusCounts),
        values: Object.values(statusCounts),
        colors: {
          completed: '#10B981',
          processing: '#3B82F6',
          failed: '#EF4444',
          queued: '#F59E0B',
          cancelled: '#6B7280',
        },
      },
    };
  }

  /**
   * Get activity chart data
   */
  async getActivityChartData(baseQuery, timeframe) {
    try {
      // Reuse existing trend logic but format for charts
      const trends = await this.getDashboardTrends(baseQuery, timeframe);

      return {
        type: 'line',
        title: `Analysis Activity - ${timeframe}`,
        data: {
          labels: trends.map((t) => t.period),
          datasets: [
            {
              label: 'Total Analyses',
              data: trends.map((t) => t.total),
              color: '#3B82F6',
            },
            {
              label: 'Completed',
              data: trends.map((t) => t.completed),
              color: '#10B981',
            },
            {
              label: 'Failed',
              data: trends.map((t) => t.failed),
              color: '#EF4444',
            },
          ],
        },
      };
    } catch (error) {
      this.logger.error('Failed to get activity chart data', { error: error.message });
      return null;
    }
  }

  /**
   * Format duration for display (reuse existing logic)
   */
  formatDuration(seconds) {
    if (!seconds || seconds < 0) return '0s';

    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.round(seconds % 60);
      return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.round((seconds % 3600) / 60);
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
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

  /**
   * Get comprehensive usage statistics - integrates with existing architecture
   */
  async getUsageStats(options = {}) {
    try {
      const { period = '30d', userId = null, breakdown = false, includeDetails = false } = options;

      this.logger.info('Getting usage statistics', {
        period,
        userId,
        breakdown,
        includeDetails,
      });

      // Build date filter using existing pattern
      const dateFilter = this.buildPeriodFilter(period);

      // Build base query
      const baseQuery = {
        ...dateFilter,
        ...(userId && { userId: String(userId) }),
      };

      // Parallel execution for all usage metrics
      const [
        totalQueries,
        completedQueries,
        failedQueries,
        processingQueries,
        totalUsers,
        apiCallsData,
        dataProcessedInfo,
        exportStats,
        categoryBreakdown,
        timeBreakdown,
        performanceData,
        quotaUsage,
      ] = await Promise.all([
        // Basic query counts
        Query.countDocuments(baseQuery),
        Query.countDocuments({ ...baseQuery, status: 'completed' }),
        Query.countDocuments({ ...baseQuery, status: 'failed' }),
        Query.countDocuments({ ...baseQuery, status: 'processing' }),

        // User metrics (skip if user-specific)
        userId
          ? Promise.resolve(1)
          : Query.distinct('userId', baseQuery).then((users) => users.length),

        // API usage from Results collection
        this.getApiCallsUsage(baseQuery),

        // Data processing metrics
        this.getDataProcessedMetrics(baseQuery),

        // Export usage
        this.getExportUsageStats(baseQuery),

        // Category breakdown (if requested)
        breakdown ? this.getCategoryUsageBreakdown(baseQuery) : Promise.resolve([]),

        // Time-based breakdown (if requested)
        breakdown ? this.getTimeUsageBreakdown(baseQuery, period) : Promise.resolve([]),

        // Performance metrics
        includeDetails ? this.getUsagePerformanceMetrics(baseQuery) : Promise.resolve({}),

        // Quota usage (if user-specific)
        userId ? this.getUserQuotaUsage(userId, period) : Promise.resolve({}),
      ]);

      // Calculate derived metrics
      const successRate =
        totalQueries > 0 ? Math.round((completedQueries / totalQueries) * 100) : 0;

      const avgQueriesPerUser =
        totalUsers > 0 ? Math.round((totalQueries / totalUsers) * 10) / 10 : 0;

      // Build comprehensive response
      const usageStats = {
        // Overview metrics
        overview: {
          period,
          totalQueries,
          completedQueries,
          failedQueries,
          processingQueries,
          successRate: `${successRate}%`,
          totalUsers,
          avgQueriesPerUser,
          generatedAt: new Date().toISOString(),
        },

        // API usage metrics
        apiUsage: {
          totalApiCalls: apiCallsData.totalCalls,
          avgCallsPerQuery: apiCallsData.avgCallsPerQuery,
          apiEfficiency: apiCallsData.efficiency,
          mostUsedEndpoints: apiCallsData.topEndpoints,
        },

        // Data processing metrics
        dataProcessing: {
          totalDataProcessed: dataProcessedInfo.totalMB,
          avgDataPerQuery: dataProcessedInfo.avgMBPerQuery,
          totalSourcesProcessed: dataProcessedInfo.totalSources,
          avgSourcesPerQuery: dataProcessedInfo.avgSourcesPerQuery,
        },

        // Export statistics
        exports: {
          totalExports: exportStats.total,
          exportsByFormat: exportStats.byFormat,
          mostPopularFormat: exportStats.mostPopular,
          exportRate: totalQueries > 0 ? Math.round((exportStats.total / totalQueries) * 100) : 0,
        },

        // Usage quotas (if user-specific)
        ...(userId &&
          Object.keys(quotaUsage).length > 0 && {
            quotas: quotaUsage,
          }),

        // Detailed breakdowns (if requested)
        ...(breakdown && {
          categoryBreakdown,
          timeBreakdown,
          usage: {
            peakHours: this.calculatePeakUsageHours(timeBreakdown),
            busiestDay: this.calculateBusiestDay(timeBreakdown),
            usagePattern: this.analyzeUsagePattern(timeBreakdown),
          },
        }),

        // Performance details (if requested)
        ...(includeDetails &&
          Object.keys(performanceData).length > 0 && {
            performance: performanceData,
          }),

        // Metadata
        metadata: {
          period,
          userId: userId || 'system-wide',
          includeDetails,
          breakdown,
          dateRange: {
            start: dateFilter.createdAt?.$gte,
            end: dateFilter.createdAt?.$lte || new Date(),
          },
        },
      };

      this.logger.info('Usage statistics generated successfully', {
        period,
        totalQueries,
        totalUsers,
        userId: userId || 'system-wide',
      });

      return usageStats;
    } catch (error) {
      this.logger.error('Failed to get usage statistics', {
        error: error.message,
        stack: error.stack,
        options,
      });
      throw new ApiError('Failed to retrieve usage statistics', 500);
    }
  }

  /**
   * Build period filter helper
   */
  buildPeriodFilter(period) {
    const endDate = new Date();
    let startDate;

    // Parse period (e.g., '7d', '30d', '90d', '1y')
    const periodValue = parseInt(period.replace(/[^\d]/g, ''));
    const periodUnit = period.replace(/\d/g, '');

    switch (periodUnit) {
      case 'h':
        startDate = new Date(endDate.getTime() - periodValue * 60 * 60 * 1000);
        break;
      case 'd':
      default:
        startDate = new Date(endDate.getTime() - periodValue * 24 * 60 * 60 * 1000);
        break;
      case 'w':
        startDate = new Date(endDate.getTime() - periodValue * 7 * 24 * 60 * 60 * 1000);
        break;
      case 'm':
        startDate = new Date(endDate.getTime() - periodValue * 30 * 24 * 60 * 60 * 1000);
        break;
      case 'y':
        startDate = new Date(endDate.getTime() - periodValue * 365 * 24 * 60 * 60 * 1000);
        break;
    }

    return {
      createdAt: { $gte: startDate, $lte: endDate },
    };
  }

  /**
   * Get API calls usage from Results collection
   */
  async getApiCallsUsage(baseQuery) {
    try {
      // Get query IDs from the base query
      const queries = await Query.find(baseQuery).select('_id').lean();
      const queryIds = queries.map((q) => q._id);

      if (queryIds.length === 0) {
        return {
          totalCalls: 0,
          avgCallsPerQuery: 0,
          efficiency: 0,
          topEndpoints: [],
        };
      }

      const apiStats = await Result.aggregate([
        { $match: { queryId: { $in: queryIds } } },
        {
          $group: {
            _id: null,
            totalCalls: { $sum: '$performance.apiCallsCount' },
            totalQueries: { $sum: 1 },
            avgCallsPerQuery: { $avg: '$performance.apiCallsCount' },
          },
        },
      ]);

      const stats = apiStats[0] || { totalCalls: 0, totalQueries: 0, avgCallsPerQuery: 0 };

      return {
        totalCalls: stats.totalCalls || 0,
        avgCallsPerQuery: Math.round((stats.avgCallsPerQuery || 0) * 10) / 10,
        efficiency:
          stats.totalCalls > 0 ? Math.round((stats.totalQueries / stats.totalCalls) * 100) : 0,
        topEndpoints: ['Tavily Search API', 'OpenAI GPT-4 API', 'Export API'], // Static for now
      };
    } catch (error) {
      this.logger.error('Failed to get API calls usage', { error: error.message });
      return { totalCalls: 0, avgCallsPerQuery: 0, efficiency: 0, topEndpoints: [] };
    }
  }

  /**
   * Get data processed metrics
   */
  async getDataProcessedMetrics(baseQuery) {
    try {
      // Get query IDs from the base query
      const queries = await Query.find(baseQuery).select('_id').lean();
      const queryIds = queries.map((q) => q._id);

      if (queryIds.length === 0) {
        return {
          totalMB: '0 MB',
          avgMBPerQuery: '0 MB',
          totalSources: 0,
          avgSourcesPerQuery: 0,
        };
      }

      const dataStats = await Result.aggregate([
        { $match: { queryId: { $in: queryIds } } },
        {
          $group: {
            _id: null,
            totalSources: { $sum: '$performance.sourcesProcessed' },
            totalQueries: { $sum: 1 },
            avgSources: { $avg: '$performance.sourcesProcessed' },
          },
        },
      ]);

      const stats = dataStats[0] || { totalSources: 0, totalQueries: 0, avgSources: 0 };

      // Estimate data size (approximate 50KB per source)
      const estimatedTotalMB = Math.round((stats.totalSources * 50) / 1024);
      const estimatedAvgMB = Math.round((((stats.avgSources || 0) * 50) / 1024) * 10) / 10;

      return {
        totalMB: `${estimatedTotalMB} MB`,
        avgMBPerQuery: `${estimatedAvgMB} MB`,
        totalSources: stats.totalSources || 0,
        avgSourcesPerQuery: Math.round((stats.avgSources || 0) * 10) / 10,
      };
    } catch (error) {
      this.logger.error('Failed to get data processed metrics', { error: error.message });
      return { totalMB: '0 MB', avgMBPerQuery: '0 MB', totalSources: 0, avgSourcesPerQuery: 0 };
    }
  }

  /**
   * Get export usage statistics
   */
  async getExportUsageStats(baseQuery) {
    try {
      // This would typically come from an Exports collection
      // For now, estimate based on completed queries (assume 30% export rate)
      const completedQueries = await Query.countDocuments({ ...baseQuery, status: 'completed' });
      const estimatedExports = Math.round(completedQueries * 0.3);

      return {
        total: estimatedExports,
        byFormat: {
          pdf: Math.round(estimatedExports * 0.4),
          html: Math.round(estimatedExports * 0.25),
          json: Math.round(estimatedExports * 0.2),
          csv: Math.round(estimatedExports * 0.1),
          docx: Math.round(estimatedExports * 0.05),
        },
        mostPopular: 'pdf',
      };
    } catch (error) {
      this.logger.error('Failed to get export usage stats', { error: error.message });
      return { total: 0, byFormat: {}, mostPopular: 'pdf' };
    }
  }

  /**
   * Get category usage breakdown
   */
  async getCategoryUsageBreakdown(baseQuery) {
    try {
      const categories = await Query.aggregate([
        { $match: baseQuery },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            successRate: {
              $avg: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
            },
          },
        },
        { $sort: { count: -1 } },
        {
          $project: {
            category: { $ifNull: ['$_id', 'uncategorized'] },
            count: 1,
            percentage: 1, // Will calculate after getting total
            successRate: { $round: [{ $multiply: ['$successRate', 100] }, 1] },
            _id: 0,
          },
        },
      ]);

      const totalQueries = categories.reduce((sum, cat) => sum + cat.count, 0);

      return categories.map((cat) => ({
        ...cat,
        percentage: totalQueries > 0 ? Math.round((cat.count / totalQueries) * 100) : 0,
      }));
    } catch (error) {
      this.logger.error('Failed to get category usage breakdown', { error: error.message });
      return [];
    }
  }

  /**
   * Get time-based usage breakdown
   */
  async getTimeUsageBreakdown(baseQuery, period) {
    try {
      let groupBy;

      // Determine grouping based on period
      if (period.includes('h') || period === '1d') {
        groupBy = { $dateToString: { format: '%Y-%m-%d %H:00', date: '$createdAt' } };
      } else if (period.includes('d') && parseInt(period) <= 7) {
        groupBy = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
      } else if (period.includes('d') && parseInt(period) <= 30) {
        groupBy = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
      } else {
        groupBy = { $dateToString: { format: '%Y-W%U', date: '$createdAt' } };
      }

      const timeBreakdown = await Query.aggregate([
        { $match: baseQuery },
        {
          $group: {
            _id: groupBy,
            count: { $sum: 1 },
            completed: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
            },
            failed: {
              $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      return timeBreakdown.map((item) => ({
        period: item._id,
        queries: item.count,
        completed: item.completed,
        failed: item.failed,
        successRate: item.count > 0 ? Math.round((item.completed / item.count) * 100) : 0,
      }));
    } catch (error) {
      this.logger.error('Failed to get time usage breakdown', { error: error.message });
      return [];
    }
  }

  /**
   * Get usage performance metrics
   */
  async getUsagePerformanceMetrics(baseQuery) {
    try {
      const queries = await Query.find(baseQuery).select('_id').lean();
      const queryIds = queries.map((q) => q._id);

      if (queryIds.length === 0) return {};

      const performance = await Result.aggregate([
        { $match: { queryId: { $in: queryIds } } },
        {
          $group: {
            _id: null,
            avgTotalDuration: { $avg: '$performance.totalDuration' },
            avgQualityScore: { $avg: '$qualityMetrics.overallScore' },
            totalProcessingTime: { $sum: '$performance.totalDuration' },
          },
        },
      ]);

      const metrics = performance[0] || {};

      return {
        avgProcessingTime: Math.round((metrics.avgTotalDuration || 0) * 10) / 10,
        avgQualityScore: Math.round((metrics.avgQualityScore || 0) * 10) / 10,
        totalProcessingTime: Math.round((metrics.totalProcessingTime || 0) / 60), // Convert to minutes
      };
    } catch (error) {
      this.logger.error('Failed to get usage performance metrics', { error: error.message });
      return {};
    }
  }

  /**
   * Get user quota usage (if applicable)
   */
  async getUserQuotaUsage(userId, period) {
    try {
      const dateFilter = this.buildPeriodFilter(period);
      const userQueries = await Query.countDocuments({
        userId: String(userId),
        ...dateFilter,
      });

      // Example quota limits (these would come from user subscription)
      const quotaLimits = {
        monthly: 100, // queries per month
        daily: 10, // queries per day
        exports: 50, // exports per month
      };

      return {
        queriesUsed: userQueries,
        queriesLimit: quotaLimits.monthly,
        queriesRemaining: Math.max(0, quotaLimits.monthly - userQueries),
        usagePercentage: Math.round((userQueries / quotaLimits.monthly) * 100),
        resetDate: this.getNextResetDate(period),
      };
    } catch (error) {
      this.logger.error('Failed to get user quota usage', { userId, error: error.message });
      return {};
    }
  }

  /**
   * Helper methods for usage analysis
   */
  calculatePeakUsageHours(timeBreakdown) {
    if (!timeBreakdown.length) return [];

    const hourlyData = {};
    timeBreakdown.forEach((item) => {
      const hour = item.period.includes(':') ? item.period.split(' ')[1].split(':')[0] : '12';
      hourlyData[hour] = (hourlyData[hour] || 0) + item.queries;
    });

    return Object.entries(hourlyData)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour, count]) => ({ hour: `${hour}:00`, queries: count }));
  }

  calculateBusiestDay(timeBreakdown) {
    if (!timeBreakdown.length) return null;

    return timeBreakdown.reduce((max, current) => (current.queries > max.queries ? current : max));
  }

  analyzeUsagePattern(timeBreakdown) {
    if (!timeBreakdown.length) return 'insufficient_data';

    const total = timeBreakdown.reduce((sum, item) => sum + item.queries, 0);
    const avg = total / timeBreakdown.length;
    const variance =
      timeBreakdown.reduce((sum, item) => sum + Math.pow(item.queries - avg, 2), 0) /
      timeBreakdown.length;

    if (variance < avg * 0.1) return 'consistent';
    if (variance > avg * 0.5) return 'highly_variable';
    return 'moderate_variation';
  }

  getNextResetDate(period) {
    const now = new Date();
    if (period.includes('m')) {
      return new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }
    return new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
  }
}

module.exports = AnalyticsService;

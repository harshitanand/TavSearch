let AnalyticsService = require('../services/analytics.service');
const { catchAsync } = require('../middleware/error.middleware');
const { AuthorizationError } = require('../utils/errors');
const logger = require('../utils/logger');
const config = require('../config');

AnalyticsService = new AnalyticsService(config);

class AnalyticsController {
  /**
   * Get system-wide analytics (admin only)
   */
  static getSystemAnalytics = catchAsync(async (req, res) => {
    const { timeframe = '30d', metrics } = req.query;

    const analytics = await AnalyticsService.getSystemAnalytics({
      timeframe,
      metrics: metrics ? metrics.split(',') : undefined,
    });

    logger.info('System analytics retrieved', {
      adminUserId: req.user.userId,
      timeframe,
      metricsCount: Object.keys(analytics).length,
    });

    res.json({
      success: true,
      message: 'System analytics retrieved successfully',
      data: analytics,
      timeframe,
    });
  });

  /**
   * Get user-specific analytics
   */
  static getUserAnalytics = catchAsync(async (req, res) => {
    const userId = req.user.userId;
    const { timeframe = '30d', breakdown } = req.query;

    const analytics = await AnalyticsService.getUserAnalytics(userId, {
      timeframe,
      breakdown: breakdown ? breakdown.split(',') : undefined,
    });

    res.json({
      success: true,
      message: 'User analytics retrieved successfully',
      data: analytics,
      timeframe,
    });
  });

  /**
   * Get query trends and patterns
   */
  static getQueryTrends = catchAsync(async (req, res) => {
    const { timeframe = '30d', userId, granularity = 'daily' } = req.query;

    // If userId is provided and user is not admin, only allow their own data
    const targetUserId = req.user.role === 'admin' ? userId : req.user.userId;

    const trends = await AnalyticsService.getQueryTrends({
      userId: targetUserId,
      timeframe,
      granularity,
    });

    res.json({
      success: true,
      message: 'Query trends retrieved successfully',
      data: trends,
      timeframe,
      granularity,
    });
  });

  /**
   * Get performance metrics (admin only)
   */
  static getPerformanceMetrics = catchAsync(async (req, res) => {
    const { timeframe = '24h', services } = req.query;

    const metrics = await AnalyticsService.getPerformanceMetrics({
      timeframe,
      services: services ? services.split(',') : undefined,
    });

    logger.info('Performance metrics retrieved', {
      adminUserId: req.user.userId,
      timeframe,
      servicesCount: Object.keys(metrics).length,
    });

    res.json({
      success: true,
      message: 'Performance metrics retrieved successfully',
      data: metrics,
      timeframe,
    });
  });

  /**
   * Get usage statistics for billing/monitoring
   */
  static getUsageStats = catchAsync(async (req, res) => {
    const { timeframe = '30d', breakdown = 'daily' } = req.query;
    const userId = req.user.role === 'admin' ? req.query.userId : req.user.userId;

    const usage = await AnalyticsService.getUsageStats({
      userId,
      timeframe,
      breakdown,
    });

    res.json({
      success: true,
      message: 'Usage statistics retrieved successfully',
      data: usage,
      timeframe,
      breakdown,
    });
  });

  /**
   * Get real-time dashboard metrics
   */
  static getDashboardMetrics = catchAsync(async (req, res) => {
    const userId = req.user.userId;
    const isAdmin = req.user.role === 'admin';

    const metrics = await AnalyticsService.getDashboardMetrics({
      userId: isAdmin ? undefined : userId,
      includeSystemMetrics: isAdmin,
    });

    res.json({
      success: true,
      message: 'Dashboard metrics retrieved successfully',
      data: metrics,
    });
  });
}

module.exports = AnalyticsController;

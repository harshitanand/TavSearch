const express = require('express');
const AnalyticsController = require('../controllers/analytics.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validateQueryParams } = require('../middleware/validation');

const router = express.Router();

// User analytics
router.get('/user', authenticate, validateQueryParams, AnalyticsController.getUserAnalytics);
router.get('/trends', authenticate, validateQueryParams, AnalyticsController.getQueryTrends);
router.get('/usage', authenticate, validateQueryParams, AnalyticsController.getUsageStats);
router.get('/dashboard', authenticate, AnalyticsController.getDashboardMetrics);

// Admin analytics
router.get('/system', authenticate, authorize(['admin']), AnalyticsController.getSystemAnalytics);
router.get(
  '/performance',
  authenticate,
  authorize(['admin']),
  AnalyticsController.getPerformanceMetrics
);

module.exports = router;

const express = require('express');
const analyticsController = require('../controllers/analytics.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validateQueryParams } = require('../middleware/validation');

const router = express.Router();

// System analytics (admin only)
router.get('/system', authenticate, authorize(['admin']), analyticsController.getSystemAnalytics);

// User analytics
router.get('/user', authenticate, validateQueryParams, analyticsController.getUserAnalytics);

// Query trends
router.get('/trends', authenticate, validateQueryParams, analyticsController.getQueryTrends);

// Performance metrics
router.get(
  '/performance',
  authenticate,
  authorize(['admin']),
  analyticsController.getPerformanceMetrics
);

module.exports = router;

const express = require('express');
const analysisRoutes = require('./analysis');
const userRoutes = require('./users');
const analyticsRoutes = require('./analytics');
const exportRoutes = require('./export');

const router = express.Router();

// Route definitions
router.use('/analysis', analysisRoutes);
router.use('/users', userRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/export', exportRoutes);

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    name: 'Market Intelligence API',
    version: '1.0.0',
    description: 'Multi-Agent Market Intelligence System',
    endpoints: {
      analysis: '/api/analysis',
      users: '/api/users',
      analytics: '/api/analytics',
      export: '/api/export',
    },
  });
});

module.exports = router;

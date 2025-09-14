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

// Enhanced API info endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'TavSearch Multi-Agent API',
    data: {
      name: 'TavSearch Multi-Agent API',
      version: '2.0.0',
      description: 'LangChain Multi-Agent Market Intelligence System',
      framework: 'LangChain + Node.js + Express',
      features: [
        'Multi-agent workflow orchestration',
        'Real-time web search via Tavily API',
        'AI-powered analysis with OpenAI GPT-4',
        'Professional report generation',
        'Multiple export formats',
        'Advanced analytics and monitoring',
        'User management and authentication',
      ],
      endpoints: {
        analysis: '/api/analysis',
        users: '/api/users',
        analytics: '/api/analytics',
        export: '/api/export',
      },
      agents: [
        'PlannerAgent - Search strategy creation',
        'SearchAgent - Real-time data gathering',
        'AnalysisAgent - AI-powered processing',
        'SynthesisAgent - Report generation',
        'ValidatorAgent - Quality control',
      ],
      status: 'operational',
      timestamp: new Date().toISOString(),
    },
  });
});

module.exports = router;

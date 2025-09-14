const express = require('express');
const AnalysisController = require('../controllers/analysis.controller');
const { authenticate } = require('../middleware/auth');
const { validateAnalysisRequest, validateQueryParams } = require('../middleware/validation');
const { rateLimitAnalysis } = require('../middleware/rateLimit');

const router = express.Router();

// Analysis management routes
router.post(
  '/',
  authenticate,
  validateAnalysisRequest,
  rateLimitAnalysis,
  AnalysisController.startAnalysis
);
router.get('/recent', authenticate, validateQueryParams, AnalysisController.getRecentAnalyses);
router.get('/stats', authenticate, validateQueryParams, AnalysisController.getAnalysisStats);

// System and workflow routes
router.get('/workflow/diagram', authenticate, AnalysisController.getWorkflowDiagram);
router.get('/system/status', authenticate, AnalysisController.getSystemStatus);

// Individual analysis routes
router.get('/:queryId/status', authenticate, AnalysisController.getAnalysisStatus);
router.get('/:queryId/results', authenticate, AnalysisController.getAnalysisResults);
router.delete('/:queryId', authenticate, AnalysisController.cancelAnalysis);
router.post('/:queryId/retry', authenticate, AnalysisController.retryAnalysis);

// User analysis history (placed last to avoid route conflicts)
router.get('/', authenticate, validateQueryParams, AnalysisController.getUserAnalyses);

module.exports = router;

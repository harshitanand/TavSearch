const express = require('express');
const analysisController = require('../controllers/analysis.controller');
const { authenticate } = require('../middleware/auth');
const { validateAnalysisRequest } = require('../middleware/validation');
const { rateLimitAnalysis } = require('../middleware/rateLimit');

const router = express.Router();

// Start new analysis
router.post(
  '/',
  authenticate,
  validateAnalysisRequest,
  rateLimitAnalysis,
  analysisController.startAnalysis
);

// Get analysis status
router.get('/:queryId/status', authenticate, analysisController.getAnalysisStatus);

// Get analysis results
router.get('/:queryId/results', authenticate, analysisController.getAnalysisResults);

// Cancel analysis
router.delete('/:queryId', authenticate, analysisController.cancelAnalysis);

// Retry failed analysis
router.post('/:queryId/retry', authenticate, analysisController.retryAnalysis);

// Get user's analysis history
router.get('/', authenticate, analysisController.getUserAnalyses);

module.exports = router;

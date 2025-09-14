const express = require('express');
const ExportController = require('../controllers/export.controller');
const { authenticate } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validation');
const { rateLimitExport } = require('../middleware/rateLimit');

const router = express.Router();

// Export routes
router.get('/history', authenticate, ExportController.getExportHistory);
router.get('/download/:exportId', authenticate, ExportController.downloadExport);
router.get('/status/:exportId', authenticate, ExportController.getExportStatus);

// Query-specific export routes
router.get(
  '/:queryId/formats',
  authenticate,
  validateObjectId,
  ExportController.getAvailableFormats
);
router.get(
  '/:queryId/:format',
  authenticate,
  validateObjectId,
  rateLimitExport,
  ExportController.exportResults
);

module.exports = router;

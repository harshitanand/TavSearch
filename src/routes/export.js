const express = require('express');
const exportController = require('../controllers/export.controller');
const { authenticate } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validation');
const { rateLimitExport } = require('../middleware/rateLimit');

const router = express.Router();

// Export analysis results in different formats
router.get(
  '/:queryId/:format',
  authenticate,
  validateObjectId,
  rateLimitExport,
  exportController.exportResults
);

// Get available export formats for a query
router.get(
  '/:queryId/formats',
  authenticate,
  validateObjectId,
  exportController.getAvailableFormats
);

// Get export history for user
router.get('/history', authenticate, exportController.getExportHistory);

// Download exported file by export ID
router.get('/download/:exportId', authenticate, exportController.downloadExport);

// Get export status (for large exports that are processed async)
router.get('/status/:exportId', authenticate, exportController.getExportStatus);

module.exports = router;

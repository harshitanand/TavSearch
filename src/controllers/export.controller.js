let ExportService = require('../services/export.service');
const Query = require('../models/Query');
const Result = require('../models/Result');
const { catchAsync } = require('../middleware/error.middleware');
const { AuthorizationError, NotFoundError, ValidationError } = require('../utils/errors');
const { logger } = require('../utils/logger');
const config = require('../config');

ExportService = new ExportService(config);

class ExportController {
  /**
   * Export analysis results in specified format
   */
  static exportResults = catchAsync(async (req, res) => {
    const { queryId, format } = req.params;
    const userId = req.user.userId;

    logger.info('Export request initiated', {
      userId,
      queryId,
      format,
    });

    // Verify ownership and query status
    const query = await Query.findOne({ _id: queryId, userId });
    if (!query) {
      throw new NotFoundError('Analysis not found or access denied');
    }

    if (query.status !== 'completed') {
      throw new ValidationError(
        `Analysis is ${query.status}. Export only available for completed analyses.`
      );
    }

    // Get results with populated query data
    const result = await Result.findOne({ queryId }).populate('query');
    if (!result) {
      throw new NotFoundError('Analysis results not found');
    }

    // Validate export format
    const supportedFormats = ['json', 'pdf', 'csv', 'xlsx', 'html'];
    if (!supportedFormats.includes(format.toLowerCase())) {
      throw new ValidationError(
        `Unsupported format: ${format}. Supported: ${supportedFormats.join(', ')}`
      );
    }

    // Generate export
    const exportData = await ExportService.generateExport(result, format.toLowerCase());

    // Set appropriate headers
    const contentType = ExportController.getContentType(format);
    const filename = `analysis-${queryId}-${Date.now()}.${format.toLowerCase()}`;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Security-Policy', "default-src 'self'");

    // Update export tracking
    await ExportController.trackExport(queryId, format, userId);

    // Send response based on format
    if (format.toLowerCase() === 'json') {
      res.json(exportData);
    } else if (format.toLowerCase() === 'html') {
      res.send(exportData);
    } else {
      // Binary formats (PDF, Excel, etc.)
      res.send(exportData);
    }

    logger.info('Export completed successfully', {
      userId,
      queryId,
      format,
      fileSize: Buffer.isBuffer(exportData) ? exportData.length : JSON.stringify(exportData).length,
    });
  });

  /**
   * Get available export formats for a query
   */
  static getAvailableFormats = catchAsync(async (req, res) => {
    const { queryId } = req.params;
    const userId = req.user.userId;

    // Verify query exists and belongs to user
    const query = await Query.findOne({ _id: queryId, userId });
    if (!query) {
      throw new NotFoundError('Analysis not found');
    }

    const formats = {
      available: [],
      unavailable: [],
      query: {
        id: query._id,
        status: query.status,
        text: query.queryText,
      },
    };

    if (query.status === 'completed') {
      formats.available = [
        { format: 'json', description: 'Raw data in JSON format', size: 'Small' },
        { format: 'html', description: 'Professional HTML report', size: 'Medium' },
        { format: 'pdf', description: 'PDF document for sharing', size: 'Medium' },
        { format: 'csv', description: 'CSV data for spreadsheets', size: 'Small' },
        { format: 'xlsx', description: 'Excel workbook with charts', size: 'Large' },
      ];
    } else {
      formats.unavailable = [
        { reason: `Analysis is ${query.status}`, message: 'Export available after completion' },
      ];
    }

    res.json({
      success: true,
      message: 'Export formats retrieved',
      data: formats,
    });
  });

  /**
   * Get export history for user
   */
  static getExportHistory = catchAsync(async (req, res) => {
    const userId = req.user.userId;
    const queryOptions = {
      ...req.query,
      userId,
      status: 'completed', // Only completed analyses can be exported
    };

    const result = await ExportService.getExportHistory(queryOptions);

    res.json({
      success: true,
      message: 'Export history retrieved successfully',
      data: result.exports,
      pagination: result.pagination,
    });
  });

  /**
   * Download exported file by export ID
   */
  static downloadExport = catchAsync(async (req, res) => {
    const { exportId } = req.params;
    const userId = req.user.userId;

    const exportRecord = await ExportService.getExportById(exportId, userId);

    if (!exportRecord) {
      throw new NotFoundError('Export not found or access denied');
    }

    // Stream or redirect to file download
    res.redirect(exportRecord.downloadUrl);
  });

  /**
   * Get export status for large exports processed async
   */
  static getExportStatus = catchAsync(async (req, res) => {
    const { exportId } = req.params;
    const userId = req.user.userId;

    const status = await ExportService.getExportStatus(exportId, userId);

    res.json({
      success: true,
      message: 'Export status retrieved',
      data: status,
    });
  });

  // Helper methods
  static getContentType(format) {
    const contentTypes = {
      json: 'application/json',
      pdf: 'application/pdf',
      csv: 'text/csv; charset=utf-8',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      html: 'text/html; charset=utf-8',
    };
    return contentTypes[format.toLowerCase()] || 'application/octet-stream';
  }

  static async trackExport(queryId, format, userId) {
    try {
      await Result.findOneAndUpdate(
        { queryId },
        {
          $set: {
            'exportOptions.lastExported': new Date(),
          },
          $inc: {
            'exportOptions.totalExports': 1,
          },
          $addToSet: {
            'exportOptions.formats': format.toLowerCase(),
          },
        },
        { upsert: false }
      );

      logger.info('Export tracked', { queryId, format, userId });
    } catch (error) {
      logger.error('Failed to track export', { error: error.message });
      // Don't throw - export tracking is not critical
    }
  }
}

module.exports = ExportController;

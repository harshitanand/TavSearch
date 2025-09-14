const Query = require('../models/Query');
const Result = require('../models/Result');
const exportService = require('../services/export.service');
const { logger } = require('../utils/logger');
const { ApiResponse } = require('../utils/response');
const { AnalysisError, ValidationError } = require('../utils/errors');

class ExportController {
  async exportResults(req, res, next) {
    try {
      const { queryId, format } = req.params;
      const userId = req.user.userId;

      logger.info(`Export request: ${format} for query ${queryId} by user ${userId}`);

      // Verify ownership and query status
      const query = await Query.findOne({ _id: queryId, userId });
      if (!query) {
        throw new AnalysisError('Analysis not found or access denied', 404);
      }

      if (query.status !== 'completed') {
        throw new AnalysisError(
          `Analysis is ${query.status}. Export only available for completed analyses.`,
          400
        );
      }

      // Get results with populated query data
      const result = await Result.findOne({ queryId }).populate('query');
      if (!result) {
        throw new AnalysisError('Analysis results not found', 404);
      }
      // Validate export format
      const supportedFormats = ['json', 'pdf', 'csv', 'xlsx', 'html'];
      if (!supportedFormats.includes(format.toLowerCase())) {
        throw new ValidationError(
          `Unsupported format: ${format}. Supported: ${supportedFormats.join(', ')}`,
          400
        );
      }

      // Generate export
      const exportData = await exportService.generateExport(result, format.toLowerCase());

      // Set appropriate headers
      const contentType = this.getContentType(format);
      const filename = `analysis-${queryId}-${Date.now()}.${format.toLowerCase()}`;

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Security-Policy', "default-src 'self'");

      // Update export tracking
      await this.trackExport(queryId, format, userId);

      // Send response based on format
      if (format.toLowerCase() === 'json') {
        res.json(exportData);
      } else if (format.toLowerCase() === 'html') {
        res.send(exportData);
      } else {
        // Binary formats (PDF, Excel, etc.)
        res.send(exportData);
      }

      logger.info(`Export completed: ${format} for query ${queryId}`, {
        fileSize: Buffer.isBuffer(exportData)
          ? exportData.length
          : JSON.stringify(exportData).length,
      });
    } catch (error) {
      logger.error('Export failed', {
        error: error.message,
        queryId: req.params.queryId,
        format: req.params.format,
        userId: req.user.userId,
      });
      next(error);
    }
  }

  async getAvailableFormats(req, res, next) {
    try {
      const { queryId } = req.params;
      const userId = req.user.userId;

      // Verify query exists and belongs to user
      const query = await Query.findOne({ _id: queryId, userId });
      if (!query) {
        throw new AnalysisError('Analysis not found', 404);
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

      res.json(new ApiResponse(true, 'Export formats retrieved', formats));
    } catch (error) {
      logger.error('Failed to get export formats', { error: error.message });
      next(error);
    }
  }

  async getExportHistory(req, res, next) {
    try {
      const userId = req.user.userId;
      const { limit = 20, skip = 0, format } = req.query;

      // Build query for user's completed analyses
      const queryFilter = { userId, status: 'completed' };

      const queries = await Query.find(queryFilter)
        .sort({ updatedAt: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(skip))
        .select('queryText createdAt updatedAt status');

      // Get results with export metadata
      const queryIds = queries.map((q) => q._id);
      const results = await Result.find({ queryId: { $in: queryIds } })
        .select('queryId exportOptions createdAt')
        .populate('query', 'queryText createdAt status');

      const exportHistory = results.map((result) => ({
        queryId: result.queryId,
        queryText: result.query?.queryText,
        analysisDate: result.query?.createdAt,
        lastExported: result.exportOptions?.lastExported,
        availableFormats: ['json', 'html', 'pdf', 'csv', 'xlsx'],
        status: result.query?.status || 'completed',
      }));

      // Filter by format if specified
      const filteredHistory = format
        ? exportHistory.filter((h) => h.availableFormats.includes(format.toLowerCase()))
        : exportHistory;

      res.json(
        new ApiResponse(true, 'Export history retrieved', {
          history: filteredHistory,
          pagination: {
            total: await Query.countDocuments(queryFilter),
            limit: parseInt(limit),
            skip: parseInt(skip),
            hasMore:
              parseInt(skip) + filteredHistory.length < (await Query.countDocuments(queryFilter)),
          },
        })
      );
    } catch (error) {
      logger.error('Failed to get export history', { error: error.message });
      next(error);
    }
  }

  async downloadExport(req, res, next) {
    try {
      const { exportId } = req.params;
      const userId = req.user.userId;

      // For this implementation, exportId format: queryId-format-timestamp
      const [queryId, format, timestamp] = exportId.split('-');

      if (!queryId || !format) {
        throw new ValidationError('Invalid export ID format', 400);
      }

      // Redirect to regular export endpoint
      req.params.queryId = queryId;
      req.params.format = format;

      return this.exportResults(req, res, next);
    } catch (error) {
      logger.error('Download export failed', { error: error.message });
      next(error);
    }
  }

  async getExportStatus(req, res, next) {
    try {
      const { exportId } = req.params;
      const userId = req.user.userId;

      // Parse export ID
      const [queryId, format, timestamp] = exportId.split('-');

      if (!queryId) {
        throw new ValidationError('Invalid export ID', 400);
      }

      // Check query status
      const query = await Query.findOne({ _id: queryId, userId });
      if (!query) {
        throw new AnalysisError('Export not found', 404);
      }

      const status = {
        exportId,
        queryId,
        format,
        status: query.status === 'completed' ? 'ready' : 'pending',
        message:
          query.status === 'completed'
            ? 'Export ready for download'
            : 'Waiting for analysis completion',
        createdAt: timestamp ? new Date(parseInt(timestamp)) : query.createdAt,
        downloadUrl: query.status === 'completed' ? `/api/export/${queryId}/${format}` : null,
      };

      res.json(new ApiResponse(true, 'Export status retrieved', status));
    } catch (error) {
      logger.error('Failed to get export status', { error: error.message });
      next(error);
    }
  }

  getContentType(format) {
    const contentTypes = {
      json: 'application/json',
      pdf: 'application/pdf',
      csv: 'text/csv; charset=utf-8',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      html: 'text/html; charset=utf-8',
    };
    return contentTypes[format.toLowerCase()] || 'application/octet-stream';
  }

  async trackExport(queryId, format, userId) {
    try {
      // Update result with export metadata
      await Result.findOneAndUpdate(
        { queryId },
        {
          $set: {
            'exportOptions.lastExported': new Date(),
            'exportOptions.totalExports': { $inc: 1 },
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

module.exports = new ExportController();

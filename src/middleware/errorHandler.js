const { logger } = require('../utils/logger');
const { ApiResponse } = require('../utils/response');

const errorHandler = (error, req, res, next) => {
  logger.error('Error occurred:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  // Default error
  let statusCode = 500;
  let message = 'Internal server error';
  let details = null;

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation error';
    details = error.details;
  } else if (error.name === 'AnalysisError') {
    statusCode = error.statusCode || 400;
    message = error.message;
  } else if (error.name === 'AuthError') {
    statusCode = error.statusCode || 401;
    message = error.message;
  } else if (error.name === 'RateLimitError') {
    statusCode = 429;
    message = error.message;
  } else if (error.name === 'ApiError') {
    statusCode = error.statusCode || 500;
    message = error.message;
  } else if (error.name === 'MongoError' || error.name === 'MongooseError') {
    statusCode = 500;
    message = 'Database error';
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid data format';
  }

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Internal server error';
    details = null;
  }

  res.status(statusCode).json(new ApiResponse(false, message, null, details));
};

module.exports = errorHandler;

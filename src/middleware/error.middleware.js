const { logger } = require('../utils/logger');

/**
 * Wrapper function to catch async errors and pass them to error handler
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Global error handler middleware
 */
const errorHandler = (error, req, res, next) => {
  logger.error('Error occurred:', {
    error: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user?.userId,
  });

  // Default error response
  let statusCode = 500;
  let message = 'Internal server error';
  let details = null;

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation error';
    details = error.details || error.errors;
  } else if (error.name === 'AnalysisError') {
    statusCode = error.statusCode || 400;
    message = error.message;
  } else if (error.name === 'AuthorizationError') {
    statusCode = 403;
    message = error.message || 'Access denied';
  } else if (error.name === 'NotFoundError') {
    statusCode = 404;
    message = error.message || 'Resource not found';
  } else if (error.name === 'RateLimitError') {
    statusCode = 429;
    message = error.message || 'Rate limit exceeded';
  } else if (error.name === 'MongoError' || error.name === 'MongooseError') {
    statusCode = 500;
    message = 'Database error';
    if (error.code === 11000) {
      statusCode = 409;
      message = 'Duplicate resource';
    }
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid data format';
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token expired';
  }

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Internal server error';
    details = null;
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    message,
    timestamp: new Date().toISOString(),
    ...(details && { errors: details }),
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
      path: req.path,
    }),
  });
};

/**
 * 404 handler for undefined routes
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString(),
  });
};

module.exports = {
  catchAsync,
  errorHandler,
  notFoundHandler,
};

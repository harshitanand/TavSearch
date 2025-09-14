class ApiError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends Error {
  constructor(message, statusCode = 400, details = null) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

class AnalysisError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'AnalysisError';
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

class AuthError extends Error {
  constructor(message, statusCode = 401) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

class RateLimitError extends Error {
  constructor(message, statusCode = 429) {
    super(message);
    this.name = 'RateLimitError';
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = {
  ApiError,
  ValidationError,
  AnalysisError,
  AuthError,
  RateLimitError
};

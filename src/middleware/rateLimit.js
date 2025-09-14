const rateLimit = require('express-rate-limit');
const { RateLimitError } = require('../utils/errors');
const { logger } = require('../utils/logger');

const createRateLimiter = (options) => {
  return rateLimit({
    ...options,
    handler: (req, res, next) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        endpoint: req.path
      });
      next(new RateLimitError('Rate limit exceeded', 429));
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      return req.user?.userId || req.ip;
    }
  });
};

const rateLimitAnalysis = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req) => {
    // Different limits based on user subscription
    const subscription = req.user?.subscription?.plan || 'free';
    const limits = {
      free: 5,
      premium: 20,
      enterprise: 100
    };
    return limits[subscription] || limits.free;
  },
  message: {
    error: 'Too many analysis requests',
    retryAfter: '15 minutes'
  },
  skip: (req) => {
    // Skip rate limiting for admin users
    return req.user?.role === 'admin';
  }
});

const rateLimitExport = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: (req) => {
    const subscription = req.user?.subscription?.plan || 'free';
    const limits = {
      free: 10,
      premium: 50,
      enterprise: 200
    };
    return limits[subscription] || limits.free;
  },
  message: {
    error: 'Too many export requests',
    retryAfter: '10 minutes'
  }
});

const rateLimitGeneral = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    error: 'Too many requests',
    retryAfter: '15 minutes'
  }
});

const rateLimitAuth = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Strict limit for auth endpoints
  message: {
    error: 'Too many authentication attempts',
    retryAfter: '15 minutes'
  },
  skipSuccessfulRequests: true
});

module.exports = {
  rateLimitAnalysis,
  rateLimitExport,
  rateLimitGeneral,
  rateLimitAuth
};

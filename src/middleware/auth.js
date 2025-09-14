const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config');
const { logger } = require('../utils/logger');
const { AuthError } = require('../utils/errors');

const authenticate = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      // For demo purposes, create anonymous user
      req.user = {
        userId: req.headers['x-user-id'] || 'anonymous',
        role: 'user',
      };
      return next();
    }

    const decoded = jwt.verify(token, config.apiKeys.jwt);
    const user = await User.findOne({ userId: decoded.userId });

    if (!user) {
      throw new AuthError('User not found', 401);
    }

    req.user = {
      userId: user.userId,
      email: user.email,
      role: user.role,
      settings: user.settings,
      subscription: user.subscription,
    };

    next();
  } catch (error) {
    logger.error('Authentication failed:', error);

    if (error.name === 'JsonWebTokenError') {
      return next(new AuthError('Invalid token', 401));
    }

    if (error.name === 'TokenExpiredError') {
      return next(new AuthError('Token expired', 401));
    }

    next(error);
  }
};

const authorize = (roles = []) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(new AuthError('Authentication required', 401));
      }

      if (roles.length && !roles.includes(req.user.role)) {
        return next(new AuthError('Insufficient permissions', 403));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

const extractToken = (req) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return req.headers['x-auth-token'] || req.query.token;
};

module.exports = {
  authenticate,
  authorize,
};

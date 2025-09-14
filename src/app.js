const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');

const config = require('./config');
const { connectDatabase } = require('./config/database');
const { logger } = require('./utils/logger');
const { errorHandler, notFoundHandler } = require('./middleware/error.middleware');
const routes = require('./routes');

class App {
  constructor() {
    this.app = express();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  initializeMiddlewares() {
    // Security middlewares
    this.app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
          },
        },
      })
    );

    this.app.use(
      cors({
        origin: config.cors.origin,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id'],
      })
    );

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.max,
      message: {
        success: false,
        message: 'Too many requests from this IP, please try again later',
        timestamp: new Date().toISOString(),
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api/', limiter);

    // Body parsing
    this.app.use(
      express.json({
        limit: '10mb',
        type: ['application/json', 'text/plain'],
      })
    );
    this.app.use(
      express.urlencoded({
        extended: true,
        limit: '10mb',
      })
    );

    // Data sanitization
    this.app.use(
      mongoSanitize({
        allowDots: true,
        replaceWith: '_',
      })
    );

    // Compression
    this.app.use(
      compression({
        filter: (req, res) => {
          if (req.headers['x-no-compression']) {
            return false;
          }
          return compression.filter(req, res);
        },
        level: 6,
      })
    );

    // Static files
    this.app.use(
      express.static('public', {
        maxAge: '1d',
        etag: true,
      })
    );

    // Request logging middleware
    this.app.use((req, res, next) => {
      const startTime = Date.now();

      // Log request
      logger.info('Incoming request', {
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        userId: req.headers['x-user-id'],
        timestamp: new Date().toISOString(),
      });

      // Log response when finished
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        logger.info('Request completed', {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
          userId: req.headers['x-user-id'],
        });
      });

      next();
    });
  }

  initializeRoutes() {
    // API routes
    this.app.use('/api', routes);

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        success: true,
        message: 'System healthy',
        data: {
          status: 'operational',
          timestamp: new Date().toISOString(),
          uptime: Math.floor(process.uptime()),
          memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
            rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
          },
          environment: config.env,
          version: '2.0.0',
          framework: 'LangChain Multi-Agent System',
        },
      });
    });

    // API documentation endpoint
    this.app.get('/docs', (req, res) => {
      res.json({
        success: true,
        message: 'API Documentation',
        data: {
          title: 'TavSearch Multi-Agent API Documentation',
          version: '2.0.0',
          description: 'LangChain Multi-Agent Market Intelligence System',
          baseUrl: req.protocol + '://' + req.get('host') + '/api',
          endpoints: {
            analysis: {
              post: '/analysis - Start new analysis',
              get: '/analysis - Get user analyses',
              get_status: '/analysis/:id/status - Get analysis status',
              get_results: '/analysis/:id/results - Get analysis results',
              delete: '/analysis/:id - Cancel analysis',
              retry: '/analysis/:id/retry - Retry analysis',
            },
            users: {
              get_profile: '/users/profile - Get user profile',
              put_profile: '/users/profile - Update user profile',
              get_usage: '/users/usage - Get user usage stats',
            },
            analytics: {
              get_user: '/analytics/user - Get user analytics',
              get_trends: '/analytics/trends - Get query trends',
              get_dashboard: '/analytics/dashboard - Get dashboard metrics',
            },
            export: {
              get_formats: '/export/:id/formats - Get available export formats',
              get_export: '/export/:id/:format - Export analysis results',
              get_history: '/export/history - Get export history',
            },
          },
          authentication: {
            type: 'Header-based',
            header: 'x-user-id',
            description: 'Include x-user-id header with requests',
          },
        },
      });
    });

    // Root endpoint redirect
    this.app.get('/', (req, res) => {
      res.redirect('/api');
    });
  }

  initializeErrorHandling() {
    // 404 handler for undefined routes
    this.app.use('*', notFoundHandler);

    // Global error handler (must be last)
    this.app.use(errorHandler);
  }

  async start() {
    try {
      // Connect to database
      await connectDatabase();
      logger.info('Database connected successfully');

      // Start server
      const port = config.port;
      const server = this.app.listen(port, () => {
        logger.info('Server started successfully', {
          port,
          environment: config.env,
          timestamp: new Date().toISOString(),
          processId: process.pid,
          nodeVersion: process.version,
        });
      });

      // Graceful shutdown handling
      process.on('SIGTERM', () => {
        logger.info('SIGTERM received, shutting down gracefully');
        server.close(() => {
          logger.info('Process terminated');
          process.exit(0);
        });
      });

      process.on('SIGINT', () => {
        logger.info('SIGINT received, shutting down gracefully');
        server.close(() => {
          logger.info('Process terminated');
          process.exit(0);
        });
      });

      // Handle uncaught exceptions
      process.on('uncaughtException', (err) => {
        logger.error('Uncaught Exception:', err);
        server.close(() => {
          process.exit(1);
        });
      });

      // Handle unhandled promise rejections
      process.on('unhandledRejection', (reason, promise) => {
        logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
        server.close(() => {
          process.exit(1);
        });
      });

      return server;
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }
}

module.exports = new App();

const winston = require('winston');
const path = require('path');

// Default configuration if config file is missing
const defaultConfig = {
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: {
      enabled: process.env.NODE_ENV === 'production',
      path: process.env.LOG_PATH || './logs',
    },
  },
};

// Try to load config, fallback to default if missing
let config;
try {
  config = require('../config');
} catch (error) {
  console.warn('Config file not found, using default logging configuration');
  config = defaultConfig;
}

const createLogger = () => {
  try {
    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.json()
    );

    const transports = [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            let metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
            return `${timestamp} [${level}]: ${message} ${metaStr}`;
          })
        ),
      }),
    ];

    // Add file transports in production if enabled
    if (config.logging?.file?.enabled) {
      const logDir = config.logging.file.path || './logs';

      // Create logs directory if it doesn't exist
      const fs = require('fs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      transports.push(
        new winston.transports.File({
          filename: path.join(logDir, 'error.log'),
          level: 'error',
          format: logFormat,
        }),
        new winston.transports.File({
          filename: path.join(logDir, 'combined.log'),
          format: logFormat,
        })
      );
    }

    return winston.createLogger({
      level: config.logging?.level || 'info',
      format: logFormat,
      transports,
      exitOnError: false,
      // Handle uncaught exceptions and rejections
      exceptionHandlers: [
        new winston.transports.Console({
          format: winston.format.simple(),
        }),
      ],
      rejectionHandlers: [
        new winston.transports.Console({
          format: winston.format.simple(),
        }),
      ],
    });
  } catch (error) {
    // Fallback to console logging if Winston fails
    console.error('Failed to create Winston logger, falling back to console:', error.message);
    return createFallbackLogger();
  }
};

const createFallbackLogger = () => {
  const timestamp = () => new Date().toISOString();

  return {
    info: (message, meta = {}) => {
      console.log(`[${timestamp()}] INFO: ${message}`, meta);
    },
    error: (message, meta = {}) => {
      console.error(`[${timestamp()}] ERROR: ${message}`, meta);
    },
    warn: (message, meta = {}) => {
      console.warn(`[${timestamp()}] WARN: ${message}`, meta);
    },
    debug: (message, meta = {}) => {
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[${timestamp()}] DEBUG: ${message}`, meta);
      }
    },
    verbose: (message, meta = {}) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[${timestamp()}] VERBOSE: ${message}`, meta);
      }
    },
  };
};

let logger;
try {
  logger = createLogger();

  // Test the logger to make sure it works
  logger.info('Logger initialized successfully');
} catch (error) {
  console.error('Failed to initialize logger:', error);
  logger = createFallbackLogger();
  logger.info('Using fallback console logger');
}

module.exports = { logger };

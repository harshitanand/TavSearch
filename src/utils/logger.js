const winston = require('winston');
const path = require('path');
const config = require('../config');

const createLogger = () => {
  const logFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  );

  const transports = [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ];

  // Add file transports in production
  if (config.logging.file.enabled) {
    const logDir = config.logging.file.path;
    
    transports.push(
      new winston.transports.File({
        filename: path.join(logDir, 'error.log'),
        level: 'error'
      }),
      new winston.transports.File({
        filename: path.join(logDir, 'combined.log')
      })
    );
  }

  return winston.createLogger({
    level: config.logging.level,
    format: logFormat,
    transports,
    exitOnError: false
  });
};

const logger = createLogger();

module.exports = { logger };

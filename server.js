const app = require('./src/app');
let cacheService = require('./src/services/cache.service');
const { logger } = require('./src/utils/logger');
const config = require('./src/config');

cacheService = new cacheService(config);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');

  await cacheService.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');

  await cacheService.disconnect();
  process.exit(0);
});

// Initialize cache service
cacheService.connect().catch((error) => {
  logger.warn('Cache service unavailable:', error.message);
});

// Start the application
app.start();

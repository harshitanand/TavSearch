const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { logger } = require('../src/utils/logger');

let mongod;

// Setup MongoDB Memory Server for testing
beforeAll(async () => {
  try {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
    logger.info('Test database connected');
  } catch (error) {
    logger.error('Test database connection failed:', error);
    throw error;
  }
});

afterAll(async () => {
  try {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongod.stop();
    logger.info('Test database disconnected');
  } catch (error) {
    logger.error('Test database cleanup failed:', error);
  }
});

afterEach(async () => {
  try {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany();
    }
  } catch (error) {
    logger.error('Test cleanup failed:', error);
  }
});

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.OPENAI_API_KEY = 'test_openai_key';
process.env.TAVILY_API_KEY = 'test_tavily_key';
process.env.JWT_SECRET = 'test_jwt_secret';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';

// Suppress logs during testing
logger.transports.forEach(transport => {
  transport.silent = true;
});

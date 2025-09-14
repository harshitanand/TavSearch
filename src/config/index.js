const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT) || 3000,

  // Database
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/market_intelligence',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    },
  },

  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    ttl: 3600, // 1 hour default
  },

  // API Keys
  apiKeys: {
    openai: process.env.OPENAI_API_KEY,
    tavily: process.env.TAVILY_API_KEY,
    jwt: process.env.JWT_SECRET || 'development-secret',
  },

  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  },

  // CORS
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  },

  // Analysis settings
  analysis: {
    maxConcurrent: parseInt(process.env.MAX_CONCURRENT_ANALYSES) || 5,
    searchTimeout: parseInt(process.env.SEARCH_TIMEOUT_MS) || 30000,
    analysisTimeout: parseInt(process.env.ANALYSIS_TIMEOUT_MS) || 120000,
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: {
      enabled: process.env.NODE_ENV === 'production',
      path: process.env.LOG_FILE_PATH || './logs/',
    },
  },
};

module.exports = config;

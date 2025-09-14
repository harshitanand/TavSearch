const redis = require('redis');
const config = require('../config');
const { logger } = require('../utils/logger');

class CacheService {
  constructor() {
    this.client = null;
    this.connected = false;
  }

  async connect() {
    try {
      this.client = redis.createClient({
        url: config.redis.url,
      });

      this.client.on('error', (err) => {
        logger.error('Redis Client Error:', err);
        this.connected = false;
      });

      this.client.on('connect', () => {
        logger.info('Connected to Redis');
        this.connected = true;
      });

      await this.client.connect();
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      this.connected = false;
    }
  }

  async setAnalysisResults(queryId, results, ttl = config.redis.ttl) {
    if (!this.connected) return false;

    try {
      const key = `analysis:${queryId}`;
      await this.client.setEx(key, ttl, JSON.stringify(results));
      return true;
    } catch (error) {
      logger.error('Failed to cache analysis results:', error);
      return false;
    }
  }

  async getAnalysisResults(queryId) {
    if (!this.connected) return null;

    try {
      const key = `analysis:${queryId}`;
      const cached = await this.client.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.error('Failed to retrieve cached results:', error);
      return null;
    }
  }

  async setUserSession(userId, sessionData, ttl = 86400) {
    // 24 hours
    if (!this.connected) return false;

    try {
      const key = `session:${userId}`;
      await this.client.setEx(key, ttl, JSON.stringify(sessionData));
      return true;
    } catch (error) {
      logger.error('Failed to cache user session:', error);
      return false;
    }
  }

  async getUserSession(userId) {
    if (!this.connected) return null;

    try {
      const key = `session:${userId}`;
      const cached = await this.client.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.error('Failed to retrieve user session:', error);
      return null;
    }
  }

  async invalidate(pattern) {
    if (!this.connected) return false;

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      return true;
    } catch (error) {
      logger.error('Failed to invalidate cache:', error);
      return false;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.disconnect();
      this.connected = false;
      logger.info('Disconnected from Redis');
    }
  }
}

module.exports = CacheService;

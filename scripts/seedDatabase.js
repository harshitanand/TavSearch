const mongoose = require('mongoose');
const User = require('../src/models/User');
const Query = require('../src/models/Query');
const Result = require('../src/models/Result');
const config = require('../src/config');
const { logger } = require('../src/utils/logger');

async function seedDatabase() {
  try {
    await mongoose.connect(config.database.uri);
    logger.info('Connected to database for seeding');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Query.deleteMany({}),
      Result.deleteMany({})
    ]);

    // Create demo users
    const users = await User.insertMany([
      {
        userId: 'demo-user-1',
        email: 'demo1@example.com',
        name: 'Demo User 1',
        subscription: { plan: 'free', status: 'active' }
      },
      {
        userId: 'demo-user-2',
        email: 'demo2@example.com',
        name: 'Demo User 2',
        subscription: { plan: 'premium', status: 'active' }
      },
      {
        userId: 'admin-user',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin',
        subscription: { plan: 'enterprise', status: 'active' }
      }
    ]);

    // Create demo queries
    const queries = await Query.insertMany([
      {
        userId: 'demo-user-1',
        queryText: 'Electric vehicle market trends 2024',
        status: 'completed',
        tags: ['automotive', 'electric', 'trends']
      },
      {
        userId: 'demo-user-1',
        queryText: 'AI startup landscape analysis',
        status: 'completed',
        tags: ['ai', 'startups', 'technology']
      },
      {
        userId: 'demo-user-2',
        queryText: 'Renewable energy investment opportunities',
        status: 'processing',
        tags: ['energy', 'investment', 'renewable']
      }
    ]);

    logger.info(`Seeded ${users.length} users and ${queries.length} queries`);
    
    await mongoose.disconnect();
    logger.info('Database seeding completed');

  } catch (error) {
    logger.error('Database seeding failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;

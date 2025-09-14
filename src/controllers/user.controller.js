const User = require('../models/User');
const Result = require('../models/Result');
const Query = require('../models/Query');
const { logger } = require('../utils/logger');
const { ApiResponse } = require('../utils/response');
const { ValidationError } = require('../utils/errors');

class UserController {
  async getUserProfile(req, res, next) {
    try {
      const userId = req.user.userId;
      const user = await User.findOne({ userId });

      if (!user) {
        // Create user if doesn't exist (for demo)
        const newUser = new User({
          userId,
          email: req.user.email || `${userId}@demo.com`,
          name: `User ${userId}`
        });
        await newUser.save();
        
        res.json(new ApiResponse(true, 'User profile retrieved', newUser));
      } else {
        res.json(new ApiResponse(true, 'User profile retrieved', user));
      }

    } catch (error) {
      logger.error('Failed to get user profile:', error);
      next(error);
    }
  }

  async updateUserProfile(req, res, next) {
    try {
      const userId = req.user.userId;
      const updates = req.body;

      // Filter allowed updates
      const allowedUpdates = ['name', 'settings'];
      const filteredUpdates = {};
      
      allowedUpdates.forEach(key => {
        if (updates[key] !== undefined) {
          filteredUpdates[key] = updates[key];
        }
      });

      const user = await User.findOneAndUpdate(
        { userId },
        filteredUpdates,
        { new: true, upsert: true }
      );

      res.json(new ApiResponse(true, 'Profile updated successfully', user));

    } catch (error) {
      logger.error('Failed to update user profile:', error);
      next(error);
    }
  }

  async getUserAnalytics(req, res, next) {
    try {
      const userId = req.user.userId;
      const { startDate, endDate } = req.query;

      const dateRange = {};
      if (startDate) dateRange.startDate = new Date(startDate);
      if (endDate) dateRange.endDate = new Date(endDate);

      const analytics = await Result.getAnalyticsSummary(userId, dateRange);
      
      // Get query statistics
      const queryStats = await Query.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      res.json(new ApiResponse(true, 'Analytics retrieved successfully', {
        summary: analytics[0] || {},
        queryStats: queryStats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {})
      }));

    } catch (error) {
      logger.error('Failed to get user analytics:', error);
      next(error);
    }
  }

  async getUserUsage(req, res, next) {
    try {
      const userId = req.user.userId;
      const user = await User.findOne({ userId });

      if (!user) {
        throw new ValidationError('User not found', 404);
      }

      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);

      const monthlyQueries = await Query.countDocuments({
        userId,
        createdAt: { $gte: currentMonth }
      });

      const usage = {
        totalAnalyses: user.usage.totalAnalyses,
        monthlyAnalyses: monthlyQueries,
        lastAnalysis: user.usage.lastAnalysis,
        subscription: user.subscription,
        limits: this.getUserLimits(user.subscription.plan),
        remainingAnalyses: this.getRemainingAnalyses(user.subscription.plan, monthlyQueries)
      };

      res.json(new ApiResponse(true, 'Usage statistics retrieved', usage));

    } catch (error) {
      logger.error('Failed to get user usage:', error);
      next(error);
    }
  }

  async getAllUsers(req, res, next) {
    try {
      const { limit = 20, skip = 0, search } = req.query;
      
      const query = {};
      if (search) {
        query.$or = [
          { email: { $regex: search, $options: 'i' } },
          { name: { $regex: search, $options: 'i' } }
        ];
      }

      const users = await User.find(query)
        .select('-__v')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(skip));

      const total = await User.countDocuments(query);

      res.json(new ApiResponse(true, 'Users retrieved successfully', {
        users,
        pagination: {
          total,
          limit: parseInt(limit),
          skip: parseInt(skip),
          hasMore: skip + users.length < total
        }
      }));

    } catch (error) {
      logger.error('Failed to get all users:', error);
      next(error);
    }
  }

  async getUserById(req, res, next) {
    try {
      const { userId } = req.params;
      const user = await User.findOne({ userId });

      if (!user) {
        throw new ValidationError('User not found', 404);
      }

      res.json(new ApiResponse(true, 'User retrieved successfully', user));

    } catch (error) {
      logger.error('Failed to get user by ID:', error);
      next(error);
    }
  }

  getUserLimits(plan) {
    const limits = {
      free: { monthlyAnalyses: 10, concurrentAnalyses: 1 },
      premium: { monthlyAnalyses: 100, concurrentAnalyses: 3 },
      enterprise: { monthlyAnalyses: 1000, concurrentAnalyses: 10 }
    };
    return limits[plan] || limits.free;
  }

  getRemainingAnalyses(plan, used) {
    const limits = this.getUserLimits(plan);
    return Math.max(0, limits.monthlyAnalyses - used);
  }
}

module.exports = new UserController();

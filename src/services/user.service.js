const { User } = require('../models/User');
const { logger } = require('../utils/logger');
const { ApiError } = require('../utils/errors');

class UserService {
  constructor() {
    this.logger = logger;
  }

  static async createUser(userData) {
    try {
      this.logger.info('Creating new user', { email: userData.email });

      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        throw new ApiError('User already exists with this email', 409);
      }

      const user = new User({
        email: userData.email,
        name: userData.name,
        role: userData.role || 'user',
        preferences: userData.preferences || {
          emailNotifications: true,
          reportFormat: 'html',
          analysisDepth: 'standard',
        },
        createdAt: new Date(),
        lastLoginAt: null,
        isActive: true,
      });

      const savedUser = await user.save();
      this.logger.info('User created successfully', { userId: savedUser._id });

      return this.sanitizeUser(savedUser);
    } catch (error) {
      this.logger.error('Failed to create user', { error: error.message });
      throw error instanceof ApiError ? error : new ApiError('Failed to create user', 500);
    }
  }

  static async getUserById(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new ApiError('User not found', 404);
      }

      return this.sanitizeUser(user);
    } catch (error) {
      this.logger.error('Failed to get user by ID', { userId, error: error.message });
      throw error instanceof ApiError ? error : new ApiError('Failed to retrieve user', 500);
    }
  }

  static async getUserByEmail(email) {
    try {
      const user = await User.findOne({ email, isActive: true });
      if (!user) {
        throw new ApiError('User not found', 404);
      }

      return this.sanitizeUser(user);
    } catch (error) {
      this.logger.error('Failed to get user by email', { email, error: error.message });
      throw error instanceof ApiError ? error : new ApiError('Failed to retrieve user', 500);
    }
  }

  static async updateUser(userId, updateData) {
    try {
      this.logger.info('Updating user', { userId });

      // Remove sensitive fields that shouldn't be updated directly
      const sanitizedUpdate = { ...updateData };
      delete sanitizedUpdate.createdAt;
      delete sanitizedUpdate._id;

      const user = await User.findByIdAndUpdate(
        userId,
        {
          ...sanitizedUpdate,
          updatedAt: new Date(),
        },
        { new: true, runValidators: true }
      );

      if (!user) {
        throw new ApiError('User not found', 404);
      }

      this.logger.info('User updated successfully', { userId });
      return this.sanitizeUser(user);
    } catch (error) {
      this.logger.error('Failed to update user', { userId, error: error.message });
      throw error instanceof ApiError ? error : new ApiError('Failed to update user', 500);
    }
  }

  static async updateUserPreferences(userId, preferences) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        {
          preferences: {
            ...preferences,
            updatedAt: new Date(),
          },
          updatedAt: new Date(),
        },
        { new: true, runValidators: true }
      );

      if (!user) {
        throw new ApiError('User not found', 404);
      }

      return this.sanitizeUser(user);
    } catch (error) {
      this.logger.error('Failed to update user preferences', { userId, error: error.message });
      throw error instanceof ApiError ? error : new ApiError('Failed to update preferences', 500);
    }
  }

  static async recordUserLogin(userId, loginMetadata = {}) {
    try {
      await User.findByIdAndUpdate(userId, {
        lastLoginAt: new Date(),
        $push: {
          loginHistory: {
            timestamp: new Date(),
            ipAddress: loginMetadata.ipAddress,
            userAgent: loginMetadata.userAgent,
          },
        },
      });

      this.logger.info('User login recorded', { userId });
    } catch (error) {
      this.logger.error('Failed to record user login', { userId, error: error.message });
      // Don't throw error for login recording failure
    }
  }

  static async getUserAnalysisHistory(userId, options = {}) {
    try {
      const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = options;

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      // This would typically join with Analysis collection
      // For now, returning user data with analysis count
      const user = await User.findById(userId);
      if (!user) {
        throw new ApiError('User not found', 404);
      }

      // In a complete implementation, you'd aggregate analysis data here
      return {
        user: this.sanitizeUser(user),
        analysisHistory: [], // Would contain actual analysis records
        pagination: {
          page,
          limit,
          total: 0, // Would be actual count
          pages: 0,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get user analysis history', { userId, error: error.message });
      throw error instanceof ApiError
        ? error
        : new ApiError('Failed to retrieve analysis history', 500);
    }
  }

  static async deactivateUser(userId) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        {
          isActive: false,
          deactivatedAt: new Date(),
          updatedAt: new Date(),
        },
        { new: true }
      );

      if (!user) {
        throw new ApiError('User not found', 404);
      }

      this.logger.info('User deactivated', { userId });
      return this.sanitizeUser(user);
    } catch (error) {
      this.logger.error('Failed to deactivate user', { userId, error: error.message });
      throw error instanceof ApiError ? error : new ApiError('Failed to deactivate user', 500);
    }
  }

  static async getAllUsers(options = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        isActive = true,
      } = options;

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
      const filter = { isActive };

      const users = await User.find(filter).sort(sort).skip(skip).limit(limit);

      const total = await User.countDocuments(filter);

      return {
        users: users.map((user) => this.sanitizeUser(user)),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error('Failed to get all users', { error: error.message });
      throw new ApiError('Failed to retrieve users', 500);
    }
  }

  sanitizeUser(user) {
    const userObj = user.toObject ? user.toObject() : user;

    // Remove sensitive information
    delete userObj.password;
    delete userObj.__v;

    return userObj;
  }
}

module.exports = UserService;

let UserService = require('../services/user.service');
const User = require('../models/User');
const { catchAsync } = require('../middleware/error.middleware');
const { AuthorizationError, NotFoundError, ValidationError } = require('../utils/errors');
const logger = require('../utils/logger');
const config = require('../config');

UserService = new UserService(config);

class UserController {
  /**
   * Get user profile with settings and subscription info
   */
  static getUserProfile = catchAsync(async (req, res) => {
    const userId = req.user.userId;

    const user = await User.findOne({ userId }).select('-__v -password').lean();

    if (!user) {
      throw new NotFoundError('User profile not found');
    }

    logger.info('User profile retrieved', { userId });

    res.json({
      success: true,
      message: 'User profile retrieved',
      data: user,
    });
  });

  /**
   * Update user profile and preferences
   */
  static updateUserProfile = catchAsync(async (req, res) => {
    const userId = req.user.userId;
    const updateData = req.body;

    // Remove sensitive fields that shouldn't be updated via this endpoint
    delete updateData.userId;
    delete updateData.subscription;
    delete updateData.usage;

    const updatedUser = await User.findOneAndUpdate(
      { userId },
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-__v -password');

    if (!updatedUser) {
      throw new NotFoundError('User not found');
    }

    logger.info('User profile updated', {
      userId,
      updatedFields: Object.keys(updateData),
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser,
    });
  });

  /**
   * Get user usage statistics and analytics
   */
  static getUserUsage = catchAsync(async (req, res) => {
    const userId = req.user.userId;
    const { timeframe = '30d' } = req.query;

    const usage = await UserService.getUserUsage(userId, timeframe);

    res.json({
      success: true,
      message: 'User usage statistics retrieved',
      data: usage,
      timeframe,
    });
  });

  /**
   * Get user analytics (admin or user's own)
   */
  static getUserAnalytics = catchAsync(async (req, res) => {
    const userId = req.user.userId;
    const { timeframe = '30d', metrics } = req.query;

    const analytics = await UserService.getUserAnalytics(userId, {
      timeframe,
      metrics: metrics ? metrics.split(',') : undefined,
    });

    res.json({
      success: true,
      message: 'User analytics retrieved successfully',
      data: analytics,
    });
  });

  /**
   * Get all users (admin only)
   */
  static getAllUsers = catchAsync(async (req, res) => {
    const queryOptions = {
      ...req.query,
      populate: req.query.populate ? req.query.populate.split(',') : [],
    };

    const result = await UserService.getAllUsers(queryOptions);

    logger.info('All users retrieved', {
      adminUserId: req.user.userId,
      page: req.query.page || 1,
      limit: req.query.limit || 20,
      total: result.pagination?.total,
    });

    res.json({
      success: true,
      message: 'Users retrieved successfully',
      data: result.users,
      pagination: result.pagination,
    });
  });

  /**
   * Get user by ID (admin only)
   */
  static getUserById = catchAsync(async (req, res) => {
    const { userId } = req.params;

    const user = await User.findOne({ userId }).select('-__v -password').lean();

    if (!user) {
      throw new NotFoundError('User not found');
    }

    logger.info('User retrieved by admin', {
      adminUserId: req.user.userId,
      targetUserId: userId,
    });

    res.json({
      success: true,
      message: 'User retrieved successfully',
      data: user,
    });
  });

  /**
   * Update user subscription (admin only)
   */
  static updateUserSubscription = catchAsync(async (req, res) => {
    const { userId } = req.params;
    const { plan, status } = req.body;

    const updatedUser = await UserService.updateSubscription(userId, { plan, status });

    logger.info('User subscription updated', {
      adminUserId: req.user.userId,
      targetUserId: userId,
      newPlan: plan,
      newStatus: status,
    });

    res.json({
      success: true,
      message: 'User subscription updated successfully',
      data: updatedUser,
    });
  });
}

module.exports = UserController;

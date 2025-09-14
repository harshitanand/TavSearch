const express = require('express');
const UserController = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validateQueryParams, validateUserUpdate } = require('../middleware/validation');

const router = express.Router();

// User profile routes
router.get('/profile', authenticate, UserController.getUserProfile);
// router.put('/profile', authenticate, validateUserUpdate, UserController.updateUserProfile);

// User analytics and usage
router.get('/analytics', authenticate, validateQueryParams, UserController.getUserAnalytics);
router.get('/usage', authenticate, UserController.getUserUsage);

// Admin routes
router.get(
  '/',
  authenticate,
  authorize(['admin']),
  validateQueryParams,
  UserController.getAllUsers
);
router.get('/:userId', authenticate, authorize(['admin']), UserController.getUserById);
router.put(
  '/:userId/subscription',
  authenticate,
  authorize(['admin']),
  UserController.updateUserSubscription
);

module.exports = router;

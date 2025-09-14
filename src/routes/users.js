const express = require('express');
const userController = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validateQueryParams } = require('../middleware/validation');

const router = express.Router();

// Get user profile
router.get('/profile', 
  authenticate,
  userController.getUserProfile
);

// Update user profile
router.put('/profile', 
  authenticate,
  userController.updateUserProfile
);

// Get user analytics
router.get('/analytics', 
  authenticate,
  validateQueryParams,
  userController.getUserAnalytics
);

// Get user usage stats
router.get('/usage', 
  authenticate,
  userController.getUserUsage
);

// Admin routes
router.get('/', 
  authenticate,
  authorize(['admin']),
  validateQueryParams,
  userController.getAllUsers
);

router.get('/:userId', 
  authenticate,
  authorize(['admin']),
  userController.getUserById
);

module.exports = router;

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// Get user profile
router.get('/profile/:userId', userController.getUserProfile);

// Update own profile
router.put('/profile', userController.updateProfile);

// Get leaderboard (sorted by coins)
router.get('/leaderboard', userController.getLeaderboard);

// Search users
router.get('/search', userController.searchUsers);

// Get user statistics
router.get('/stats/:userId', userController.getUserStats);

module.exports = router;
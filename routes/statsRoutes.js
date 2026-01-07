const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// Get user statistics
router.get('/user/:userId', statsController.getUserStats);

// Get weekly statistics
router.get('/weekly/:userId', statsController.getWeeklyStats);

// Get weekly distance graph data
router.get('/weekly-graph/:userId', statsController.getWeeklyGraphData);

// Get best efforts
router.get('/best-efforts/:userId', statsController.getBestEfforts);

// Get longest rides
router.get('/longest-rides/:userId', statsController.getLongestRides);

// Get year summary
router.get('/year-summary/:userId', statsController.getYearSummary);

module.exports = router;
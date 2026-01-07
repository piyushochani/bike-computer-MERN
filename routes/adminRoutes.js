const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// All routes require authentication and admin role
router.use(protect);
router.use(adminOnly);

// User Management
router.get('/users', adminController.getAllUsers);
router.get('/users/:userId', adminController.getUserDetails);
router.put('/users/:userId/block', adminController.blockUser);
router.put('/users/:userId/unblock', adminController.unblockUser);

// Activity Management
router.get('/rides', adminController.getAllRides);
router.get('/rides/user/:userId', adminController.getUserRides);
router.delete('/rides/:rideId', adminController.deleteRide);

// Flagged Activities
router.get('/flagged', adminController.getFlaggedActivities);
router.get('/flagged/:flagId', adminController.getFlagDetails);
router.put('/flagged/:flagId/review', adminController.reviewFlag);
router.put('/flagged/:flagId/dismiss', adminController.dismissFlag);

// Admin Logs
router.get('/logs', adminController.getAdminLogs);
router.get('/logs/recent', adminController.getRecentLogs);

// Dashboard Stats
router.get('/dashboard/stats', adminController.getDashboardStats);

module.exports = router;
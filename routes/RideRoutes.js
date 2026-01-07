const express = require('express');
const router = express.Router();
const rideController = require('../controllers/rideController');
const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// Create new ride
router.post('/', rideController.createRide);

// Get all rides for logged-in user
router.get('/my-rides', rideController.getMyRides);

// Get rides by user ID
router.get('/user/:userId', rideController.getUserRides);

// Search rides by name
router.get('/search', rideController.searchRides);

// Get single ride details
router.get('/:rideId', rideController.getRideById);

// Update ride (only owner can update)
router.put('/:rideId', rideController.updateRide);

// Delete ride (only owner can delete)
router.delete('/:rideId', rideController.deleteRide);

// Flag a ride
router.post('/:rideId/flag', rideController.flagRide);

// Add segment to ride
router.post('/:rideId/segments', rideController.addSegment);

// Upload media (photos/videos)
router.post('/:rideId/upload', rideController.uploadMedia);

// Delete media
router.delete('/:rideId/media/:mediaId', rideController.deleteMedia);

module.exports = router;
const Ride = require('../models/Ride');
const User = require('../models/User');
const Flag = require('../models/Flag');

// Create a new ride
exports.createRide = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      rideName,
      description,
      distance,
      totalTime,
      movingTime,
      elapsedTime,
      averageSpeed,
      maxSpeed,
      elevation,
      elevationGained,
      routeMap,
      segments,
      speedData,
      elevationData
    } = req.body;

    // Calculate coins: (Distance × Average Speed) / 2
    const coinsEarned = Math.round((distance * averageSpeed) / 2);

    // Create ride
    const ride = new Ride({
      userId,
      rideName: rideName || 'Unnamed Ride',
      description,
      distance,
      totalTime,
      movingTime,
      elapsedTime,
      averageSpeed,
      maxSpeed,
      elevation,
      elevationGained,
      routeMap,
      segments: segments || [],
      speedData: speedData || [],
      elevationData: elevationData || [],
      coinsEarned,
      photos: [],
      videos: []
    });

    await ride.save();

    // Update user's total coins
    await User.findByIdAndUpdate(userId, {
      $inc: { totalCoins: coinsEarned }
    });

    res.status(201).json({
      success: true,
      message: 'Ride created successfully',
      ride,
      coinsEarned
    });
  } catch (error) {
    console.error('Create ride error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error creating ride' 
    });
  }
};

// Get all rides for logged-in user
exports.getUserRides = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { search, page = 1, limit = 20, sortBy = 'date' } = req.query;
    const skip = (page - 1) * limit;

    let query = { userId };

    // Add search functionality
    if (search) {
      query.rideName = { $regex: search, $options: 'i' };
    }

    // Determine sort order
    let sort = {};
    if (sortBy === 'date') sort.createdAt = -1;
    else if (sortBy === 'distance') sort.distance = -1;
    else if (sortBy === 'time') sort.totalTime = -1;
    else if (sortBy === 'coins') sort.coinsEarned = -1;

    const rides = await Ride.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip)
      .select('rideName distance totalTime createdAt coinsEarned');

    const total = await Ride.countDocuments(query);

    res.json({
      success: true,
      rides,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get user rides error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching rides' 
    });
  }
};

// Get single ride details
exports.getRideById = async (req, res) => {
  try {
    const { rideId } = req.params;

    const ride = await Ride.findById(rideId).populate('userId', 'name city');
    if (!ride) {
      return res.status(404).json({ 
        success: false, 
        message: 'Ride not found' 
      });
    }

    res.json({
      success: true,
      ride
    });
  } catch (error) {
    console.error('Get ride by ID error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching ride' 
    });
  }
};

// Update ride (only by owner)
exports.updateRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const userId = req.user.userId;
    const { rideName, description } = req.body;

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ 
        success: false, 
        message: 'Ride not found' 
      });
    }

    // Check ownership
    if (ride.userId.toString() !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to update this ride' 
      });
    }

    // Update fields
    if (rideName) ride.rideName = rideName;
    if (description !== undefined) ride.description = description;

    await ride.save();

    res.json({
      success: true,
      message: 'Ride updated successfully',
      ride
    });
  } catch (error) {
    console.error('Update ride error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error updating ride' 
    });
  }
};

// Delete ride (only by owner)
exports.deleteRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const userId = req.user.userId;

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ 
        success: false, 
        message: 'Ride not found' 
      });
    }

    // Check ownership
    if (ride.userId.toString() !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to delete this ride' 
      });
    }

    // Deduct coins from user
    await User.findByIdAndUpdate(userId, {
      $inc: { totalCoins: -ride.coinsEarned }
    });

    // Delete ride
    await Ride.findByIdAndDelete(rideId);

    res.json({
      success: true,
      message: 'Ride deleted successfully'
    });
  } catch (error) {
    console.error('Delete ride error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error deleting ride' 
    });
  }
};

// Upload photos/videos to ride
exports.uploadMedia = async (req, res) => {
  try {
    const { rideId } = req.params;
    const userId = req.user.userId;
    const { mediaUrls, mediaType } = req.body; // mediaType: 'photo' or 'video'

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ 
        success: false, 
        message: 'Ride not found' 
      });
    }

    // Check ownership
    if (ride.userId.toString() !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to upload media to this ride' 
      });
    }

    // Add media URLs
    if (mediaType === 'photo') {
      ride.photos.push(...mediaUrls);
    } else if (mediaType === 'video') {
      ride.videos.push(...mediaUrls);
    }

    await ride.save();

    res.json({
      success: true,
      message: 'Media uploaded successfully',
      ride
    });
  } catch (error) {
    console.error('Upload media error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error uploading media' 
    });
  }
};

// Delete media from ride
exports.deleteMedia = async (req, res) => {
  try {
    const { rideId } = req.params;
    const userId = req.user.userId;
    const { mediaUrl, mediaType } = req.body;

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ 
        success: false, 
        message: 'Ride not found' 
      });
    }

    // Check ownership
    if (ride.userId.toString() !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to delete media from this ride' 
      });
    }

    // Remove media URL
    if (mediaType === 'photo') {
      ride.photos = ride.photos.filter(url => url !== mediaUrl);
    } else if (mediaType === 'video') {
      ride.videos = ride.videos.filter(url => url !== mediaUrl);
    }

    await ride.save();

    res.json({
      success: true,
      message: 'Media deleted successfully',
      ride
    });
  } catch (error) {
    console.error('Delete media error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error deleting media' 
    });
  }
};

// Flag a ride
exports.flagRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const userId = req.user.userId;
    const { reason } = req.body;

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ 
        success: false, 
        message: 'Ride not found' 
      });
    }

    // Check if already flagged by this user
    const existingFlag = await Flag.findOne({ rideId, flaggedBy: userId });
    if (existingFlag) {
      return res.status(400).json({ 
        success: false, 
        message: 'You have already flagged this ride' 
      });
    }

    // Create flag
    const flag = new Flag({
      rideId,
      flaggedBy: userId,
      reason: reason || 'No reason provided'
    });

    await flag.save();

    res.json({
      success: true,
      message: 'Ride flagged successfully'
    });
  } catch (error) {
    console.error('Flag ride error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error flagging ride' 
    });
  }
};

// Get rides by user ID (public)
exports.getRidesByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const rides = await Ride.find({ userId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .select('rideName distance totalTime createdAt coinsEarned');

    const total = await Ride.countDocuments({ userId });

    res.json({
      success: true,
      rides,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get rides by user ID error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching rides' 
    });
  }
};
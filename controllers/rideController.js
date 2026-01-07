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
      elapsedTime,
      movingTime,
      averageSpeed,
      maxSpeed,
      totalElevation,
      elevationGained,
      gpsPath,
      segments,
      recordedFrom,
      startTime,
      endTime
    } = req.body;

    // Calculate coins: (Distance × Average Speed) / 2
    const coinsEarned = Math.round((distance * averageSpeed) / 2);

    // Create ride
    const ride = new Ride({
      userId,
      rideName: rideName || 'Unnamed Ride',
      description: description || '',
      distance,
      elapsedTime,
      movingTime,
      averageSpeed,
      maxSpeed,
      totalElevation: totalElevation || 0,
      elevationGained: elevationGained || 0,
      gpsPath: gpsPath || [],
      segments: segments || [],
      coinsEarned,
      recordedFrom: recordedFrom || 'Mobile',
      startTime: startTime || new Date(),
      endTime: endTime || new Date(),
      activityDate: new Date(),
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

// Get logged-in user's own rides
exports.getMyRides = async (req, res) => {
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
    else if (sortBy === 'time') sort.elapsedTime = -1;
    else if (sortBy === 'coins') sort.coinsEarned = -1;

    const rides = await Ride.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip)
      .select('rideName distance elapsedTime activityDate coinsEarned averageSpeed maxSpeed elevationGained');

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
    console.error('Get my rides error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching your rides' 
    });
  }
};

// Get rides by user ID (public)
exports.getUserRides = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const rides = await Ride.find({ userId })
      .sort({ activityDate: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .select('rideName distance elapsedTime activityDate coinsEarned');

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
    console.error('Get user rides error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching rides' 
    });
  }
};

// Search rides by name
exports.searchRides = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { query, ownOnly = 'false', limit = 20 } = req.query;

    if (!query) {
      return res.status(400).json({ 
        success: false, 
        message: 'Search query is required' 
      });
    }

    let searchQuery = {
      rideName: { $regex: query, $options: 'i' }
    };

    // If ownOnly is true, filter by current user
    if (ownOnly === 'true') {
      searchQuery.userId = userId;
    }

    const rides = await Ride.find(searchQuery)
      .populate('userId', 'name city')
      .sort({ activityDate: -1 })
      .limit(parseInt(limit))
      .select('rideName distance elapsedTime activityDate coinsEarned userId');

    res.json({
      success: true,
      rides,
      count: rides.length
    });
  } catch (error) {
    console.error('Search rides error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error searching rides' 
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

    // Check if already flagged by this user - FIXED: using reportedBy
    const existingFlag = await Flag.findOne({ rideId, reportedBy: userId });
    if (existingFlag) {
      return res.status(400).json({ 
        success: false, 
        message: 'You have already flagged this ride' 
      });
    }

    // Create flag - FIXED: using reportedBy
    const flag = new Flag({
      rideId,
      reportedBy: userId,
      reason: reason || 'No reason provided'
    });

    await flag.save();

    // Mark ride as flagged
    ride.isFlagged = true;
    await ride.save();

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

// Add segment to a ride
exports.addSegment = async (req, res) => {
  try {
    const { rideId } = req.params;
    const userId = req.user.userId;
    const { 
      segmentName, 
      segmentDistance, 
      segmentTime, 
      segmentAverageSpeed, 
      segmentStartTime, 
      segmentEndTime 
    } = req.body;

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
        message: 'Not authorized to add segments to this ride' 
      });
    }

    // Add new segment
    const newSegment = {
      segmentNumber: ride.segments.length + 1,
      segmentName: segmentName || `Segment ${ride.segments.length + 1}`,
      segmentDistance,
      segmentTime,
      segmentAverageSpeed,
      segmentStartTime,
      segmentEndTime
    };

    ride.segments.push(newSegment);
    await ride.save();

    res.json({
      success: true,
      message: 'Segment added successfully',
      segment: newSegment,
      ride
    });
  } catch (error) {
    console.error('Add segment error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error adding segment' 
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
    const { rideId, mediaId } = req.params;
    const userId = req.user.userId;
    const { mediaType } = req.body; // 'photo' or 'video'

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

    // Remove media by URL
    if (mediaType === 'photo') {
      ride.photos = ride.photos.filter(url => url !== mediaId);
    } else if (mediaType === 'video') {
      ride.videos = ride.videos.filter(url => url !== mediaId);
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
const User = require('../models/User');
const Ride = require('../models/Ride');

// Get user profile by userId (for viewing other users)
exports.getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('-password -email');
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Check if user is blocked
    if (user.isBlocked) {
      return res.status(403).json({ 
        success: false, 
        message: 'This user account is blocked' 
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching user profile' 
    });
  }
};

// Get own profile (logged-in user)
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching profile' 
    });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, age, sex, height, weight, city } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (age) updateData.age = age;
    if (sex) updateData.sex = sex;
    if (height) updateData.height = height;
    if (weight) updateData.weight = weight;
    if (city) updateData.city = city;

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error updating profile' 
    });
  }
};

// Get leaderboard (top users by coins)
exports.getLeaderboard = async (req, res) => {
  try {
    const { limit = 100, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const users = await User.find({ isBlocked: false })
      .select('name city totalCoins')
      .sort({ totalCoins: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await User.countDocuments({ isBlocked: false });

    res.json({
      success: true,
      leaderboard: users,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching leaderboard' 
    });
  }
};

// Search users by name or city
exports.searchUsers = async (req, res) => {
  try {
    const { query, limit = 20 } = req.query;

    if (!query) {
      return res.status(400).json({ 
        success: false, 
        message: 'Search query is required' 
      });
    }

    const users = await User.find({
      isBlocked: false,
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { city: { $regex: query, $options: 'i' } }
      ]
    })
      .select('name city totalCoins')
      .sort({ totalCoins: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      users,
      count: users.length
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error searching users' 
    });
  }
};

// Get user statistics (rides, distance, coins, etc.)
exports.getUserStats = async (req, res) => {
  try {
    const { userId } = req.params;

    // Get user basic info
    const user = await User.findById(userId).select('name city totalCoins totalDistance distanceThisYear longestRideDistance longestRideTime maxElevationGained best10kmTime best20kmTime best25kmTime best50kmTime best75kmTime best100kmTime');
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Get ride statistics - FIXED: using correct field names
    const rides = await Ride.find({ userId });
    
    const stats = {
      totalRides: rides.length,
      totalDistance: user.totalDistance || 0,
      totalDuration: rides.reduce((sum, ride) => sum + (ride.movingTime || 0), 0), // FIXED: using movingTime
      totalCoins: user.totalCoins,
      distanceThisYear: user.distanceThisYear || 0,
      longestRideDistance: user.longestRideDistance || 0,
      longestRideTime: user.longestRideTime || 0,
      maxElevationGained: user.maxElevationGained || 0,
      bestEfforts: {
        best10km: user.best10kmTime,
        best20km: user.best20kmTime,
        best25km: user.best25kmTime,
        best50km: user.best50kmTime,
        best75km: user.best75kmTime,
        best100km: user.best100kmTime
      },
      averageSpeed: 0,
      averageDistance: 0
    };

    // Calculate averages
    if (stats.totalRides > 0) {
      stats.averageDistance = stats.totalDistance / stats.totalRides;
      if (stats.totalDuration > 0) {
        // Speed in km/h (distance in km, duration in seconds)
        stats.averageSpeed = (stats.totalDistance / (stats.totalDuration / 3600));
      }
    }

    res.json({
      success: true,
      user: {
        name: user.name,
        city: user.city
      },
      stats
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching user statistics' 
    });
  }
};

// Get all users (leaderboard with search)
exports.getAllUsers = async (req, res) => {
  try {
    const { search, limit = 50, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    let query = { isBlocked: false };

    // Add search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('name city totalCoins')
      .sort({ totalCoins: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      users,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching users' 
    });
  }
};

// Delete user account (self-deletion)
exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Delete all user's rides
    await Ride.deleteMany({ userId });

    // Delete user
    await User.findByIdAndDelete(userId);

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error deleting account' 
    });
  }
};
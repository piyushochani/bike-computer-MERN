const User = require('../models/User');
const Ride = require('../models/Ride');
const Flag = require('../models/Flag');
const AdminLog = require('../models/AdminLog');

// Helper function to log admin actions
const logAdminAction = async (action, targetId, targetType, details) => {
  try {
    await AdminLog.create({
      action,
      targetId,
      targetType,
      details,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error logging admin action:', error);
  }
};

// Get all users (admin view)
exports.getAllUsers = async (req, res) => {
  try {
    const { search, page = 1, limit = 50, includeBlocked = 'true' } = req.query;
    const skip = (page - 1) * limit;

    let query = {};

    // Filter by blocked status
    if (includeBlocked === 'false') {
      query.isBlocked = false;
    }

    // Add search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
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
    console.error('Admin get all users error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching users' 
    });
  }
};

// Get user details with rides (admin view)
exports.getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const rides = await Ride.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10);

    const rideCount = await Ride.countDocuments({ userId });

    res.json({
      success: true,
      user,
      recentRides: rides,
      totalRides: rideCount
    });
  } catch (error) {
    console.error('Admin get user details error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching user details' 
    });
  }
};

// Block user
exports.blockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    if (user.isBlocked) {
      return res.status(400).json({ 
        success: false, 
        message: 'User is already blocked' 
      });
    }

    user.isBlocked = true;
    await user.save();

    // Log admin action
    await logAdminAction(
      'BLOCK_USER',
      userId,
      'User',
      { reason: reason || 'No reason provided', userEmail: user.email }
    );

    res.json({
      success: true,
      message: 'User blocked successfully'
    });
  } catch (error) {
    console.error('Admin block user error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error blocking user' 
    });
  }
};

// Unblock user
exports.unblockUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    if (!user.isBlocked) {
      return res.status(400).json({ 
        success: false, 
        message: 'User is not blocked' 
      });
    }

    user.isBlocked = false;
    await user.save();

    // Log admin action
    await logAdminAction(
      'UNBLOCK_USER',
      userId,
      'User',
      { userEmail: user.email }
    );

    res.json({
      success: true,
      message: 'User unblocked successfully'
    });
  } catch (error) {
    console.error('Admin unblock user error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error unblocking user' 
    });
  }
};

// Get all flagged activities
exports.getFlaggedActivities = async (req, res) => {
  try {
    const { page = 1, limit = 20, resolved = 'false' } = req.query;
    const skip = (page - 1) * limit;

    const query = { resolved: resolved === 'true' };

    const flags = await Flag.find(query)
      .populate('rideId', 'rideName distance averageSpeed createdAt userId')
      .populate('flaggedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Flag.countDocuments(query);

    res.json({
      success: true,
      flags,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Admin get flagged activities error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching flagged activities' 
    });
  }
};

// Delete any ride (admin)
exports.deleteRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const { reason } = req.body;

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ 
        success: false, 
        message: 'Ride not found' 
      });
    }

    // Deduct coins from user
    await User.findByIdAndUpdate(ride.userId, {
      $inc: { totalCoins: -ride.coinsEarned }
    });

    // Log admin action
    await logAdminAction(
      'DELETE_RIDE',
      rideId,
      'Ride',
      { 
        reason: reason || 'No reason provided',
        rideName: ride.rideName,
        userId: ride.userId,
        coinsDeducted: ride.coinsEarned
      }
    );

    // Delete ride
    await Ride.findByIdAndDelete(rideId);

    // Mark related flags as resolved
    await Flag.updateMany(
      { rideId },
      { resolved: true, resolvedAt: new Date() }
    );

    res.json({
      success: true,
      message: 'Ride deleted successfully'
    });
  } catch (error) {
    console.error('Admin delete ride error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error deleting ride' 
    });
  }
};

// Resolve flag without deleting ride
exports.resolveFlag = async (req, res) => {
  try {
    const { flagId } = req.params;
    const { action } = req.body; // 'dismiss' or 'delete'

    const flag = await Flag.findById(flagId);
    if (!flag) {
      return res.status(404).json({ 
        success: false, 
        message: 'Flag not found' 
      });
    }

    if (flag.resolved) {
      return res.status(400).json({ 
        success: false, 
        message: 'Flag already resolved' 
      });
    }

    if (action === 'delete') {
      // Delete the ride
      const ride = await Ride.findById(flag.rideId);
      if (ride) {
        await User.findByIdAndUpdate(ride.userId, {
          $inc: { totalCoins: -ride.coinsEarned }
        });
        await Ride.findByIdAndDelete(flag.rideId);
      }
    }

    // Mark flag as resolved
    flag.resolved = true;
    flag.resolvedAt = new Date();
    await flag.save();

    // Log admin action
    await logAdminAction(
      'RESOLVE_FLAG',
      flagId,
      'Flag',
      { action, rideId: flag.rideId }
    );

    res.json({
      success: true,
      message: `Flag ${action === 'delete' ? 'resolved and ride deleted' : 'dismissed'} successfully`
    });
  } catch (error) {
    console.error('Admin resolve flag error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error resolving flag' 
    });
  }
};

// Get all rides (admin overview)
exports.getAllRides = async (req, res) => {
  try {
    const { page = 1, limit = 50, userId, sortBy = 'date' } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (userId) {
      query.userId = userId;
    }

    let sort = {};
    if (sortBy === 'date') sort.createdAt = -1;
    else if (sortBy === 'distance') sort.distance = -1;
    else if (sortBy === 'coins') sort.coinsEarned = -1;

    const rides = await Ride.find(query)
      .populate('userId', 'name email city')
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip);

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
    console.error('Admin get all rides error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching rides' 
    });
  }
};

// Get admin dashboard stats
exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const blockedUsers = await User.countDocuments({ isBlocked: true });
    const totalRides = await Ride.countDocuments();
    const pendingFlags = await Flag.countDocuments({ resolved: false });

    // Get recent activity
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email createdAt');

    const recentRides = await Ride.find()
      .populate('userId', 'name')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('rideName distance createdAt userId');

    res.json({
      success: true,
      stats: {
        totalUsers,
        blockedUsers,
        activeUsers: totalUsers - blockedUsers,
        totalRides,
        pendingFlags
      },
      recentActivity: {
        recentUsers,
        recentRides
      }
    });
  } catch (error) {
    console.error('Admin get dashboard stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching dashboard stats' 
    });
  }
};

// Get admin logs
exports.getAdminLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, action } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (action) {
      query.action = action;
    }

    const logs = await AdminLog.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await AdminLog.countDocuments(query);

    res.json({
      success: true,
      logs,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Admin get logs error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching admin logs' 
    });
  }
};
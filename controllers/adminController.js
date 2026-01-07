const User = require('../models/User');
const Ride = require('../models/Ride');
const Flag = require('../models/Flag');
const AdminLog = require('../models/AdminLog');

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
    const adminId = req.user.userId || req.user._id;

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

    // Log admin action - FIXED: using correct model fields
    await AdminLog.create({
      adminId,
      actionType: 'USER_BLOCKED',
      description: `Blocked user ${user.email}`,
      targetUserId: userId,
      metadata: { 
        reason: reason || 'No reason provided', 
        userEmail: user.email 
      }
    });

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
    const adminId = req.user.userId || req.user._id;

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

    // Log admin action - FIXED
    await AdminLog.create({
      adminId,
      actionType: 'USER_UNBLOCKED',
      description: `Unblocked user ${user.email}`,
      targetUserId: userId,
      metadata: { userEmail: user.email }
    });

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
    const { page = 1, limit = 20, status = 'pending' } = req.query;
    const skip = (page - 1) * limit;

    // FIXED: using status field from Flag model
    const query = { status };

    const flags = await Flag.find(query)
      .populate('rideId', 'rideName distance averageSpeed activityDate userId')
      .populate('reportedBy', 'name email')
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

// Get flag details
exports.getFlagDetails = async (req, res) => {
  try {
    const { flagId } = req.params;

    const flag = await Flag.findById(flagId)
      .populate('rideId')
      .populate('reportedBy', 'name email');

    if (!flag) {
      return res.status(404).json({ 
        success: false, 
        message: 'Flag not found' 
      });
    }

    // Get user who created the ride
    const rideUser = await User.findById(flag.rideId.userId)
      .select('name email city totalCoins');

    res.json({
      success: true,
      flag,
      rideUser
    });
  } catch (error) {
    console.error('Admin get flag details error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching flag details' 
    });
  }
};

// Review flag (delete ride and resolve)
exports.reviewFlag = async (req, res) => {
  try {
    const { flagId } = req.params;
    const { reason } = req.body;
    const adminId = req.user.userId || req.user._id;

    const flag = await Flag.findById(flagId);
    if (!flag) {
      return res.status(404).json({ 
        success: false, 
        message: 'Flag not found' 
      });
    }

    // FIXED: using status field
    if (flag.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: 'Flag already processed' 
      });
    }

    // Delete the ride
    const ride = await Ride.findById(flag.rideId);
    if (ride) {
      await User.findByIdAndUpdate(ride.userId, {
        $inc: { totalCoins: -ride.coinsEarned }
      });

      // Log admin action - FIXED
      await AdminLog.create({
        adminId,
        actionType: 'RIDE_DELETED',
        description: `Deleted flagged ride: ${ride.rideName}`,
        targetRideId: ride._id,
        targetFlagId: flagId,
        metadata: { 
          reason: reason || 'Flagged activity reviewed',
          rideName: ride.rideName,
          userId: ride.userId.toString(),
          coinsDeducted: ride.coinsEarned
        }
      });

      await Ride.findByIdAndDelete(flag.rideId);
    }

    // Mark flag as resolved - FIXED: using status and reviewedBy
    flag.status = 'resolved';
    flag.reviewedBy = adminId;
    flag.reviewedAt = new Date();
    flag.adminNotes = reason || 'Ride deleted after review';
    await flag.save();

    res.json({
      success: true,
      message: 'Flag reviewed and ride deleted successfully'
    });
  } catch (error) {
    console.error('Admin review flag error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error reviewing flag' 
    });
  }
};

// Dismiss flag without deleting ride
exports.dismissFlag = async (req, res) => {
  try {
    const { flagId } = req.params;
    const { reason } = req.body;
    const adminId = req.user.userId || req.user._id;

    const flag = await Flag.findById(flagId);
    if (!flag) {
      return res.status(404).json({ 
        success: false, 
        message: 'Flag not found' 
      });
    }

    if (flag.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: 'Flag already processed' 
      });
    }

    // Mark flag as dismissed - FIXED
    flag.status = 'dismissed';
    flag.reviewedBy = adminId;
    flag.reviewedAt = new Date();
    flag.adminNotes = reason || 'Flag dismissed without action';
    await flag.save();

    // Log admin action - FIXED
    await AdminLog.create({
      adminId,
      actionType: 'FLAG_DISMISSED',
      description: 'Dismissed flag without deleting ride',
      targetFlagId: flagId,
      metadata: { rideId: flag.rideId.toString() }
    });

    res.json({
      success: true,
      message: 'Flag dismissed successfully'
    });
  } catch (error) {
    console.error('Admin dismiss flag error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error dismissing flag' 
    });
  }
};

// Delete any ride (admin)
exports.deleteRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const { reason } = req.body;
    const adminId = req.user.userId || req.user._id;

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

    // Log admin action - FIXED
    await AdminLog.create({
      adminId,
      actionType: 'RIDE_DELETED',
      description: `Admin deleted ride: ${ride.rideName}`,
      targetRideId: rideId,
      metadata: { 
        reason: reason || 'No reason provided',
        rideName: ride.rideName,
        userId: ride.userId.toString(),
        coinsDeducted: ride.coinsEarned
      }
    });

    // Delete ride
    await Ride.findByIdAndDelete(rideId);

    // Mark related flags as resolved
    await Flag.updateMany(
      { rideId, status: 'pending' },
      { 
        status: 'resolved', 
        reviewedBy: adminId,
        reviewedAt: new Date(),
        adminNotes: 'Ride deleted by admin'
      }
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
    if (sortBy === 'date') sort.activityDate = -1;
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

// Get user rides (specific user)
exports.getUserRides = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const user = await User.findById(userId).select('name email');
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const rides = await Ride.find({ userId })
      .sort({ activityDate: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Ride.countDocuments({ userId });

    res.json({
      success: true,
      user,
      rides,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Admin get user rides error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching user rides' 
    });
  }
};

// Get admin dashboard stats
exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const blockedUsers = await User.countDocuments({ isBlocked: true });
    const totalRides = await Ride.countDocuments();
    const pendingFlags = await Flag.countDocuments({ status: 'pending' });

    // Get recent activity
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email createdAt');

    const recentRides = await Ride.find()
      .populate('userId', 'name')
      .sort({ activityDate: -1 })
      .limit(5)
      .select('rideName distance activityDate userId');

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
    const { page = 1, limit = 50, actionType } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (actionType) {
      query.actionType = actionType;
    }

    const logs = await AdminLog.find(query)
      .populate('adminId', 'email')
      .sort({ createdAt: -1 })
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

// Get recent admin logs
exports.getRecentLogs = async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const logs = await AdminLog.find()
      .populate('adminId', 'email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      logs
    });
  } catch (error) {
    console.error('Admin get recent logs error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching recent logs' 
    });
  }
};
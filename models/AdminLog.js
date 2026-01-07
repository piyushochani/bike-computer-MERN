const mongoose = require('mongoose');

const adminLogSchema = new mongoose.Schema({
  // Admin who performed the action
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Type of action performed
  actionType: {
    type: String,
    enum: [
      'USER_BLOCKED',
      'USER_UNBLOCKED',
      'RIDE_DELETED',
      'FLAG_REVIEWED',
      'FLAG_DISMISSED',
      'USER_VIEWED',
      'ACTIVITY_VIEWED'
    ],
    required: true,
    index: true
  },

  // Target user (if applicable)
  targetUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // Target ride (if applicable)
  targetRideId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ride',
    default: null
  },

  // Target flag (if applicable)
  targetFlagId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Flag',
    default: null
  },

  // Description of the action
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },

  // Additional metadata (flexible JSON)
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // IP address of admin
  ipAddress: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
adminLogSchema.index({ adminId: 1, createdAt: -1 });
adminLogSchema.index({ actionType: 1, createdAt: -1 });
adminLogSchema.index({ targetUserId: 1 });
adminLogSchema.index({ targetRideId: 1 });

// Static method to log admin action
adminLogSchema.statics.logAction = async function(logData) {
  const { adminId, actionType, description, targetUserId, targetRideId, targetFlagId, metadata, ipAddress } = logData;

  return await this.create({
    adminId,
    actionType,
    description,
    targetUserId,
    targetRideId,
    targetFlagId,
    metadata: metadata || {},
    ipAddress
  });
};

// Static method to get logs for a specific admin
adminLogSchema.statics.getAdminLogs = async function(adminId, limit = 50) {
  return await this.find({ adminId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('targetUserId', 'name email')
    .populate('targetRideId', 'rideName')
    .populate('targetFlagId');
};

// Static method to get recent logs
adminLogSchema.statics.getRecentLogs = async function(limit = 100) {
  return await this.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('adminId', 'name email')
    .populate('targetUserId', 'name email')
    .populate('targetRideId', 'rideName');
};

module.exports = mongoose.model('AdminLog', adminLogSchema);
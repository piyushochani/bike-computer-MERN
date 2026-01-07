const mongoose = require('mongoose');

const flagSchema = new mongoose.Schema({
  // Reference to flagged ride
  rideId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ride',
    required: true,
    index: true
  },

  // Who reported
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Reason for flagging
  reason: {
    type: String,
    required: [true, 'Reason for flagging is required'],
    trim: true,
    maxlength: [500, 'Reason cannot exceed 500 characters']
  },

  // Status of the flag
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
    default: 'pending',
    index: true
  },

  // Admin notes (optional)
  adminNotes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Admin notes cannot exceed 1000 characters'],
    default: ''
  },

  // Admin who reviewed
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // Review timestamp
  reviewedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
flagSchema.index({ rideId: 1, status: 1 });
flagSchema.index({ status: 1, createdAt: -1 });

// Method to mark as reviewed
flagSchema.methods.markAsReviewed = function(adminId, notes = '') {
  this.status = 'reviewed';
  this.reviewedBy = adminId;
  this.reviewedAt = new Date();
  if (notes) {
    this.adminNotes = notes;
  }
};

module.exports = mongoose.model('Flag', flagSchema);
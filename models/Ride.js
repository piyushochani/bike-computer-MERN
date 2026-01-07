const mongoose = require('mongoose');

// Segment Schema (Embedded)
const segmentSchema = new mongoose.Schema({
  segmentNumber: {
    type: Number,
    required: true
  },
  segmentName: {
    type: String,
    default: ''
  },
  segmentDistance: {
    type: Number,
    required: true,
    min: 0
  },
  segmentTime: {
    type: Number,
    required: true,
    min: 0
  },
  segmentAverageSpeed: {
    type: Number,
    required: true,
    min: 0
  },
  segmentStartTime: {
    type: Date,
    required: true
  },
  segmentEndTime: {
    type: Date,
    required: true
  }
}, { _id: true });

// GPS Point Schema (Embedded)
const gpsPointSchema = new mongoose.Schema({
  latitude: {
    type: Number,
    required: true,
    min: -90,
    max: 90
  },
  longitude: {
    type: Number,
    required: true,
    min: -180,
    max: 180
  },
  altitude: {
    type: Number,
    default: 0
  },
  timestamp: {
    type: Date,
    required: true
  }
}, { _id: false });

// Main Ride Schema
const rideSchema = new mongoose.Schema({
  // Ownership
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  isFlagged: {
    type: Boolean,
    default: false,
    index: true
  },

  // Ride Metadata
  rideName: {
    type: String,
    required: [true, 'Ride name is required'],
    trim: true,
    maxlength: [100, 'Ride name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters'],
    default: ''
  },
  activityDate: {
    type: Date,
    required: true,
    default: Date.now
  },

  // Recording Source
  recordedFrom: {
    type: String,
    enum: ['ESP32', 'Mobile', 'Laptop'],
    required: true
  },

  // Time Metrics
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  elapsedTime: {
    type: Number,
    required: true,
    min: 0
  },
  movingTime: {
    type: Number,
    required: true,
    min: 0
  },

  // Distance & Speed Metrics
  distance: {
    type: Number,
    required: true,
    min: 0
  },
  currentSpeed: {
    type: Number,
    default: 0,
    min: 0
  },
  averageSpeed: {
    type: Number,
    required: true,
    min: 0
  },
  maxSpeed: {
    type: Number,
    required: true,
    min: 0
  },

  // Elevation Metrics
  totalElevation: {
    type: Number,
    default: 0
  },
  elevationGained: {
    type: Number,
    default: 0,
    min: 0
  },

  // GPS Route
  gpsPath: {
    type: [gpsPointSchema],
    default: []
  },

  // Coins
  coinsEarned: {
    type: Number,
    default: 0,
    min: 0
  },

  // Media Uploads
  photos: {
    type: [String],
    default: []
  },
  videos: {
    type: [String],
    default: []
  },

  // Segments
  segments: {
    type: [segmentSchema],
    default: []
  }
}, {
  timestamps: true
});

// Indexes for performance
rideSchema.index({ userId: 1, activityDate: -1 });
rideSchema.index({ isFlagged: 1 });
rideSchema.index({ rideName: 'text' });

// Pre-save middleware to calculate coins
rideSchema.pre('save', function(next) {
  if (this.distance && this.averageSpeed) {
    this.coinsEarned = Math.round((this.distance * this.averageSpeed) / 2);
  }
  next();
});

// Method to add segment
rideSchema.methods.addSegment = function(segmentData) {
  const segmentNumber = this.segments.length + 1;
  this.segments.push({
    segmentNumber,
    ...segmentData
  });
};

module.exports = mongoose.model('Ride', rideSchema);
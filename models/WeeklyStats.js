const mongoose = require('mongoose');

const weeklyStatsSchema = new mongoose.Schema({
  // User reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Year and week number
  year: {
    type: Number,
    required: true,
    min: 2020,
    max: 2100
  },
  weekNumber: {
    type: Number,
    required: true,
    min: 1,
    max: 53
  },

  // Distance covered in this week
  totalDistance: {
    type: Number,
    default: 0,
    min: 0
  },

  // Total rides in this week
  totalRides: {
    type: Number,
    default: 0,
    min: 0
  },

  // Total coins earned this week
  totalCoins: {
    type: Number,
    default: 0,
    min: 0
  },

  // Total time spent riding (in seconds)
  totalMovingTime: {
    type: Number,
    default: 0,
    min: 0
  },

  // Average speed for the week
  averageSpeed: {
    type: Number,
    default: 0,
    min: 0
  },

  // Week start and end dates
  weekStartDate: {
    type: Date,
    required: true
  },
  weekEndDate: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

// Compound unique index to prevent duplicates
weeklyStatsSchema.index({ userId: 1, year: 1, weekNumber: 1 }, { unique: true });

// Index for efficient weekly queries
weeklyStatsSchema.index({ userId: 1, year: -1, weekNumber: -1 });

// Static method to get or create weekly stat
weeklyStatsSchema.statics.getOrCreate = async function(userId, date) {
  const year = date.getFullYear();
  const weekNumber = getWeekNumber(date);
  const { weekStartDate, weekEndDate } = getWeekBounds(date);

  let weeklyStat = await this.findOne({ userId, year, weekNumber });

  if (!weeklyStat) {
    weeklyStat = await this.create({
      userId,
      year,
      weekNumber,
      weekStartDate,
      weekEndDate
    });
  }

  return weeklyStat;
};

// Helper function to get ISO week number
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Helper function to get week boundaries
function getWeekBounds(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  
  const weekStartDate = new Date(d.setDate(diff));
  weekStartDate.setHours(0, 0, 0, 0);
  
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekStartDate.getDate() + 6);
  weekEndDate.setHours(23, 59, 59, 999);

  return { weekStartDate, weekEndDate };
}

module.exports = mongoose.model('WeeklyStats', weeklyStatsSchema);
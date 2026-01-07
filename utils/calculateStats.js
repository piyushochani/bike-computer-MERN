const User = require('../models/User');
const Ride = require('../models/Ride');
const WeeklyStats = require('../models/WeeklyStats');

/**
 * Calculate coins earned for a ride
 * Formula: Coins = (Distance × Average Speed) / 2
 * @param {number} distance - Distance in km
 * @param {number} averageSpeed - Average speed in km/h
 * @returns {number} Coins earned
 */
const calculateCoins = (distance, averageSpeed) => {
  return Math.round((distance * averageSpeed) / 2);
};

/**
 * Update user statistics after a ride
 * @param {string} userId - User ID
 * @param {object} ride - Ride object
 */
const updateUserStats = async (userId, ride) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    // Update total distance
    user.totalDistance += ride.distance;

    // Update distance this year
    const currentYear = new Date().getFullYear();
    const rideYear = new Date(ride.activityDate).getFullYear();
    if (rideYear === currentYear) {
      user.distanceThisYear += ride.distance;
    }

    // Update total coins
    user.totalCoins += ride.coinsEarned;

    // Update longest ride by distance
    if (ride.distance > user.longestRideDistance) {
      user.longestRideDistance = ride.distance;
    }

    // Update longest ride by time
    if (ride.movingTime > user.longestRideTime) {
      user.longestRideTime = ride.movingTime;
    }

    // Update max elevation gained
    if (ride.elevationGained > user.maxElevationGained) {
      user.maxElevationGained = ride.elevationGained;
    }

    // Check and update best efforts
    await updateBestEfforts(user, ride);

    await user.save();
    return user;
  } catch (error) {
    console.error('Error updating user stats:', error);
    throw error;
  }
};

/**
 * Update best efforts (10km, 20km, 25km, 50km, 75km, 100km)
 * @param {object} user - User object
 * @param {object} ride - Ride object
 */
const updateBestEfforts = async (user, ride) => {
  const effortDistances = [10, 20, 25, 50, 75, 100];

  effortDistances.forEach(distance => {
    // Only update if ride distance meets or exceeds the effort distance
    if (ride.distance >= distance) {
      // Calculate time for this distance based on average speed
      const timeForDistance = (distance / ride.averageSpeed) * 3600; // in seconds
      
      const effortKey = `best${distance}kmTime`;
      
      // Update if it's a new record
      if (user[effortKey] === null || timeForDistance < user[effortKey]) {
        user[effortKey] = timeForDistance;
      }
    }
  });
};

/**
 * Update weekly statistics
 * @param {string} userId - User ID
 * @param {object} ride - Ride object
 */
const updateWeeklyStats = async (userId, ride) => {
  try {
    const activityDate = new Date(ride.activityDate);
    
    // Get or create weekly stat
    const weeklyStat = await WeeklyStats.getOrCreate(userId, activityDate);

    // Update weekly totals
    weeklyStat.totalDistance += ride.distance;
    weeklyStat.totalRides += 1;
    weeklyStat.totalCoins += ride.coinsEarned;
    weeklyStat.totalMovingTime += ride.movingTime;

    // Recalculate average speed
    weeklyStat.averageSpeed = weeklyStat.totalDistance / (weeklyStat.totalMovingTime / 3600);

    await weeklyStat.save();
    return weeklyStat;
  } catch (error) {
    console.error('Error updating weekly stats:', error);
    throw error;
  }
};

/**
 * Recalculate all user statistics from scratch
 * Useful for data consistency or after deleting rides
 * @param {string} userId - User ID
 */
const recalculateUserStats = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    // Get all user rides
    const rides = await Ride.find({ userId }).sort({ activityDate: 1 });

    // Reset stats
    user.totalDistance = 0;
    user.distanceThisYear = 0;
    user.totalCoins = 0;
    user.longestRideDistance = 0;
    user.longestRideTime = 0;
    user.maxElevationGained = 0;
    user.best10kmTime = null;
    user.best20kmTime = null;
    user.best25kmTime = null;
    user.best50kmTime = null;
    user.best75kmTime = null;
    user.best100kmTime = null;

    const currentYear = new Date().getFullYear();

    // Recalculate from all rides
    for (const ride of rides) {
      user.totalDistance += ride.distance;
      user.totalCoins += ride.coinsEarned;

      const rideYear = new Date(ride.activityDate).getFullYear();
      if (rideYear === currentYear) {
        user.distanceThisYear += ride.distance;
      }

      if (ride.distance > user.longestRideDistance) {
        user.longestRideDistance = ride.distance;
      }

      if (ride.movingTime > user.longestRideTime) {
        user.longestRideTime = ride.movingTime;
      }

      if (ride.elevationGained > user.maxElevationGained) {
        user.maxElevationGained = ride.elevationGained;
      }

      await updateBestEfforts(user, ride);
    }

    await user.save();
    return user;
  } catch (error) {
    console.error('Error recalculating user stats:', error);
    throw error;
  }
};

/**
 * Get user's weekly distance data for graph
 * @param {string} userId - User ID
 * @param {number} weeks - Number of weeks to fetch (default 12)
 * @returns {array} Array of weekly data
 */
const getWeeklyGraphData = async (userId, weeks = 12) => {
  try {
    const weeklyStats = await WeeklyStats.find({ userId })
      .sort({ year: -1, weekNumber: -1 })
      .limit(weeks);

    return weeklyStats.map(stat => ({
      week: `W${stat.weekNumber}`,
      year: stat.year,
      distance: stat.totalDistance,
      rides: stat.totalRides,
      coins: stat.totalCoins,
      averageSpeed: stat.averageSpeed
    })).reverse();
  } catch (error) {
    console.error('Error getting weekly graph data:', error);
    throw error;
  }
};

/**
 * Format time in seconds to readable format
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time (e.g., "1h 30m 45s")
 */
const formatTime = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
};

/**
 * Format distance to readable format
 * @param {number} distance - Distance in km
 * @returns {string} Formatted distance
 */
const formatDistance = (distance) => {
  if (distance >= 1) {
    return `${distance.toFixed(2)} km`;
  } else {
    return `${(distance * 1000).toFixed(0)} m`;
  }
};

/**
 * Format speed to readable format
 * @param {number} speed - Speed in km/h
 * @returns {string} Formatted speed
 */
const formatSpeed = (speed) => {
  return `${speed.toFixed(2)} km/h`;
};

module.exports = {
  calculateCoins,
  updateUserStats,
  updateBestEfforts,
  updateWeeklyStats,
  recalculateUserStats,
  getWeeklyGraphData,
  formatTime,
  formatDistance,
  formatSpeed
};
const User = require('../models/User');
const Ride = require('../models/Ride');
const WeeklyStats = require('../models/WeeklyStats');
const { getWeeklyGraphData: fetchWeeklyGraphData } = require('../utils/calculateStats');
const { sendSuccess, sendError } = require('../utils/helpers');

/**
 * @desc    Get user statistics
 * @route   GET /api/stats/user/:userId
 * @access  Private
 */
const getUserStats = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('-password');

    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    const stats = {
      totalDistance: user.totalDistance,
      distanceThisYear: user.distanceThisYear,
      totalCoins: user.totalCoins,
      longestRideDistance: user.longestRideDistance,
      longestRideTime: user.longestRideTime,
      maxElevationGained: user.maxElevationGained,
      bestEfforts: {
        best10km: user.best10kmTime,
        best20km: user.best20kmTime,
        best25km: user.best25kmTime,
        best50km: user.best50kmTime,
        best75km: user.best75kmTime,
        best100km: user.best100kmTime
      }
    };

    sendSuccess(res, 200, 'User statistics retrieved successfully', stats);
  } catch (error) {
    console.error('Error getting user stats:', error);
    sendError(res, 500, 'Error retrieving user statistics');
  }
};

/**
 * @desc    Get weekly statistics
 * @route   GET /api/stats/weekly/:userId
 * @access  Private
 */
const getWeeklyStats = async (req, res) => {
  try {
    const { userId } = req.params;
    const { weeks = 12 } = req.query;

    const weeklyStats = await WeeklyStats.find({ userId })
      .sort({ year: -1, weekNumber: -1 })
      .limit(parseInt(weeks));

    sendSuccess(res, 200, 'Weekly statistics retrieved successfully', weeklyStats);
  } catch (error) {
    console.error('Error getting weekly stats:', error);
    sendError(res, 500, 'Error retrieving weekly statistics');
  }
};

/**
 * @desc    Get weekly distance graph data
 * @route   GET /api/stats/weekly-graph/:userId
 * @access  Private
 */
const getWeeklyGraphData = async (req, res) => {
  try {
    const { userId } = req.params;
    const { weeks = 12 } = req.query;

    const graphData = await fetchWeeklyGraphData(userId, parseInt(weeks));

    sendSuccess(res, 200, 'Weekly graph data retrieved successfully', graphData);
  } catch (error) {
    console.error('Error getting weekly graph data:', error);
    sendError(res, 500, 'Error retrieving weekly graph data');
  }
};

/**
 * @desc    Get best efforts
 * @route   GET /api/stats/best-efforts/:userId
 * @access  Private
 */
const getBestEfforts = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('best10kmTime best20kmTime best25kmTime best50kmTime best75kmTime best100kmTime');

    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    const bestEfforts = {
      '10km': user.best10kmTime,
      '20km': user.best20kmTime,
      '25km': user.best25kmTime,
      '50km': user.best50kmTime,
      '75km': user.best75kmTime,
      '100km': user.best100kmTime
    };

    sendSuccess(res, 200, 'Best efforts retrieved successfully', bestEfforts);
  } catch (error) {
    console.error('Error getting best efforts:', error);
    sendError(res, 500, 'Error retrieving best efforts');
  }
};

/**
 * @desc    Get longest rides
 * @route   GET /api/stats/longest-rides/:userId
 * @access  Private
 */
const getLongestRides = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('longestRideDistance longestRideTime maxElevationGained');

    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    const longestRides = {
      longestDistance: user.longestRideDistance,
      longestTime: user.longestRideTime,
      maxElevation: user.maxElevationGained
    };

    sendSuccess(res, 200, 'Longest rides retrieved successfully', longestRides);
  } catch (error) {
    console.error('Error getting longest rides:', error);
    sendError(res, 500, 'Error retrieving longest rides');
  }
};

/**
 * @desc    Get year summary
 * @route   GET /api/stats/year-summary/:userId
 * @access  Private
 */
const getYearSummary = async (req, res) => {
  try {
    const { userId } = req.params;
    const year = req.query.year || new Date().getFullYear();

    const user = await User.findById(userId);
    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    // Get rides for the year
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);

    const rides = await Ride.find({
      userId,
      activityDate: { $gte: startOfYear, $lte: endOfYear }
    });

    const summary = {
      year,
      totalRides: rides.length,
      totalDistance: user.distanceThisYear,
      totalCoins: rides.reduce((sum, ride) => sum + ride.coinsEarned, 0),
      totalMovingTime: rides.reduce((sum, ride) => sum + ride.movingTime, 0),
      averageDistance: rides.length > 0 ? user.distanceThisYear / rides.length : 0,
      longestRide: Math.max(...rides.map(r => r.distance), 0)
    };

    sendSuccess(res, 200, 'Year summary retrieved successfully', summary);
  } catch (error) {
    console.error('Error getting year summary:', error);
    sendError(res, 500, 'Error retrieving year summary');
  }
};

module.exports = {
  getUserStats,
  getWeeklyStats,
  getWeeklyGraphData,
  getBestEfforts,
  getLongestRides,
  getYearSummary
};
/**
 * Success response handler
 * @param {object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Success message
 * @param {object} data - Response data
 */
const sendSuccess = (res, statusCode = 200, message = 'Success', data = {}) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

/**
 * Error response handler
 * @param {object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 */
const sendError = (res, statusCode = 500, message = 'Server error') => {
  return res.status(statusCode).json({
    success: false,
    message
  });
};

/**
 * Calculate distance between two GPS coordinates (Haversine formula)
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
};

/**
 * Convert degrees to radians
 * @param {number} degrees - Angle in degrees
 * @returns {number} Angle in radians
 */
const toRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};

/**
 * Calculate total distance from GPS path
 * @param {array} gpsPath - Array of GPS points
 * @returns {number} Total distance in kilometers
 */
const calculateTotalDistance = (gpsPath) => {
  if (!gpsPath || gpsPath.length < 2) return 0;

  let totalDistance = 0;
  
  for (let i = 1; i < gpsPath.length; i++) {
    const dist = calculateDistance(
      gpsPath[i - 1].latitude,
      gpsPath[i - 1].longitude,
      gpsPath[i].latitude,
      gpsPath[i].longitude
    );
    totalDistance += dist;
  }

  return totalDistance;
};

/**
 * Calculate elevation gain from GPS path
 * @param {array} gpsPath - Array of GPS points with altitude
 * @returns {number} Total elevation gain in meters
 */
const calculateElevationGain = (gpsPath) => {
  if (!gpsPath || gpsPath.length < 2) return 0;

  let elevationGain = 0;
  
  for (let i = 1; i < gpsPath.length; i++) {
    const altDiff = gpsPath[i].altitude - gpsPath[i - 1].altitude;
    if (altDiff > 0) {
      elevationGain += altDiff;
    }
  }

  return elevationGain;
};

/**
 * Sanitize user input to prevent XSS
 * @param {string} input - User input string
 * @returns {string} Sanitized string
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/[<>]/g, '')
    .trim();
};

/**
 * Generate random string (for tokens, IDs, etc.)
 * @param {number} length - Length of random string
 * @returns {string} Random string
 */
const generateRandomString = (length = 32) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Paginate results
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @returns {object} Skip and limit values
 */
const paginate = (page = 1, limit = 10) => {
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  const skip = (pageNum - 1) * limitNum;
  
  return { skip, limit: limitNum, page: pageNum };
};

/**
 * Create pagination metadata
 * @param {number} total - Total number of items
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {object} Pagination metadata
 */
const createPaginationMeta = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1
  };
};

/**
 * Validate MongoDB ObjectId
 * @param {string} id - ID to validate
 * @returns {boolean} True if valid ObjectId
 */
const isValidObjectId = (id) => {
  const mongoose = require('mongoose');
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Get week number from date
 * @param {Date} date - Date object
 * @returns {number} ISO week number
 */
const getWeekNumber = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

/**
 * Get start and end of week
 * @param {Date} date - Date object
 * @returns {object} Week start and end dates
 */
const getWeekBounds = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  
  const weekStart = new Date(d.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return { weekStart, weekEnd };
};

/**
 * Get start and end of year
 * @param {number} year - Year
 * @returns {object} Year start and end dates
 */
const getYearBounds = (year) => {
  const yearStart = new Date(year, 0, 1, 0, 0, 0, 0);
  const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);
  
  return { yearStart, yearEnd };
};

/**
 * Check if user owns resource
 * @param {string} userId - User ID
 * @param {string} resourceUserId - Resource owner ID
 * @returns {boolean} True if user owns resource
 */
const isOwner = (userId, resourceUserId) => {
  return userId.toString() === resourceUserId.toString();
};

/**
 * Sleep/delay function
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after delay
 */
const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Deep clone object
 * @param {object} obj - Object to clone
 * @returns {object} Cloned object
 */
const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Remove undefined/null values from object
 * @param {object} obj - Object to clean
 * @returns {object} Cleaned object
 */
const cleanObject = (obj) => {
  const cleaned = {};
  
  for (const key in obj) {
    if (obj[key] !== null && obj[key] !== undefined) {
      cleaned[key] = obj[key];
    }
  }
  
  return cleaned;
};

module.exports = {
  sendSuccess,
  sendError,
  calculateDistance,
  calculateTotalDistance,
  calculateElevationGain,
  sanitizeInput,
  generateRandomString,
  paginate,
  createPaginationMeta,
  isValidObjectId,
  getWeekNumber,
  getWeekBounds,
  getYearBounds,
  isOwner,
  sleep,
  deepClone,
  cleanObject
};
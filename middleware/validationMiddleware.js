const { body, param, query, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }
  next();
};

// Registration validation
const validateRegistration = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  
  body('age')
    .optional()
    .isInt({ min: 13, max: 120 }).withMessage('Age must be between 13 and 120'),
  
  body('sex')
    .optional()
    .isIn(['Male', 'Female', 'Other', 'Prefer not to say']).withMessage('Invalid sex value'),
  
  body('height')
    .optional()
    .isFloat({ min: 100, max: 300 }).withMessage('Height must be between 100 and 300 cm'),
  
  body('weight')
    .optional()
    .isFloat({ min: 30, max: 300 }).withMessage('Weight must be between 30 and 300 kg'),
  
  body('city')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('City name too long'),
  
  handleValidationErrors
];

// Login validation
const validateLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Password is required'),
  
  handleValidationErrors
];

// Ride creation validation
const validateRideCreation = [
  body('rideName')
    .trim()
    .notEmpty().withMessage('Ride name is required')
    .isLength({ max: 100 }).withMessage('Ride name cannot exceed 100 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters'),
  
  body('recordedFrom')
    .notEmpty().withMessage('Recording source is required')
    .isIn(['ESP32', 'Mobile', 'Laptop']).withMessage('Invalid recording source'),
  
  body('distance')
    .notEmpty().withMessage('Distance is required')
    .isFloat({ min: 0 }).withMessage('Distance must be a positive number'),
  
  body('averageSpeed')
    .notEmpty().withMessage('Average speed is required')
    .isFloat({ min: 0 }).withMessage('Average speed must be a positive number'),
  
  body('maxSpeed')
    .notEmpty().withMessage('Max speed is required')
    .isFloat({ min: 0 }).withMessage('Max speed must be a positive number'),
  
  body('elapsedTime')
    .notEmpty().withMessage('Elapsed time is required')
    .isInt({ min: 0 }).withMessage('Elapsed time must be a positive integer'),
  
  body('movingTime')
    .notEmpty().withMessage('Moving time is required')
    .isInt({ min: 0 }).withMessage('Moving time must be a positive integer'),
  
  handleValidationErrors
];

// Update ride validation
const validateRideUpdate = [
  body('rideName')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Ride name cannot exceed 100 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters'),
  
  handleValidationErrors
];

// Flag ride validation
const validateFlagRide = [
  body('reason')
    .trim()
    .notEmpty().withMessage('Reason for flagging is required')
    .isLength({ max: 500 }).withMessage('Reason cannot exceed 500 characters'),
  
  handleValidationErrors
];

// Password reset validation
const validatePasswordReset = [
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  
  body('confirmPassword')
    .notEmpty().withMessage('Please confirm your password')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords do not match'),
  
  handleValidationErrors
];

// Email validation
const validateEmail = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  handleValidationErrors
];

// MongoDB ObjectId validation
const validateObjectId = (paramName) => [
  param(paramName)
    .isMongoId().withMessage(`Invalid ${paramName}`),
  
  handleValidationErrors
];

// Segment validation
const validateSegment = [
  body('segmentName')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Segment name cannot exceed 100 characters'),
  
  body('segmentDistance')
    .notEmpty().withMessage('Segment distance is required')
    .isFloat({ min: 0 }).withMessage('Segment distance must be positive'),
  
  body('segmentTime')
    .notEmpty().withMessage('Segment time is required')
    .isInt({ min: 0 }).withMessage('Segment time must be positive'),
  
  body('segmentAverageSpeed')
    .notEmpty().withMessage('Segment average speed is required')
    .isFloat({ min: 0 }).withMessage('Segment average speed must be positive'),
  
  handleValidationErrors
];

module.exports = {
  validateRegistration,
  validateLogin,
  validateRideCreation,
  validateRideUpdate,
  validateFlagRide,
  validatePasswordReset,
  validateEmail,
  validateObjectId,
  validateSegment,
  handleValidationErrors
};
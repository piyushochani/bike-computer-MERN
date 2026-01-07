const jwt = require('jsonwebtoken');

/**
 * Generate JWT token for user
 * @param {string} id - User ID
 * @returns {string} JWT token
 */
const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE || '30d'
    }
  );
};

/**
 * Generate token and set it in response with cookie (optional)
 * @param {object} res - Express response object
 * @param {string} id - User ID
 * @returns {string} JWT token
 */
const generateTokenAndSetCookie = (res, id) => {
  const token = generateToken(id);

  // Set cookie options
  const options = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // HTTPS in production
    sameSite: 'strict'
  };

  // Set cookie
  res.cookie('token', token, options);

  return token;
};

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {object} Decoded token payload
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

module.exports = {
  generateToken,
  generateTokenAndSetCookie,
  verifyToken
};
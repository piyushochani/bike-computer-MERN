/**
 * Email configuration object
 * Used by nodemailer transporter
 */
const emailConfig = {
  service: process.env.EMAIL_SERVICE || 'gmail',
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  },
  tls: {
    rejectUnauthorized: false // Allow self-signed certificates
  }
};

/**
 * Validate email configuration
 * @returns {boolean} True if config is valid
 */
const validateEmailConfig = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.warn('⚠️ Warning: Email credentials not configured in .env file');
    console.warn('⚠️ Email functionality will not work until EMAIL_USER and EMAIL_PASSWORD are set');
    return false;
  }
  
  console.log('✅ Email configuration validated');
  return true;
};

/**
 * Email templates configuration
 */
const emailTemplates = {
  passwordReset: {
    subject: 'Password Reset Request - Bike Tracker',
    expiryTime: 60 * 60 * 1000 // 1 hour in milliseconds
  },
  welcome: {
    subject: 'Welcome to Bike Tracker! 🚴'
  },
  accountBlocked: {
    subject: 'Your Bike Tracker Account Has Been Blocked'
  },
  accountUnblocked: {
    subject: 'Your Bike Tracker Account Has Been Unblocked'
  },
  rideDeleted: {
    subject: 'Your Ride Has Been Deleted'
  }
};

/**
 * Get email from address
 * @returns {string} Email from address
 */
const getFromEmail = () => {
  return process.env.EMAIL_FROM || process.env.EMAIL_USER;
};

/**
 * Get frontend URL for email links
 * @returns {string} Frontend URL
 */
const getFrontendUrl = () => {
  return process.env.FRONTEND_URL || 'http://localhost:3000';
};

module.exports = {
  emailConfig,
  emailTemplates,
  validateEmailConfig,
  getFromEmail,
  getFrontendUrl
};
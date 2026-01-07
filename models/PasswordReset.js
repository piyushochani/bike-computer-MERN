const mongoose = require('mongoose');
const crypto = require('crypto');

const passwordResetSchema = new mongoose.Schema({
  // User reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Reset token (hashed for security)
  resetToken: {
    type: String,
    required: true,
    unique: true
  },

  // Token expiration (typically 1 hour)
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },

  // Whether token has been used
  used: {
    type: Boolean,
    default: false
  },

  // IP address of requester (optional, for security)
  ipAddress: {
    type: String,
    default: null
  },

  // User agent (optional, for security)
  userAgent: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Index for cleanup of expired tokens
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static method to generate reset token
passwordResetSchema.statics.createResetToken = async function(userId, ipAddress = null, userAgent = null) {
  // Generate random token
  const rawToken = crypto.randomBytes(32).toString('hex');
  
  // Hash the token for storage
  const resetToken = crypto
    .createHash('sha256')
    .update(rawToken)
    .digest('hex');

  // Set expiration to 1 hour from now
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  // Delete any existing unused tokens for this user
  await this.deleteMany({ userId, used: false });

  // Create new reset token
  await this.create({
    userId,
    resetToken,
    expiresAt,
    ipAddress,
    userAgent
  });

  // Return the raw token (this is what gets sent in email)
  return rawToken;
};

// Static method to verify token
passwordResetSchema.statics.verifyToken = async function(rawToken) {
  // Hash the provided token
  const resetToken = crypto
    .createHash('sha256')
    .update(rawToken)
    .digest('hex');

  // Find the token
  const tokenDoc = await this.findOne({
    resetToken,
    used: false,
    expiresAt: { $gt: new Date() }
  }).populate('userId');

  if (!tokenDoc) {
    return null;
  }

  return tokenDoc;
};

// Method to mark token as used
passwordResetSchema.methods.markAsUsed = async function() {
  this.used = true;
  await this.save();
};

module.exports = mongoose.model('PasswordReset', passwordResetSchema);
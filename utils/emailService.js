const nodemailer = require('nodemailer');

/**
 * Create nodemailer transporter
 */
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

/**
 * Send email
 * @param {object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - Email HTML content
 * @param {string} options.text - Email plain text content
 */
const sendEmail = async (options) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `Bike Tracker <${process.env.EMAIL_FROM}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text
    };

    const info = await transporter.sendMail(mailOptions);

    console.log('Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send email');
  }
};

/**
 * Send password reset email
 * @param {string} email - User email
 * @param {string} resetToken - Password reset token
 * @param {string} userName - User name
 */
const sendPasswordResetEmail = async (email, resetToken, userName) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚴 Bike Tracker</h1>
          <p>Password Reset Request</p>
        </div>
        <div class="content">
          <h2>Hello ${userName},</h2>
          <p>You requested to reset your password. Click the button below to reset it:</p>
          <a href="${resetUrl}" class="button">Reset Password</a>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
          <p><strong>This link will expire in 1 hour.</strong></p>
          <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
        </div>
        <div class="footer">
          <p>© 2025 Bike Tracker. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    Hello ${userName},

    You requested to reset your password. 
    
    Please visit the following link to reset your password:
    ${resetUrl}

    This link will expire in 1 hour.

    If you didn't request a password reset, please ignore this email.

    - Bike Tracker Team
  `;

  await sendEmail({
    to: email,
    subject: 'Password Reset Request - Bike Tracker',
    html,
    text
  });
};

/**
 * Send welcome email to new users
 * @param {string} email - User email
 * @param {string} userName - User name
 */
const sendWelcomeEmail = async (email, userName) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚴 Welcome to Bike Tracker!</h1>
        </div>
        <div class="content">
          <h2>Hello ${userName},</h2>
          <p>Welcome to Bike Tracker! We're excited to have you on board.</p>
          <p>Track your rides, earn coins, compete on leaderboards, and improve your cycling performance.</p>
          <a href="${process.env.FRONTEND_URL}" class="button">Get Started</a>
          <p><strong>Features you'll love:</strong></p>
          <ul>
            <li>📍 GPS tracking with detailed route maps</li>
            <li>📊 Performance metrics and analytics</li>
            <li>🏆 Earn coins and compete with others</li>
            <li>📈 Track your best efforts and records</li>
            <li>📱 Record from ESP32, Mobile, or Laptop</li>
          </ul>
        </div>
        <div class="footer">
          <p>© 2025 Bike Tracker. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    Hello ${userName},

    Welcome to Bike Tracker! We're excited to have you on board.

    Track your rides, earn coins, compete on leaderboards, and improve your cycling performance.

    Visit us at: ${process.env.FRONTEND_URL}

    - Bike Tracker Team
  `;

  await sendEmail({
    to: email,
    subject: 'Welcome to Bike Tracker! 🚴',
    html,
    text
  });
};

/**
 * Send account blocked notification
 * @param {string} email - User email
 * @param {string} userName - User name
 */
const sendAccountBlockedEmail = async (email, userName) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ Account Blocked</h1>
        </div>
        <div class="content">
          <h2>Hello ${userName},</h2>
          <p>Your Bike Tracker account has been temporarily blocked by our admin team.</p>
          <p>If you believe this is a mistake or want to appeal this decision, please contact our support team.</p>
          <p>Email: support@biketracker.com</p>
        </div>
        <div class="footer">
          <p>© 2025 Bike Tracker. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    Hello ${userName},

    Your Bike Tracker account has been temporarily blocked by our admin team.

    If you believe this is a mistake, please contact: support@biketracker.com

    - Bike Tracker Team
  `;

  await sendEmail({
    to: email,
    subject: 'Your Bike Tracker Account Has Been Blocked',
    html,
    text
  });
};

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendAccountBlockedEmail
};
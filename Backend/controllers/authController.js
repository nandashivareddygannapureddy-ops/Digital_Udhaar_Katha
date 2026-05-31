const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const axios = require('axios');
const User = require('../models/User');
const { sendEmail } = require('../services/mailService');

const parseUserAgent = (uaString = '') => {
  let browser = 'Unknown Browser';
  let deviceName = 'Desktop / PC';
  
  const ua = uaString.toLowerCase();
  
  if (ua.includes('chrome') || ua.includes('chromium')) {
    browser = 'Chrome';
  } else if (ua.includes('firefox')) {
    browser = 'Firefox';
  } else if (ua.includes('safari') && !ua.includes('chrome')) {
    browser = 'Safari';
  } else if (ua.includes('edge')) {
    browser = 'Edge';
  } else if (ua.includes('opr') || ua.includes('opera')) {
    browser = 'Opera';
  }
  
  if (ua.includes('android')) {
    deviceName = 'Android Mobile';
  } else if (ua.includes('iphone')) {
    deviceName = 'iPhone';
  } else if (ua.includes('ipad')) {
    deviceName = 'iPad';
  } else if (ua.includes('windows')) {
    deviceName = 'Windows PC';
  } else if (ua.includes('macintosh') || ua.includes('mac os')) {
    deviceName = 'Mac';
  } else if (ua.includes('linux')) {
    deviceName = 'Linux Workstation';
  }
  
  return { deviceName, browser };
};

// Generate JWT
const generateToken = (id, tokenVersion = 0) => {
  return jwt.sign({ id, tokenVersion }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @desc    Register a new store owner
// @route   POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, password, storeName, phone, avatar } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    const user = await User.create({ name, email, password, storeName, phone, avatar });

    const token = generateToken(user._id, user.tokenVersion || 0);

    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        storeName: user.storeName,
        phone: user.phone,
        upiId: user.upiId || '',
        language: user.language || 'en',
        avatar: user.avatar || '',
        hasPin: user.hasPin || false,
        isBiometricEnabled: user.isBiometricEnabled || false,
        biometricCredentialId: user.biometricCredentialId || '',
      },
      token,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login store owner
// @route   POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const token = generateToken(user._id, user.tokenVersion || 0);

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        storeName: user.storeName,
        phone: user.phone,
        upiId: user.upiId || '',
        language: user.language || 'en',
        avatar: user.avatar || '',
        hasPin: user.hasPin || false,
        isBiometricEnabled: user.isBiometricEnabled || false,
        biometricCredentialId: user.biometricCredentialId || '',
      },
      token,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get logged-in user profile
// @route   GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: req.user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/me
const updateProfile = async (req, res, next) => {
  try {
    const { name, storeName, phone, upiId, language, avatar } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, storeName, phone, upiId, language, avatar },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Setup PIN and Biometrics
// @route   POST /api/auth/setup-security
const setupSecurity = async (req, res, next) => {
  try {
    const { pin, isBiometricEnabled, biometricCredentialId, biometricPublicKey } = req.body;
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (pin !== undefined) {
      user.pin = pin;
    }
    
    if (isBiometricEnabled !== undefined) {
      user.isBiometricEnabled = isBiometricEnabled;
    }
    if (biometricCredentialId !== undefined) {
      user.biometricCredentialId = biometricCredentialId;
    }
    if (biometricPublicKey !== undefined) {
      user.biometricPublicKey = biometricPublicKey;
    }

    // Auto-repair missing name or storeName in older user documents to prevent validation failures
    if (!user.name) {
      user.name = 'Google User';
    }
    if (!user.storeName) {
      user.storeName = `${user.name}'s Store`;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Security settings updated successfully',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        storeName: user.storeName,
        phone: user.phone,
        upiId: user.upiId || '',
        language: user.language || 'en',
        avatar: user.avatar || '',
        hasPin: user.hasPin,
        isBiometricEnabled: user.isBiometricEnabled,
        biometricCredentialId: user.biometricCredentialId || '',
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify PIN
// @route   POST /api/auth/verify-pin
const verifyPin = async (req, res, next) => {
  try {
    const { pin } = req.body;
    if (!pin) {
      return res.status(400).json({ success: false, message: 'Please provide PIN' });
    }

    const user = await User.findById(req.user._id).select('+pin');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await user.comparePin(pin);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect PIN' });
    }

    res.status(200).json({
      success: true,
      message: 'PIN verified successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify Password
// @route   POST /api/auth/verify-password
const verifyPassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ success: false, message: 'Please provide password' });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      // Generate a 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      user.emailOtp = otp;
      user.emailOtpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
      await user.save();

      console.log(`🔑 [SECURITY OTP] Generated Email OTP for user: ${user.email} is: ${otp}`);

      // Send verification code to email
      try {
        await sendEmail({
          to: user.email,
          subject: 'Security Verification Code - Digital Udhaar',
          text: `Hello ${user.name},\n\nYou entered an incorrect password to access your UPI ID settings.\n\nTo verify your identity and unlock the settings, please use the following 6-digit verification code:\n\n${otp}\n\nThis code is valid for 10 minutes.\n\nRegards,\nDigital Udhaar Team`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
              <h2 style="color: #ea580c; text-align: center; margin-bottom: 24px;">Security Verification Code</h2>
              <p>Hello <strong>${user.name}</strong>,</p>
              <p>You entered an incorrect password to access your UPI ID settings.</p>
              <p>To verify your identity and unlock the settings, please use the following 6-digit verification code:</p>
              <div style="text-align: center; margin: 30px 0;">
                <span style="display: inline-block; background-color: #fef2f2; border: 2px dashed #ea580c; color: #ea580c; font-size: 32px; font-weight: bold; padding: 12px 30px; letter-spacing: 4px; border-radius: 8px;">${otp}</span>
              </div>
              <p style="color: #ef4444; font-size: 13px;">This code is valid for 10 minutes. If you did not make this request, please change your password immediately.</p>
              <p style="margin-top: 30px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 15px;">Digital Udhaar Team &copy; 2026</p>
            </div>
          `
        });
      } catch (mailErr) {
        console.error("Failed to send OTP email:", mailErr);
      }

      return res.status(400).json({
        success: false,
        requireEmailOtp: true,
        message: 'Incorrect password. A verification code has been sent to your registered email address.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Password verified successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify Email OTP
// @route   POST /api/auth/verify-email-otp
const verifyEmailOtp = async (req, res, next) => {
  try {
    const { otp } = req.body;
    if (!otp) {
      return res.status(400).json({ success: false, message: 'Please provide verification code' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.emailOtp || user.emailOtp !== otp || new Date() > user.emailOtpExpires) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification code' });
    }

    // Clear OTP
    user.emailOtp = '';
    user.emailOtpExpires = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Email OTP verified successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify Biometrics
// @route   POST /api/auth/verify-biometric
const verifyBiometric = async (req, res, next) => {
  try {
    const { credentialId } = req.body;
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.isBiometricEnabled) {
      return res.status(400).json({ success: false, message: 'Biometrics not enabled for this user' });
    }

    // Verify credential ID matches
    if (user.biometricCredentialId !== credentialId) {
      return res.status(400).json({ success: false, message: 'Invalid biometric credential' });
    }

    res.status(200).json({
      success: true,
      message: 'Biometrics verified successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot Password - Request reset link
// @route   POST /api/auth/forgot-password
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide an email address' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with this email' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set to resetPasswordToken field
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set expire (10 minutes)
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    await user.save();

    // Create reset url
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

    // HTML Message
    const htmlMessage = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; padding: 20px; margin: 0; }
          .container { background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; max-width: 500px; margin: 40px auto; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
          .logo-container { text-align: center; margin-bottom: 24px; }
          .logo { display: inline-block; background-color: #ea580c; color: #ffffff !important; font-size: 20px; font-weight: bold; padding: 10px 16px; border-radius: 8px; text-decoration: none; }
          .title { font-size: 22px; font-weight: bold; color: #0f172a; text-align: center; margin-bottom: 16px; }
          .text { font-size: 15px; color: #475569; line-height: 1.6; margin-bottom: 24px; }
          .btn-container { text-align: center; margin-bottom: 24px; }
          .btn { display: inline-block; background-color: #ea580c; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 6px -1px rgba(234, 88, 12, 0.2); }
          .link-text { font-size: 13px; color: #64748b; word-break: break-all; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 16px; }
          .footer { font-size: 12px; color: #94a3b8; text-align: center; margin-top: 32px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo-container">
            <span class="logo">Digital Udhaar</span>
          </div>
          <h1 class="title">Reset Your Password</h1>
          <p class="text">Hello ${user.name},</p>
          <p class="text">You requested a password reset for your Digital Udhaar account. Click the button below to choose a new password:</p>
          <div class="btn-container">
            <a href="${resetUrl}" class="btn" target="_blank">Reset Password</a>
          </div>
          <p class="text">This link is valid for 10 minutes. If you did not request this password reset, please ignore this email and your password will remain unchanged.</p>
          <div class="link-text">
            <strong>If the button above does not work, copy and paste this URL into your browser:</strong><br/>
            <span style="color: #ea580c;">${resetUrl}</span>
          </div>
        </div>
        <div class="footer">Digital Udhaar &copy; 2026. All rights reserved.</div>
      </body>
      </html>
    `;

    // Text Message
    const textMessage = `
Hello ${user.name},

You requested a password reset for your Digital Udhaar account.
Please visit the following link to reset your password (valid for 10 minutes):

${resetUrl}

If you did not request this password reset, please ignore this email.

Digital Udhaar Team
    `;

    try {
      const result = await sendEmail({
        to: user.email,
        subject: 'Password Reset Request - Digital Udhaar',
        text: textMessage,
        html: htmlMessage,
      });

      res.status(200).json({
        success: true,
        message: 'Password reset link sent to your email address',
        resetUrl: process.env.NODE_ENV !== 'production' ? resetUrl : undefined
      });
    } catch (err) {
      user.resetPasswordToken = '';
      user.resetPasswordExpire = undefined;
      await user.save();

      return res.status(500).json({
        success: false,
        message: 'Email could not be sent. Please try again later.'
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Reset Password
// @route   POST /api/auth/reset-password/:token
const resetPassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ success: false, message: 'Please provide a new password' });
    }

    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    // Set new password (pre-save hook hashes it)
    user.password = password;
    user.resetPasswordToken = '';
    user.resetPasswordExpire = undefined;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Emergency Lock: Invalidate all sessions and force password reset
// @route   POST /api/auth/emergency-lock
const emergencyLock = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // 1. Force password reset (change password to a random, extremely secure string)
    const randomPassword = crypto.randomBytes(32).toString('hex');
    user.password = randomPassword;

    // 2. Invalidate all active tokens by incrementing tokenVersion
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    // 3. Send warning email
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #ef4444; border-radius: 12px; background-color: #fef2f2;">
        <h2 style="color: #dc2626; text-align: center; margin-bottom: 24px;">🚨 EMERGENCY LOCK ACTIVATED</h2>
        <p>Hello <strong>${user.name}</strong>,</p>
        <p>You have activated the **Emergency Lock** for your Digital Udhaar store account (<strong>${user.storeName}</strong>).</p>
        
        <div style="background-color: #ffffff; padding: 15px; border-left: 4px solid #dc2626; border-radius: 4px; margin: 20px 0;">
          <p style="margin: 0; font-weight: bold; color: #dc2626;">Actions Taken:</p>
          <ul style="margin: 5px 0 0 20px; padding: 0; color: #4b5563;">
            <li>All active sessions on all devices have been logged out immediately.</li>
            <li>Your account password has been locked and reset.</li>
          </ul>
        </div>
        
        <p>To access your account again, you must perform a **Password Reset** using the Forgot Password page.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/forgot-password" style="display: inline-block; background-color: #dc2626; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold;">Reset Password Now</a>
        </div>
        
        <p style="font-size: 12px; color: #94a3b8; border-top: 1px solid #fee2e2; padding-top: 15px; text-align: center;">Digital Udhaar Team &copy; 2026</p>
      </div>
    `;

    try {
      await sendEmail({
        to: user.email,
        subject: '🚨 EMERGENCY LOCK ACTIVATED - Digital Udhaar',
        text: `Hello ${user.name},\n\nEmergency Lock has been activated on your account. All devices have been logged out, and your password has been reset. To recover your account, click the link to reset your password:\n\n${process.env.FRONTEND_URL || 'http://localhost:5173'}/forgot-password`,
        html: emailHtml
      });
    } catch (mailErr) {
      console.error('Failed to send Emergency Lock notification:', mailErr);
    }

    res.status(200).json({
      success: true,
      message: 'Emergency Lock activated successfully. All devices logged out and password locked.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login or register store owner via Google
// @route   POST /api/auth/google
const googleLogin = async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Google Access Token is required',
      });
    }

    // Verify access token with Google
    let googleUser;
    try {
      const response = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      googleUser = response.data;
    } catch (err) {
      console.error('Error verifying Google Token:', err.message);
      return res.status(401).json({
        success: false,
        message: 'Invalid Google Access Token',
      });
    }

    const { email, name, picture } = googleUser;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Google account does not have an email associated',
      });
    }

    // Find or create user
    let user = await User.findOne({ email });
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      user = await User.create({
        name: name || 'Google User',
        email,
        password: crypto.randomBytes(16).toString('hex'), // Random password for schema validation
        storeName: `${name || 'My'}'s Store`,
        phone: '',
        avatar: picture || '',
      });
    }

    // Record login activity
    const ua = req.headers['user-agent'] || '';
    const { deviceName, browser } = parseUserAgent(ua);
    const ipAddress = req.ip || req.connection.remoteAddress || '127.0.0.1';
    
    user.loginActivities = user.loginActivities || [];
    user.loginActivities.unshift({
      deviceName,
      browser,
      loginTime: new Date(),
      ipAddress,
      location: 'Google Sign-In'
    });
    
    // Limit to 20 activities
    if (user.loginActivities.length > 20) {
      user.loginActivities = user.loginActivities.slice(0, 20);
    }

    // Auto-repair missing name or storeName in older user documents to prevent validation failures
    if (!user.name) {
      user.name = 'Google User';
    }
    if (!user.storeName) {
      user.storeName = `${user.name}'s Store`;
    }
    
    await user.save();

    const jwtToken = generateToken(user._id, user.tokenVersion || 0);

    res.status(isNewUser ? 201 : 200).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        storeName: user.storeName,
        phone: user.phone,
        upiId: user.upiId || '',
        language: user.language || 'en',
        avatar: user.avatar || '',
        hasPin: user.hasPin || false,
        isBiometricEnabled: user.isBiometricEnabled || false,
        biometricCredentialId: user.biometricCredentialId || '',
      },
      token: jwtToken,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mock login or register store owner via Google
// @route   POST /api/auth/google-mock
const googleLoginMock = async (req, res, next) => {
  try {
    const { email, name, avatar } = req.body;

    if (!email || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email and Name are required for Google Mock Sign-In',
      });
    }

    // Find or create user
    let user = await User.findOne({ email });
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      user = await User.create({
        name,
        email,
        password: crypto.randomBytes(16).toString('hex'),
        storeName: `${name}'s Store`,
        phone: '',
        avatar: avatar || '',
      });
    }

    // Record login activity
    const ua = req.headers['user-agent'] || '';
    const { deviceName, browser } = parseUserAgent(ua);
    const ipAddress = req.ip || req.connection.remoteAddress || '127.0.0.1';
    
    user.loginActivities = user.loginActivities || [];
    user.loginActivities.unshift({
      deviceName,
      browser,
      loginTime: new Date(),
      ipAddress,
      location: 'Google Sign-In (Simulated)'
    });
    
    if (user.loginActivities.length > 20) {
      user.loginActivities = user.loginActivities.slice(0, 20);
    }

    // Auto-repair missing name or storeName in older user documents to prevent validation failures
    if (!user.name) {
      user.name = name || 'Google User';
    }
    if (!user.storeName) {
      user.storeName = `${user.name}'s Store`;
    }
    
    await user.save();

    const jwtToken = generateToken(user._id, user.tokenVersion || 0);

    res.status(isNewUser ? 201 : 200).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        storeName: user.storeName,
        phone: user.phone,
        upiId: user.upiId || '',
        language: user.language || 'en',
        avatar: user.avatar || '',
        hasPin: user.hasPin || false,
        isBiometricEnabled: user.isBiometricEnabled || false,
        biometricCredentialId: user.biometricCredentialId || '',
      },
      token: jwtToken,
    });
  } catch (error) {
    next(error);
  }
};



// @desc    Get recent login activities
// @route   GET /api/auth/login-activities
const getLoginActivities = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      data: user.loginActivities || []
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { 
  register, 
  login, 
  googleLogin,
  googleLoginMock,
  getMe, 
  updateProfile, 
  setupSecurity, 
  verifyPin, 
  verifyPassword,
  verifyEmailOtp,
  verifyBiometric,
  forgotPassword,
  resetPassword,
  emergencyLock,
  getLoginActivities
};

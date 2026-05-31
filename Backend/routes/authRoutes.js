const express = require('express');
const router = express.Router();
const { 
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
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.post('/google-mock', googleLoginMock);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.get('/me', protect, getMe);
router.put('/me', protect, updateProfile);
router.post('/setup-security', protect, setupSecurity);
router.post('/verify-pin', protect, verifyPin);
router.post('/verify-password', protect, verifyPassword);
router.post('/verify-email-otp', protect, verifyEmailOtp);
router.post('/verify-biometric', protect, verifyBiometric);
router.post('/emergency-lock', protect, emergencyLock);
router.get('/login-activities', protect, getLoginActivities);

module.exports = router;

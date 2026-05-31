const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    storeName: {
      type: String,
      required: [true, 'Store name is required'],
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    upiId: {
      type: String,
      trim: true,
      default: '',
      // Merchant's UPI VPA for collection links (e.g., store@upi)
    },
    language: {
      type: String,
      enum: ['en', 'hi'],
      default: 'en',
    },
    avatar: {
      type: String,
      default: '',
    },
    pin: {
      type: String,
      select: false,
    },
    hasPin: {
      type: Boolean,
      default: false,
    },
    isBiometricEnabled: {
      type: Boolean,
      default: false,
    },
    biometricCredentialId: {
      type: String,
      default: '',
    },
    biometricPublicKey: {
      type: String,
      default: '',
    },
    resetPasswordToken: {
      type: String,
      default: '',
    },
    resetPasswordExpire: {
      type: Date,
    },
    emailOtp: {
      type: String,
      default: '',
    },
    emailOtpExpires: {
      type: Date,
    },
    tokenVersion: {
      type: Number,
      default: 0,
    },
    loginActivities: [
      {
        deviceName: { type: String, default: 'Unknown' },
        browser: { type: String, default: 'Unknown' },
        loginTime: { type: Date, default: Date.now },
        ipAddress: { type: String, default: '127.0.0.1' },
        location: { type: String, default: 'Localhost' },
      }
    ],
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password and PIN before saving
userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
  }
  if (this.isModified('pin')) {
    const salt = await bcrypt.genSalt(12);
    this.pin = await bcrypt.hash(this.pin, salt);
    this.hasPin = true;
  }
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Compare PIN method
userSchema.methods.comparePin = async function (candidatePin) {
  if (!this.pin) return false;
  return await bcrypt.compare(candidatePin, this.pin);
};

module.exports = mongoose.model('User', userSchema);

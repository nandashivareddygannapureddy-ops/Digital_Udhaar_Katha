const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      default: '',
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    balance: {
      type: Number,
      default: 0,
      // Positive = customer owes money (udhaar)
      // Negative = store owes customer (advance payment)
    },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'low',
    },
    creditScore: {
      type: Number,
      default: 750,
    },
    duePrediction: {
      type: String,
      enum: ['trusted', 'delay', 'risky'],
      default: 'trusted',
    },
    totalTransactions: {
      type: Number,
      default: 0,
    },
    lastPaymentDate: {
      type: Date,
      default: null,
    },
    paymentDueDate: {
      type: Date,
      default: null,
    },
    lastAutoReminderSentDate: {
      type: Date,
      default: null,
    },
    avatar: {
      type: String,
      default: '',
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries by owner
customerSchema.index({ owner: 1, name: 1 });

module.exports = mongoose.model('Customer', customerSchema);

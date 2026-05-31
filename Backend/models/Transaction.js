const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['credit', 'debit'],
      required: [true, 'Transaction type is required'],
      // credit = customer took goods on udhaar (balance increases)
      // debit  = customer paid back (balance decreases)
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    billImageUrl: {
      type: String,
      default: '',
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'SETTLED'],
      default: 'PENDING',
    },
    paymentMode: {
      type: String,
      enum: ['cash', 'upi', 'online', 'none'],
      default: 'none',
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for queries
transactionSchema.index({ customer: 1, date: -1 });
transactionSchema.index({ owner: 1, date: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);

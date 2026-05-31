const mongoose = require('mongoose');

const customerHistorySchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    customerName: {
      type: String,
      required: true,
    },
    customerPhone: {
      type: String,
      default: '',
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    type: {
      type: String,
      enum: ['credit', 'debit', 'customer_created', 'customer_deleted'],
      required: true,
    },
    amount: {
      type: Number,
      default: 0,
    },
    description: {
      type: String,
      default: '',
    },
    date: {
      type: Date,
      default: Date.now,
    },
    action: {
      type: String,
      enum: ['CREATE', 'UPDATE', 'DELETE', 'CUSTOMER_DELETED'],
      required: true,
    }
  },
  {
    timestamps: true,
  }
);

customerHistorySchema.index({ owner: 1, customerId: 1 });
customerHistorySchema.index({ customerPhone: 1 });
customerHistorySchema.index({ date: -1 });

module.exports = mongoose.model('CustomerHistory', customerHistorySchema);

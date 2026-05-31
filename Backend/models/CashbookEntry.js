const mongoose = require('mongoose');

const cashbookEntrySchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['in', 'out'],
      required: [true, 'Cashbook entry type is required'],
      // in = cash came in (cash got)
      // out = cash went out (cash paid/gave)
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
    paymentMode: {
      type: String,
      enum: ['cash', 'online'],
      default: 'cash',
    },
    category: {
      type: String,
      trim: true,
      default: 'Other',
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

// Index for queries by owner and date
cashbookEntrySchema.index({ owner: 1, date: -1 });

module.exports = mongoose.model('CashbookEntry', cashbookEntrySchema);

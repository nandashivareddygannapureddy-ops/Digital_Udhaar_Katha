const mongoose = require('mongoose');

const backupSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true // Only keep the latest backup per user
    },
    version: {
      type: String,
      default: '1.0'
    },
    exportedAt: {
      type: Date,
      default: Date.now
    },
    storeName: {
      type: String,
      required: true
    },
    data: {
      customers: { type: Array, default: [] },
      transactions: { type: Array, default: [] },
      cashbookEntries: { type: Array, default: [] },
      customerHistory: { type: Array, default: [] }
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Backup', backupSchema);

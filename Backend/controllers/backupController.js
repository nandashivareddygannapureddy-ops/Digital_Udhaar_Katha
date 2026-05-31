const Customer = require('../models/Customer');
const Transaction = require('../models/Transaction');
const CashbookEntry = require('../models/CashbookEntry');
const CustomerHistory = require('../models/CustomerHistory');
const Backup = require('../models/Backup');
const { sendEmail } = require('../services/mailService');

// @desc    Export all store data to a backup JSON
// @route   POST /api/backup/create
const createBackup = async (req, res, next) => {
  try {
    const ownerId = req.user._id;

    // Fetch all user's data
    const customers = await Customer.find({ owner: ownerId });
    const transactions = await Transaction.find({ owner: ownerId });
    const cashbookEntries = await CashbookEntry.find({ owner: ownerId });
    const customerHistory = await CustomerHistory.find({ owner: ownerId });

    const backupPayload = {
      version: '1.0',
      exportedAt: new Date(),
      storeName: req.user.storeName,
      data: {
        customers,
        transactions,
        cashbookEntries,
        customerHistory
      }
    };

    // Calculate approximate size
    const payloadStr = JSON.stringify(backupPayload);
    const sizeBytes = Buffer.byteLength(payloadStr, 'utf8');
    const sizeKB = (sizeBytes / 1024).toFixed(2);

    // Send confirmation email
    const emailSubject = 'Data Backup Successful - Digital Udhaar';
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #fcfcfc;">
        <h2 style="color: #ea580c; text-align: center; margin-bottom: 24px;">📁 Data Backup Completed</h2>
        <p>Hello <strong>${req.user.name}</strong>,</p>
        <p>Your data backup was created successfully for <strong>${req.user.storeName}</strong>.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
          <tr style="border-bottom: 1px solid #e2e8f0; text-align: left;">
            <th style="padding: 8px 0; color: #64748b;">Metric</th>
            <th style="padding: 8px 0; text-align: right; color: #0f172a;">Count</th>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #475569;">Total Customers</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #0f172a;">${customers.length}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #475569;">Total Ledger Transactions</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #0f172a;">${transactions.length}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #475569;">Cashbook Entries</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #0f172a;">${cashbookEntries.length}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #475569;">Backup Size</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #ea580c;">${sizeKB} KB</td>
          </tr>
        </table>
        
        <p style="font-size: 13px; color: #64748b;">We recommend downloading the backup JSON file and storing it in a safe place. You can use it to restore your data at any time.</p>
        <p style="margin-top: 30px; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; text-align: center;">Digital Udhaar Team &copy; 2026</p>
      </div>
    `;

    try {
      await sendEmail({
        to: req.user.email,
        subject: emailSubject,
        text: `Hello ${req.user.name},\n\nYour data backup was created successfully.\n\nSummary:\n- Customers: ${customers.length}\n- Transactions: ${transactions.length}\n- Cashbook Entries: ${cashbookEntries.length}\n- Size: ${sizeKB} KB\n\nRegards,\nDigital Udhaar Team`,
        html: emailHtml
      });
    } catch (mailErr) {
      console.error('Error sending backup creation confirmation email:', mailErr);
    }

    res.status(200).json({
      success: true,
      message: 'Backup created successfully and confirmation email sent.',
      filename: `udhaar_backup_${req.user.storeName.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}.json`,
      payload: backupPayload
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Restore store data from a backup JSON
// @route   POST /api/backup/restore
const restoreBackup = async (req, res, next) => {
  try {
    const ownerId = req.user._id;
    const { backupData } = req.body;

    if (!backupPayloadIsValid(backupData)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid backup file format. Please upload a valid Digital Udhaar backup file.'
      });
    }

    const { customers, transactions, cashbookEntries, customerHistory } = backupData.data;

    // Clear existing data for this user
    await Customer.deleteMany({ owner: ownerId });
    await Transaction.deleteMany({ owner: ownerId });
    await CashbookEntry.deleteMany({ owner: ownerId });
    await CustomerHistory.deleteMany({ owner: ownerId });

    // Restore Customers (preserving IDs and set current owner)
    if (customers && customers.length > 0) {
      const preparedCustomers = customers.map(c => ({
        ...c,
        owner: ownerId
      }));
      await Customer.insertMany(preparedCustomers);
    }

    // Restore Transactions
    if (transactions && transactions.length > 0) {
      const preparedTransactions = transactions.map(t => ({
        ...t,
        owner: ownerId
      }));
      await Transaction.insertMany(preparedTransactions);
    }

    // Restore Cashbook Entries
    if (cashbookEntries && cashbookEntries.length > 0) {
      const preparedEntries = cashbookEntries.map(e => ({
        ...e,
        owner: ownerId
      }));
      await CashbookEntry.insertMany(preparedEntries);
    }

    // Restore Customer History
    if (customerHistory && customerHistory.length > 0) {
      const preparedHistory = customerHistory.map(h => ({
        ...h,
        owner: ownerId
      }));
      await CustomerHistory.insertMany(preparedHistory);
    }

    // Send confirmation email
    const emailSubject = 'Database Restored Successfully - Digital Udhaar';
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #fcfcfc;">
        <h2 style="color: #22c55e; text-align: center; margin-bottom: 24px;">🔄 Database Restored Successfully</h2>
        <p>Hello <strong>${req.user.name}</strong>,</p>
        <p>Your store data has been successfully restored from the backup file for <strong>${req.user.storeName}</strong>.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
          <tr style="border-bottom: 1px solid #e2e8f0; text-align: left;">
            <th style="padding: 8px 0; color: #64748b;">Metric</th>
            <th style="padding: 8px 0; text-align: right; color: #0f172a;">Restored Count</th>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #475569;">Customers Restored</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #0f172a;">${customers?.length || 0}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #475569;">Transactions Restored</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #0f172a;">${transactions?.length || 0}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #475569;">Cashbook Entries Restored</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #0f172a;">${cashbookEntries?.length || 0}</td>
          </tr>
        </table>
        
        <p style="font-size: 13px; color: #ef4444; font-weight: bold;">If you did not perform this restore operation, please secure your account immediately by changing your password.</p>
        <p style="margin-top: 30px; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; text-align: center;">Digital Udhaar Team &copy; 2026</p>
      </div>
    `;

    try {
      await sendEmail({
        to: req.user.email,
        subject: emailSubject,
        text: `Hello ${req.user.name},\n\nYour database was successfully restored.\n\nSummary:\n- Customers restored: ${customers?.length || 0}\n- Transactions restored: ${transactions?.length || 0}\n- Cashbook entries restored: ${cashbookEntries?.length || 0}\n\nRegards,\nDigital Udhaar Team`,
        html: emailHtml
      });
    } catch (mailErr) {
      console.error('Error sending backup restore confirmation email:', mailErr);
    }

    res.status(200).json({
      success: true,
      message: 'Database restored successfully from backup.',
      summary: {
        customers: customers?.length || 0,
        transactions: transactions?.length || 0,
        cashbookEntries: cashbookEntries?.length || 0
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check last cloud backup status
// @route   GET /api/backup/status
const getBackupStatus = async (req, res, next) => {
  try {
    const ownerId = req.user._id;
    const backup = await Backup.findOne({ owner: ownerId }).select('updatedAt storeName version data');
    if (!backup) {
      return res.status(200).json({
        success: true,
        hasBackup: false,
        backupInfo: null
      });
    }

    res.status(200).json({
      success: true,
      hasBackup: true,
      backupInfo: {
        updatedAt: backup.updatedAt,
        storeName: backup.storeName,
        version: backup.version,
        customersCount: backup.data?.customers?.length || 0,
        transactionsCount: backup.data?.transactions?.length || 0,
        cashbookCount: backup.data?.cashbookEntries?.length || 0,
        historyCount: backup.data?.customerHistory?.length || 0
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create cloud backup
// @route   POST /api/backup/cloud-create
const createCloudBackup = async (req, res, next) => {
  try {
    const ownerId = req.user._id;

    // Fetch all user's data
    const customers = await Customer.find({ owner: ownerId });
    const transactions = await Transaction.find({ owner: ownerId });
    const cashbookEntries = await CashbookEntry.find({ owner: ownerId });
    const customerHistory = await CustomerHistory.find({ owner: ownerId });

    const backupData = {
      customers,
      transactions,
      cashbookEntries,
      customerHistory
    };

    // Save or update Backup in DB
    const backup = await Backup.findOneAndUpdate(
      { owner: ownerId },
      {
        storeName: req.user.storeName,
        version: '1.0',
        exportedAt: new Date(),
        data: backupData
      },
      { new: true, upsert: true }
    );

    // Calculate approximate size
    const payloadStr = JSON.stringify(backupData);
    const sizeBytes = Buffer.byteLength(payloadStr, 'utf8');
    const sizeKB = (sizeBytes / 1024).toFixed(2);

    // Send confirmation email
    const emailSubject = 'Cloud Data Backup Successful - Digital Udhaar';
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #fcfcfc;">
        <h2 style="color: #ea580c; text-align: center; margin-bottom: 24px;">☁️ Cloud Data Backup Completed</h2>
        <p>Hello <strong>${req.user.name}</strong>,</p>
        <p>Your data was successfully backed up to our secure cloud for <strong>${req.user.storeName}</strong>.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
          <tr style="border-bottom: 1px solid #e2e8f0; text-align: left;">
            <th style="padding: 8px 0; color: #64748b;">Metric</th>
            <th style="padding: 8px 0; text-align: right; color: #0f172a;">Count</th>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #475569;">Total Customers</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #0f172a;">${customers.length}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #475569;">Total Ledger Transactions</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #0f172a;">${transactions.length}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #475569;">Cashbook Entries</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #0f172a;">${cashbookEntries.length}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #475569;">Backup Size</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #ea580c;">${sizeKB} KB</td>
          </tr>
        </table>
        
        <p style="font-size: 13px; color: #64748b;">Your backup is stored securely in the cloud. You can restore your data with a single click from your settings panel at any time.</p>
        <p style="margin-top: 30px; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; text-align: center;">Digital Udhaar Team &copy; 2026</p>
      </div>
    `;

    try {
      await sendEmail({
        to: req.user.email,
        subject: emailSubject,
        text: `Hello ${req.user.name},\n\nYour cloud backup was created successfully.\n\nSummary:\n- Customers: ${customers.length}\n- Transactions: ${transactions.length}\n- Cashbook Entries: ${cashbookEntries.length}\n- Size: ${sizeKB} KB\n\nRegards,\nDigital Udhaar Team`,
        html: emailHtml
      });
    } catch (mailErr) {
      console.error('Error sending cloud backup creation confirmation email:', mailErr);
    }

    res.status(200).json({
      success: true,
      message: 'Cloud backup created successfully and confirmation email sent.',
      backupInfo: {
        updatedAt: backup.updatedAt,
        storeName: backup.storeName,
        version: backup.version,
        customersCount: customers.length,
        transactionsCount: transactions.length,
        cashbookCount: cashbookEntries.length,
        historyCount: customerHistory.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Restore store data from cloud backup
// @route   POST /api/backup/cloud-restore
const restoreCloudBackup = async (req, res, next) => {
  try {
    const ownerId = req.user._id;

    // Fetch the backup from DB
    const backup = await Backup.findOne({ owner: ownerId });
    if (!backup) {
      return res.status(404).json({
        success: false,
        message: 'No cloud backup found for your account. Please create a backup first.'
      });
    }

    const { customers, transactions, cashbookEntries, customerHistory } = backup.data;

    // Clear existing data for this user
    await Customer.deleteMany({ owner: ownerId });
    await Transaction.deleteMany({ owner: ownerId });
    await CashbookEntry.deleteMany({ owner: ownerId });
    await CustomerHistory.deleteMany({ owner: ownerId });

    // Restore Customers
    if (customers && customers.length > 0) {
      const preparedCustomers = customers.map(c => ({
        ...c,
        owner: ownerId
      }));
      await Customer.insertMany(preparedCustomers);
    }

    // Restore Transactions
    if (transactions && transactions.length > 0) {
      const preparedTransactions = transactions.map(t => ({
        ...t,
        owner: ownerId
      }));
      await Transaction.insertMany(preparedTransactions);
    }

    // Restore Cashbook Entries
    if (cashbookEntries && cashbookEntries.length > 0) {
      const preparedEntries = cashbookEntries.map(e => ({
        ...e,
        owner: ownerId
      }));
      await CashbookEntry.insertMany(preparedEntries);
    }

    // Restore Customer History
    if (customerHistory && customerHistory.length > 0) {
      const preparedHistory = customerHistory.map(h => ({
        ...h,
        owner: ownerId
      }));
      await CustomerHistory.insertMany(preparedHistory);
    }

    // Send confirmation email
    const emailSubject = 'Database Restored from Cloud Successfully - Digital Udhaar';
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #fcfcfc;">
        <h2 style="color: #22c55e; text-align: center; margin-bottom: 24px;">🔄 Cloud Database Restored Successfully</h2>
        <p>Hello <strong>${req.user.name}</strong>,</p>
        <p>Your store data has been successfully restored from your cloud backup for <strong>${req.user.storeName}</strong>.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
          <tr style="border-bottom: 1px solid #e2e8f0; text-align: left;">
            <th style="padding: 8px 0; color: #64748b;">Metric</th>
            <th style="padding: 8px 0; text-align: right; color: #0f172a;">Restored Count</th>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #475569;">Customers Restored</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #0f172a;">${customers?.length || 0}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #475569;">Transactions Restored</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #0f172a;">${transactions?.length || 0}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #475569;">Cashbook Entries Restored</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #0f172a;">${cashbookEntries?.length || 0}</td>
          </tr>
        </table>
        
        <p style="font-size: 13px; color: #ef4444; font-weight: bold;">If you did not perform this restore operation, please secure your account immediately by changing your password.</p>
        <p style="margin-top: 30px; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; text-align: center;">Digital Udhaar Team &copy; 2026</p>
      </div>
    `;

    try {
      await sendEmail({
        to: req.user.email,
        subject: emailSubject,
        text: `Hello ${req.user.name},\n\nYour database was successfully restored from your cloud backup.\n\nSummary:\n- Customers restored: ${customers?.length || 0}\n- Transactions restored: ${transactions?.length || 0}\n- Cashbook entries restored: ${cashbookEntries?.length || 0}\n\nRegards,\nDigital Udhaar Team`,
        html: emailHtml
      });
    } catch (mailErr) {
      console.error('Error sending cloud backup restore confirmation email:', mailErr);
    }

    res.status(200).json({
      success: true,
      message: 'Database restored successfully from cloud backup.',
      summary: {
        customers: customers?.length || 0,
        transactions: transactions?.length || 0,
        cashbookEntries: cashbookEntries?.length || 0
      }
    });
  } catch (error) {
    next(error);
  }
};

// Helper to validate the backup structure
const backupPayloadIsValid = (payload) => {
  if (!payload || typeof payload !== 'object') return false;
  if (payload.version !== '1.0') return false;
  if (!payload.data || typeof payload.data !== 'object') return false;
  
  const { customers, transactions } = payload.data;
  if (!Array.isArray(customers) || !Array.isArray(transactions)) return false;
  
  return true;
};

module.exports = {
  createBackup,
  restoreBackup,
  getBackupStatus,
  createCloudBackup,
  restoreCloudBackup
};

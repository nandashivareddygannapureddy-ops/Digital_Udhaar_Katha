const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const Customer = require('../models/Customer');
const Transaction = require('../models/Transaction');

const repairBalances = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/udhaar-khata');
    console.log('Connected successfully.');

    const customers = await Customer.find({});
    console.log(`Found ${customers.length} customers. Recalculating balances...`);

    for (const customer of customers) {
      // Get all transactions for this customer
      const transactions = await Transaction.find({ customer: customer._id });

      let totalPendingCredit = 0;
      let totalDebit = 0;

      for (const txn of transactions) {
        if (txn.type === 'credit') {
          if (txn.paymentStatus === 'PENDING') {
            totalPendingCredit += txn.amount;
          }
        } else if (txn.type === 'debit') {
          totalDebit += txn.amount;
        }
      }

      const newBalance = totalPendingCredit - totalDebit;
      const oldBalance = customer.balance;

      if (oldBalance !== newBalance) {
        customer.balance = newBalance;
        // Also recalculate risk level
        if (newBalance <= 0) {
          customer.riskLevel = 'low';
        } else if (newBalance > 50000) {
          customer.riskLevel = 'high';
        } else if (newBalance > 15000) {
          customer.riskLevel = 'medium';
        } else {
          customer.riskLevel = 'low';
        }
        
        await customer.save();
        console.log(`✅ Fixed customer [${customer.name}]: Balance changed from ₹${oldBalance} to ₹${newBalance}`);
      } else {
        console.log(`ℹ️ Customer [${customer.name}] balance is already correct (₹${newBalance})`);
      }
    }

    console.log('All customer balances verified and repaired successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error during repair:', error);
    process.exit(1);
  }
};

repairBalances();

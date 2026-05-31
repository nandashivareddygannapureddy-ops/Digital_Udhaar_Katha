const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Transaction = require('../models/Transaction');
const Customer = require('../models/Customer');

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/digital-udhaar');
    console.log('Connected to MongoDB');

    const customers = await Customer.find({});
    console.log(`Found ${customers.length} customers:`);
    customers.forEach(c => {
      console.log({ id: c._id, name: c.name, phone: c.phone, balance: c.balance });
    });

    const txs = await Transaction.find({}).sort({ date: -1 }).limit(10);
    console.log(`Found ${txs.length} recent transactions:`);
    txs.forEach(t => {
      console.log({
        id: t._id,
        customer: t.customer,
        type: t.type,
        amount: t.amount,
        description: t.description,
        paymentStatus: t.paymentStatus,
        paymentMode: t.paymentMode,
        date: t.date
      });
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

run();

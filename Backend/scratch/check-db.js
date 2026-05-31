const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Customer = require('../models/Customer');

const checkDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/udhaar-khata');
    const customers = await Customer.find({});
    console.log('--- CUSTOMERS DB STATUS ---');
    customers.forEach(c => {
      console.log(`Name: ${c.name} | Balance: ${c.balance} | Status: ${c.balance > 0 ? 'DUE' : c.balance < 0 ? 'ADVANCE' : 'CLEAR'}`);
    });
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

checkDB();

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Customer = require('../models/Customer');
const { updateRiskLevel } = require('../services/riskService');

const runMigration = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/udhaar-khata';
    console.log('Connecting to MongoDB:', mongoUri);
    await mongoose.connect(mongoUri);
    
    const customers = await Customer.find({});
    console.log(`Found ${customers.length} customers to update.`);
    
    for (const customer of customers) {
      console.log(`Calculating score for customer: ${customer.name}...`);
      const results = await updateRiskLevel(customer._id);
      console.log(`Updated ${customer.name}: Risk Level: ${results.riskLevel}, Credit Score: ${results.creditScore}, Due Prediction: ${results.duePrediction}`);
    }
    
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

runMigration();

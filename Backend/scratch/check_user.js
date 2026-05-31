const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/udhaar-khata');
    const users = await User.find({});
    console.log("USERS:", users.map(u => ({
      _id: u._id,
      email: u.email,
      name: u.name,
      isBiometricEnabled: u.isBiometricEnabled,
      biometricCredentialId: u.biometricCredentialId,
      hasPin: u.hasPin
    })));
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
};

run();

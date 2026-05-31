const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/udhaar-khata';

mongoose.connect(MONGO_URI)
  .then(async () => {
    const User = require('./models/User');
    const users = await User.find({ emailOtp: { $ne: '' } });
    
    if (users.length === 0) {
      console.log('\n❌ No active verification codes (OTPs) found in the database.');
      console.log('To generate one, click "Unlock to Edit" on the settings page and enter a wrong password.\n');
    } else {
      console.log('\n🔑 Found active verification code(s):');
      users.forEach(user => {
        console.log(`- User: ${user.email}`);
        console.log(`  OTP Code: ${user.emailOtp}`);
        console.log(`  Expires At: ${user.emailOtpExpires}\n`);
      });
    }
    process.exit(0);
  })
  .catch(err => {
    console.error('Connection error:', err);
    process.exit(1);
  });

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { sendEmail } = require('../services/mailService');

async function run() {
  console.log('Testing mail service with current configuration...');
  try {
    const res = await sendEmail({
      to: 'digitaludharkhata@gmail.com',
      subject: 'Test Email from Digital Udhaar',
      text: 'This is a test email.',
      html: '<p>This is a test email.</p>'
    });
    console.log('Result:', res);
  } catch (err) {
    console.error('Error during test:', err);
  }
}

run();

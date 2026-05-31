const axios = require('axios');

/**
 * Validates and formats a phone number to a 10-digit Indian mobile number.
 * @param {string} phone - The input phone number string.
 * @returns {string|null} - The formatted 10-digit number, or null if invalid.
 */
const formatIndianPhoneNumber = (phone) => {
  if (!phone) return null;
  
  // Strip all non-numeric characters
  const cleanPhone = phone.replace(/\D/g, '');
  
  // If it's 10 digits, verify it starts with a valid digit for Indian mobile (6, 7, 8, 9)
  if (cleanPhone.length === 10) {
    if (/^[6-9]\d{9}$/.test(cleanPhone)) {
      return cleanPhone;
    }
  }
  
  // If it's 12 digits and starts with 91, extract the last 10 digits
  if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) {
    const last10 = cleanPhone.substring(2);
    if (/^[6-9]\d{9}$/.test(last10)) {
      return last10;
    }
  }
  
  return null;
};

/**
 * Sends an SMS using the Fast2SMS Quick SMS API.
 * @param {string} to - Recipient phone number.
 * @param {string} message - Message text.
 * @returns {Promise<object>} - API response data or mock status.
 */
const sendSMS = async (to, message) => {
  const formattedPhone = formatIndianPhoneNumber(to);
  
  if (!formattedPhone) {
    throw new Error(`Invalid Indian mobile number: ${to}. Must be a 10-digit number (e.g. +91XXXXXXXXXX or XXXXXXXXXX).`);
  }

  const apiKey = process.env.FAST2SMS_API_KEY;

  if (!apiKey || apiKey === 'your_fast2sms_api_key_here') {
    console.log(`📱 [Fast2SMS Mock] To: ${formattedPhone} | Message: ${message}`);
    return {
      success: true,
      status: 'mock',
      message: 'Fast2SMS API key not configured — SMS logged to console.',
      data: {
        to: formattedPhone,
        body: message
      }
    };
  }

  try {
    const payload = {
      route: 'q', // Quick SMS route
      message: message,
      language: 'english',
      flash: 0,
      numbers: formattedPhone
    };

    const response = await axios.post('https://www.fast2sms.com/dev/bulkV2', payload, {
      headers: {
        'authorization': apiKey,
        'Content-Type': 'application/json',
        'cache-control': 'no-cache'
      }
    });

    if (response.data && response.data.return === true) {
      return {
        success: true,
        status: 'sent',
        message: response.data.message || 'SMS sent successfully',
        data: response.data
      };
    } else {
      throw new Error(response.data.message || 'Fast2SMS returned failure status');
    }
  } catch (error) {
    console.error('Fast2SMS Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || error.message || 'Failed to send SMS via Fast2SMS');
  }
};

module.exports = {
  formatIndianPhoneNumber,
  sendSMS
};

const express = require('express');
const router = express.Router();
const axios = require('axios');
const { sendReminder, sendBulkReminders, sendFast2SMSSMS, sendCloudWhatsApp } = require('../controllers/reminderController');
const { protect } = require('../middleware/authMiddleware');
const Customer = require('../models/Customer');
const Transaction = require('../models/Transaction');
const { generateStatement } = require('../services/pdfService');

// Public route for payment checkout (no authentication required)
router.get('/checkout/:customerId', async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.customerId).populate('owner');
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    // Fetch total Credit (Udhaar) and total Debit (Jama)
    const Transaction = require('../models/Transaction');
    const credits = await Transaction.find({ customer: customer._id, type: 'credit' });
    const debits = await Transaction.find({ customer: customer._id, type: 'debit' });

    const totalUdhaar = credits.reduce((sum, tx) => sum + tx.amount, 0);
    const totalJama = debits.reduce((sum, tx) => sum + tx.amount, 0);

    // Fetch last successfully SETTLED payment only
    const lastPayment = await Transaction.findOne({
      customer: customer._id,
      type: 'debit',
      paymentStatus: 'SETTLED',
    }).sort({ date: -1 });

    let lastPaymentUtr = '';
    if (lastPayment && lastPayment.description) {
      const match = lastPayment.description.match(/UTR:\s*(\d+)/i);
      if (match) {
        lastPaymentUtr = match[1];
      }
    }

    res.status(200).json({
      success: true,
      data: {
        customerName: customer.name,
        customerPhone: customer.phone || '',
        customerAddress: customer.address || 'Ghatkesar Rd',
        balance: customer.balance,
        storeName: customer.owner.storeName || 'Digital Udhaar',
        upiId: customer.owner.upiId || '',
        ownerName: customer.owner.name || 'Merchant',
        ownerPhone: customer.owner.phone || '',
        totalUdhaar,
        totalJama,
        lastPayment: lastPayment ? {
          amount: lastPayment.amount,
          date: lastPayment.date,
          utr: lastPaymentUtr,
          status: lastPayment.paymentStatus || 'SUCCESS',
        } : null,
      }
    });
  } catch (error) {
    next(error);
  }
});

// Public route to download receipt PDF
router.get('/checkout/:customerId/receipt', async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.customerId).populate('owner');
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Fetch last debit transaction
    const lastPayment = await Transaction.findOne({
      customer: customer._id,
      type: 'debit',
    }).sort({ date: -1 });

    if (!lastPayment) {
      return res.status(404).json({ success: false, message: 'No payment transaction found' });
    }

    // Fetch all customer transactions
    const customerTransactions = await Transaction.find({ customer: customer._id });

    // Generate the premium PDF receipt buffer
    const store = {
      storeName: customer.owner.storeName || 'Digital Udhaar',
      name: customer.owner.name || 'Merchant',
      phone: customer.owner.phone || '',
      upiId: customer.owner.upiId || '',
    };

    const { generateReceiptPDFBuffer } = require('../services/pdfService');
    const pdfBuffer = await generateReceiptPDFBuffer(
      store,
      customer,
      lastPayment,
      customerTransactions
    );

    const dateObj = new Date(lastPayment.date);
    const receiptNo = `RCP-${dateObj.getFullYear()}${(dateObj.getMonth()+1).toString().padStart(2,'0')}${dateObj.getDate().toString().padStart(2,'0')}-${customer._id.toString().slice(-3).toUpperCase()}`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt_${receiptNo}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
});

router.post('/checkout/:customerId/confirm-payment', async (req, res, next) => {
  try {
    const { customerId } = req.params;
    const { utr, amount } = req.body;

    if (!utr || !amount || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid UPI Transaction Ref / UTR number and amount are required.',
      });
    }

    const utrStr = utr.toString().trim();
    if (utrStr.length !== 12 || !/^\d+$/.test(utrStr)) {
      return res.status(400).json({
        success: false,
        message: 'Valid 12-digit numerical UPI Ref / UTR number is required.',
      });
    }

    // 1. Check for duplicate UTR
    const Transaction = require('../models/Transaction');
    const existingTx = await Transaction.findOne({
      description: new RegExp(`UTR:\\s*${utrStr}`, 'i'),
    });
    if (existingTx) {
      return res.status(400).json({
        success: false,
        message: 'This Transaction UTR has already been submitted and verified. Duplicate entries are blocked.',
      });
    }

    // 2. Heuristic UTR validity checks (Year digit + Julian Day range)
    // UPI UTR standard: YDDDHH... (Y=Year, DDD=Julian Day 001-366)
    const yearDigit = parseInt(utrStr.charAt(0));
    const julianDay = parseInt(utrStr.substring(1, 4));

    const currentYear = new Date().getFullYear();
    const expectedYearDigit = currentYear % 10; // e.g. 6 for 2026

    // Compute Julian day for today
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now - start;
    const oneDay = 1000 * 60 * 60 * 24;
    const currentJulianDay = Math.floor(diff / oneDay); // e.g. 149

    const isValidYearDigit = (yearDigit === expectedYearDigit || yearDigit === (expectedYearDigit - 1 + 10) % 10);
    
    // We allow a tolerance of ±5 days for timezone differences and clearing delays
    const julianDiff = Math.abs(julianDay - currentJulianDay);
    const isValidJulianDay = julianDay >= 1 && julianDay <= 366 && (julianDiff <= 5 || (366 - julianDiff <= 5));

    if (!isValidYearDigit || !isValidJulianDay) {
      return res.status(400).json({
        success: false,
        message: 'Invalid UPI Transaction Reference Number (UTR). Please verify and enter the correct 12-digit UTR from your GPay, PhonePe, or Paytm app receipt.',
      });
    }

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found.',
      });
    }

    // Create the transaction as SETTLED
    const transaction = await Transaction.create({
      owner: customer.owner,
      customer: customer._id,
      type: 'debit',
      amount: parseFloat(amount),
      description: `Online UPI Payment (UTR: ${utrStr})`,
      date: new Date(),
      paymentStatus: 'SETTLED',
      paymentMode: 'upi',
    });

    // ── Mark all pending credit (Udhaar) transactions as SETTLED ──
    await Transaction.updateMany(
      {
        customer: customer._id,
        type: 'credit',
        paymentStatus: 'PENDING',
      },
      { $set: { paymentStatus: 'SETTLED' } }
    );

    // Settle balance
    customer.balance = Math.max(0, customer.balance - parseFloat(amount));
    customer.lastPaymentDate = new Date();
    customer.totalTransactions = (customer.totalTransactions || 0) + 1;
    await customer.save();

    // Trigger auto email via AI Bot
    if (customer.email) {
      const { sendTransactionEmail } = require('../services/transactionMailService');
      sendTransactionEmail(transaction._id).catch(err => console.error('Error sending auto-receipt:', err));
    }

    // Log to permanent customer history
    const CustomerHistory = require('../models/CustomerHistory');
    await CustomerHistory.create({
      owner: customer.owner,
      customerId: customer._id,
      customerName: customer.name,
      customerPhone: customer.phone,
      transactionId: transaction._id,
      type: 'debit',
      amount: parseFloat(amount),
      description: `Online UPI Payment (UTR: ${utrStr})`,
      date: new Date(),
      action: 'CREATE',
    });

    res.status(200).json({
      success: true,
      message: 'Payment verified and receipt generated successfully.',
      data: {
        balance: customer.balance,
        transactionStatus: 'SETTLED',
        lastPayment: {
          id: transaction._id,
          amount: transaction.amount,
          utr: utrStr,
          date: transaction.date,
          status: 'SETTLED',
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// ─── CASHFREE CREATE ORDER ───
router.post('/checkout/:customerId/create-order', async (req, res, next) => {
  try {
    const { customerId } = req.params;
    const customer = await Customer.findById(customerId).populate('owner');
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    const amount = parseFloat(customer.balance);
    if (amount <= 0) {
      return res.status(400).json({ success: false, message: 'No outstanding balance to pay.' });
    }

    const orderId = `order_${customerId}_${Date.now()}`;

    // Get Cashfree credentials (supporting both env formats)
    const appId = process.env.CASHFREE_CLIENT_ID;
    const secretKey = process.env.CASHFREE_CLIENT_SECRET;
    const isSandbox = (process.env.CASHFREE_ENV || 'SANDBOX').toUpperCase() === 'SANDBOX';

    const baseUrl = isSandbox 
      ? 'https://sandbox.cashfree.com/pg/orders' 
      : 'https://api.cashfree.com/pg/orders';

    const payload = {
      order_amount: amount,
      order_currency: 'INR',
      order_id: orderId,
      customer_details: {
        customer_id: customer._id.toString(),
        customer_email: customer.email || 'customer@digitaludhaar.com',
        customer_phone: customer.phone ? customer.phone.replace(/\D/g, '').slice(-10) : '9999999999',
        customer_name: customer.name || 'Valued Customer'
      },
      order_meta: {
        return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/pay/${customerId}?order_id={order_id}`
      }
    };

    console.log('Creating Cashfree Order:', orderId, 'Amount:', amount);

    const response = await axios.post(
      baseUrl,
      payload,
      {
        headers: {
          'x-client-id': appId,
          'x-client-secret': secretKey,
          'x-api-version': '2023-08-01',
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );

    res.status(200).json({
      success: true,
      order_id: orderId,
      payment_session_id: response.data.payment_session_id
    });
  } catch (error) {
    console.error('Error creating Cashfree order:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: error.response?.data?.message || 'Failed to initialize payment gateway order.'
    });
  }
});

// ─── CASHFREE VERIFY PAYMENT STATUS ───
router.get('/checkout/:customerId/verify-payment/:orderId', async (req, res, next) => {
  try {
    const { customerId, orderId } = req.params;
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    const appId = process.env.CASHFREE_CLIENT_ID;
    const secretKey = process.env.CASHFREE_CLIENT_SECRET;
    const isSandbox = (process.env.CASHFREE_ENV || 'SANDBOX').toUpperCase() === 'SANDBOX';

    const baseUrl = isSandbox 
      ? `https://sandbox.cashfree.com/pg/orders/${orderId}` 
      : `https://api.cashfree.com/pg/orders/${orderId}`;

    const response = await axios.get(
      baseUrl,
      {
        headers: {
          'x-client-id': appId,
          'x-client-secret': secretKey,
          'x-api-version': '2023-08-01',
          'Accept': 'application/json'
        }
      }
    );

    const orderData = response.data;
    if (orderData.order_status === 'PAID') {
      // Settle database balance if not already settled
      if (customer.balance > 0) {
        const amount = orderData.order_amount;
        
        // Create credit-settlement debit transaction
        const transaction = await Transaction.create({
          owner: customer.owner,
          customer: customer._id,
          type: 'debit',
          amount: parseFloat(amount),
          description: `Cashfree Payment (Order: ${orderId})`,
          date: new Date(),
          paymentStatus: 'SETTLED',
          paymentMode: 'online',
        });

        // Update customer balance to 0 (or subtract paid amount)
        customer.balance = Math.max(0, customer.balance - parseFloat(amount));
        customer.lastPaymentDate = new Date();
        customer.totalTransactions = (customer.totalTransactions || 0) + 1;
        await customer.save();

        // Trigger receipt email
        if (customer.email) {
          const { sendTransactionEmail } = require('../services/transactionMailService');
          sendTransactionEmail(transaction._id).catch(err => console.error('Error sending auto-receipt:', err));
        }

        // Log to permanent history
        const CustomerHistory = require('../models/CustomerHistory');
        await CustomerHistory.create({
          owner: customer.owner,
          customerId: customer._id,
          customerName: customer.name,
          customerPhone: customer.phone,
          transactionId: transaction._id,
          type: 'debit',
          amount: parseFloat(amount),
          description: `Cashfree Payment (Order: ${orderId})`,
          date: new Date(),
          action: 'CREATE'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Payment settled successfully.',
        balance: customer.balance
      });
    }

    res.status(200).json({
      success: false,
      message: `Payment status: ${orderData.order_status}`,
      status: orderData.order_status
    });
  } catch (error) {
    console.error('Error verifying payment:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: error.response?.data?.message || 'Failed to verify payment status.'
    });
  }
});

// ─── CASHFREE WEBHOOK ROUTE ───
router.post('/webhook/cashfree', async (req, res) => {
  try {
    console.log('🔔 Cashfree Webhook Received:', req.body);
    const { type, data } = req.body;

    if (type === 'PAYMENT_SUCCESS_WEBHOOK' && data?.payment?.payment_status === 'SUCCESS') {
      const orderId = data.order.order_id;
      const amount = data.order.order_amount;
      const paymentId = data.payment.cf_payment_id;

      // Extract customerId from orderId (format: order_customerId_timestamp)
      const parts = orderId.split('_');
      if (parts.length >= 2) {
        const customerId = parts[1];
        const customer = await Customer.findById(customerId);
        
        if (customer && customer.balance > 0) {
          // Create the debit transaction
          const transaction = await Transaction.create({
            owner: customer.owner,
            customer: customer._id,
            type: 'debit',
            amount: parseFloat(amount),
            description: `Cashfree Payment Webhook (ID: ${paymentId})`,
            date: new Date(),
            paymentStatus: 'SETTLED',
            paymentMode: 'online',
          });

          // Update customer balance
          customer.balance = Math.max(0, customer.balance - parseFloat(amount));
          customer.lastPaymentDate = new Date();
          customer.totalTransactions = (customer.totalTransactions || 0) + 1;
          await customer.save();

          // Trigger email
          if (customer.email) {
            const { sendTransactionEmail } = require('../services/transactionMailService');
            sendTransactionEmail(transaction._id).catch(err => console.error('Error sending auto-receipt:', err));
          }

          // Log to permanent history
          const CustomerHistory = require('../models/CustomerHistory');
          await CustomerHistory.create({
            owner: customer.owner,
            customerId: customer._id,
            customerName: customer.name,
            customerPhone: customer.phone,
            transactionId: transaction._id,
            type: 'debit',
            amount: parseFloat(amount),
            description: `Cashfree Payment Webhook (ID: ${paymentId})`,
            date: new Date(),
            action: 'CREATE'
          });

          console.log(`✅ Cashfree payment processed via Webhook. Customer balance updated for: ${customer.name}`);
        }
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Error handling Cashfree webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});

router.use(protect);

// Reminders
router.post('/send/:customerId', sendReminder);
router.post('/send-bulk', sendBulkReminders);
router.post('/send-sms', sendFast2SMSSMS);
router.post('/send-whatsapp', sendCloudWhatsApp);

// PDF statement download
router.get('/statement/:customerId', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const customer = await Customer.findOne({
      _id: req.params.customerId,
      owner: req.user._id,
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    // Default to current month if no dates provided
    const now = new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endDate
      ? new Date(endDate)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const transactions = await Transaction.find({
      customer: customer._id,
      date: { $gte: start, $lte: end },
    }).sort({ date: 1 });

    const store = {
      storeName: req.user.storeName,
      name: req.user.name,
      phone: req.user.phone,
      upiId: req.user.upiId || '',
    };

    const dateRange = {
      startDate: start.toLocaleDateString('en-IN'),
      endDate: end.toLocaleDateString('en-IN'),
    };

    generateStatement(store, customer, transactions, dateRange, res);
  } catch (error) {
    next(error);
  }
});

module.exports = router;

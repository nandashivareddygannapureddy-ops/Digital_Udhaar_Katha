const Customer = require('../models/Customer');
const Transaction = require('../models/Transaction');
const CustomerHistory = require('../models/CustomerHistory');
const dns = require('dns').promises;
const socketService = require('../services/socketService');

const validateEmailExists = async (email) => {
  if (!email) return true;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// @desc    Get all customers for logged-in owner
// @route   GET /api/customers
const getCustomers = async (req, res, next) => {
  try {
    const { search, sort } = req.query;
    let query = { owner: req.user._id, isDeleted: { $ne: true } };

    // Search by name or phone
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    // Sort options
    let sortOption = { createdAt: -1 };
    if (sort === 'name') sortOption = { name: 1 };
    if (sort === 'balance-high') sortOption = { balance: -1 };
    if (sort === 'balance-low') sortOption = { balance: 1 };

    const customers = await Customer.find(query).sort(sortOption);

    res.status(200).json({
      success: true,
      count: customers.length,
      data: customers,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single customer with transactions
// @route   GET /api/customers/:id
const getCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      owner: req.user._id,
      isDeleted: { $ne: true }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    const transactions = await Transaction.find({
      customer: customer._id,
    }).sort({ date: -1 });

    res.status(200).json({
      success: true,
      data: { customer, transactions },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new customer
// @route   POST /api/customers
const createCustomer = async (req, res, next) => {
  try {
    const { name, phone, email, address, avatar, paymentDueDate } = req.body;

    // Check if email exists/is valid if provided
    if (email && !(await validateEmailExists(email))) {
      return res.status(400).json({
        success: false,
        message: 'customer email is invalid / customer id is invalid',
      });
    }

    // Check for duplicate phone under same owner
    const existing = await Customer.findOne({ phone, owner: req.user._id });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A customer with this phone number already exists',
      });
    }

    const customer = await Customer.create({
      name,
      phone,
      email: email || '',
      address,
      avatar: avatar || '',
      paymentDueDate: paymentDueDate || null,
      owner: req.user._id,
    });

    // Log to permanent customer history
    await CustomerHistory.create({
      owner: req.user._id,
      customerId: customer._id,
      customerName: customer.name,
      customerPhone: customer.phone,
      type: 'customer_created',
      amount: 0,
      description: 'New customer account created',
      date: new Date(),
      action: 'CREATE'
    });

    socketService.emitRefresh('customers');

    res.status(201).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update customer
// @route   PUT /api/customers/:id
const updateCustomer = async (req, res, next) => {
  try {
    const { name, phone, email, address, avatar, paymentDueDate } = req.body;

    // Check if email exists/is valid if provided
    if (email && !(await validateEmailExists(email))) {
      return res.status(400).json({
        success: false,
        message: 'customer email is invalid / customer id is invalid',
      });
    }

    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id, isDeleted: { $ne: true } },
      { name, phone, email: email || '', address, avatar, paymentDueDate: paymentDueDate || null },
      { new: true, runValidators: true }
    );

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    socketService.emitRefresh('customers');

    res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Move customer to trash (Soft Delete)
// @route   DELETE /api/customers/:id
const deleteCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      owner: req.user._id,
      isDeleted: { $ne: true }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    // Soft delete customer
    customer.isDeleted = true;
    customer.deletedAt = new Date();
    await customer.save();

    // Log to permanent customer history
    await CustomerHistory.create({
      owner: req.user._id,
      customerId: customer._id,
      customerName: customer.name,
      customerPhone: customer.phone,
      type: 'customer_deleted',
      amount: customer.balance,
      description: `Customer moved to Trash. Final ledger balance: ₹${customer.balance}`,
      date: new Date(),
      action: 'CUSTOMER_DELETED'
    });

    socketService.emitRefresh('customers');

    res.status(200).json({
      success: true,
      message: 'Customer moved to Trash. You can restore it within 30 days.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get trashed (soft-deleted) customers
// @route   GET /api/customers/trash
const getTrash = async (req, res, next) => {
  try {
    // Auto purge expired items (> 30 days old)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const expiredCustomers = await Customer.find({
      owner: req.user._id,
      isDeleted: true,
      deletedAt: { $lt: thirtyDaysAgo }
    });

    for (const cust of expiredCustomers) {
      await Transaction.deleteMany({ customer: cust._id });
      await Customer.findByIdAndDelete(cust._id);
    }

    // Return remaining trashed customers
    const trashedCustomers = await Customer.find({
      owner: req.user._id,
      isDeleted: true
    }).sort({ deletedAt: -1 });

    res.status(200).json({
      success: true,
      count: trashedCustomers.length,
      data: trashedCustomers
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Restore customer from trash
// @route   POST /api/customers/:id/restore
const restoreCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id, isDeleted: true },
      { isDeleted: false, deletedAt: null },
      { new: true }
    );

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found in Trash',
      });
    }

    // Log to permanent customer history
    await CustomerHistory.create({
      owner: req.user._id,
      customerId: customer._id,
      customerName: customer.name,
      customerPhone: customer.phone,
      type: 'customer_restored',
      amount: customer.balance,
      description: 'Customer restored from Trash',
      date: new Date(),
      action: 'CREATE'
    });

    socketService.emitRefresh('customers');

    res.status(200).json({
      success: true,
      message: 'Customer restored successfully',
      data: customer
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getTrash,
  restoreCustomer,
};

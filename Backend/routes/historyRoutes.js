const express = require('express');
const router = express.Router();
const CustomerHistory = require('../models/CustomerHistory');
const { protect } = require('../middleware/authMiddleware');

// Authenticate all routes
router.use(protect);

// @desc    Get permanent customer ledger history logs
// @route   GET /api/history
router.get('/', async (req, res, next) => {
  try {
    const { search, customerId } = req.query;
    let query = { owner: req.user._id };

    if (customerId) {
      query.customerId = customerId;
    }

    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const history = await CustomerHistory.find(query).sort({ date: -1 });

    res.status(200).json({
      success: true,
      count: history.length,
      data: history,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

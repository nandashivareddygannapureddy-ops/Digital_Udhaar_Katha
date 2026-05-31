const CashbookEntry = require('../models/CashbookEntry');
const { generateCashbookStatement } = require('../services/pdfService');
const socketService = require('../services/socketService');

// @desc    Get all cashbook entries and statistics
// @route   GET /api/cashbook
const getCashbookEntries = async (req, res, next) => {
  try {
    const { period, paymentMode, search, startDate, endDate } = req.query;
    const ownerId = req.user._id;

    // Base query for current owner
    let query = { owner: ownerId };

    // 1. Handle Payment Mode filter
    if (paymentMode && ['cash', 'online'].includes(paymentMode)) {
      query.paymentMode = paymentMode;
    }

    // 2. Handle Search filter (description)
    if (search) {
      query.description = { $regex: search, $options: 'i' };
    }

    // 3. Handle Date/Period filters
    let dateFilter = {};
    const now = new Date();

    if (period === 'today') {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      dateFilter = { $gte: start };
    } else if (period === 'yesterday') {
      const start = new Date(now);
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      dateFilter = { $gte: start, $lte: end };
    } else if (period === 'this-month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFilter = { $gte: start };
    } else if (startDate || endDate) {
      dateFilter = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.$lte = end;
      }
    }

    if (Object.keys(dateFilter).length > 0) {
      query.date = dateFilter;
    }

    // Fetch filtered entries
    const entries = await CashbookEntry.find(query).sort({ date: -1 });

    // --- CALCULATE LIFETIME STATS (Lifetime total Cash in Hand) ---
    const allStatsAgg = await CashbookEntry.aggregate([
      { $match: { owner: ownerId } },
      {
        $group: {
          _id: null,
          totalIn: { $sum: { $cond: [{ $eq: ['$type', 'in'] }, '$amount', 0] } },
          totalOut: { $sum: { $cond: [{ $eq: ['$type', 'out'] }, '$amount', 0] } },
        },
      },
    ]);

    const lifetimeIn = allStatsAgg[0]?.totalIn || 0;
    const lifetimeOut = allStatsAgg[0]?.totalOut || 0;
    const cashInHand = lifetimeIn - lifetimeOut;

    // --- CALCULATE TODAY'S STATS ---
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const todayStatsAgg = await CashbookEntry.aggregate([
      { $match: { owner: ownerId, date: { $gte: todayStart } } },
      {
        $group: {
          _id: null,
          todayIn: { $sum: { $cond: [{ $eq: ['$type', 'in'] }, '$amount', 0] } },
          todayOut: { $sum: { $cond: [{ $eq: ['$type', 'out'] }, '$amount', 0] } },
        },
      },
    ]);

    const todayCashIn = todayStatsAgg[0]?.todayIn || 0;
    const todayCashOut = todayStatsAgg[0]?.todayOut || 0;

    // --- CALCULATE FILTERED STATS ---
    let filteredIn = 0;
    let filteredOut = 0;
    entries.forEach(e => {
      if (e.type === 'in') filteredIn += e.amount;
      else filteredOut += e.amount;
    });

    res.status(200).json({
      success: true,
      count: entries.length,
      data: entries,
      stats: {
        cashInHand,
        todayCashIn,
        todayCashOut,
        filteredIn,
        filteredOut,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new cashbook entry
// @route   POST /api/cashbook
const createCashbookEntry = async (req, res, next) => {
  try {
    const { type, amount, description, paymentMode, category, date } = req.body;

    const entry = await CashbookEntry.create({
      owner: req.user._id,
      type,
      amount: parseFloat(amount),
      description: description || '',
      paymentMode: paymentMode || 'cash',
      category: category || 'Other',
      date: date || Date.now(),
    });

    socketService.emitRefresh('cashbook');

    res.status(201).json({
      success: true,
      data: entry,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a cashbook entry
// @route   DELETE /api/cashbook/:id
const deleteCashbookEntry = async (req, res, next) => {
  try {
    const entry = await CashbookEntry.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Cashbook entry not found',
      });
    }

    await CashbookEntry.findByIdAndDelete(entry._id);

    socketService.emitRefresh('cashbook');

    res.status(200).json({
      success: true,
      message: 'Cashbook entry deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Download cashbook PDF report
// @route   GET /api/cashbook/report
const downloadCashbookReport = async (req, res, next) => {
  try {
    const { period, paymentMode, search, startDate, endDate } = req.query;
    const ownerId = req.user._id;

    // Apply exact same filters for PDF report
    let query = { owner: ownerId };

    if (paymentMode && ['cash', 'online'].includes(paymentMode)) {
      query.paymentMode = paymentMode;
    }

    if (search) {
      query.description = { $regex: search, $options: 'i' };
    }

    let dateFilter = {};
    const now = new Date();

    if (period === 'today') {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      dateFilter = { $gte: start };
    } else if (period === 'yesterday') {
      const start = new Date(now);
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      dateFilter = { $gte: start, $lte: end };
    } else if (period === 'this-month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFilter = { $gte: start };
    } else if (startDate || endDate) {
      dateFilter = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.$lte = end;
      }
    }

    if (Object.keys(dateFilter).length > 0) {
      query.date = dateFilter;
    }

    const entries = await CashbookEntry.find(query).sort({ date: 1 }); // Sort chronologically for PDF report!

    // Format range strings
    let rangeStr = 'All Time';
    if (period) {
      rangeStr = period.charAt(0).toUpperCase() + period.slice(1).replace('-', ' ');
    } else if (startDate || endDate) {
      rangeStr = `${startDate || 'Start'} to ${endDate || 'End'}`;
    }

    const dateRange = {
      label: rangeStr,
      startDate: startDate || 'Beginning',
      endDate: endDate || 'Now',
    };

    // Call pdfService helper to generate cashbook statement
    generateCashbookStatement(
      { storeName: req.user.storeName || 'My Business', name: req.user.name, phone: req.user.phone },
      entries,
      dateRange,
      res
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Export Cashbook as CSV (Excel compatible)
// @route   GET /api/cashbook/export
const exportCashbookExcel = async (req, res, next) => {
  try {
    const ownerId = req.user._id;
    const entries = await CashbookEntry.find({ owner: ownerId }).sort({ date: 1 });
    
    let csv = 'Date,Type,Amount (INR),Category,Payment Mode,Description\n';
    entries.forEach(e => {
      const formattedDate = new Date(e.date).toLocaleDateString('en-IN');
      const typeLabel = e.type === 'in' ? 'Cash In (Income)' : 'Cash Out (Expense)';
      const desc = (e.description || '').replace(/"/g, '""');
      csv += `"${formattedDate}","${typeLabel}",${e.amount},"${e.category || 'Other'}","${e.paymentMode}","${desc}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=cashbook_statement_${Date.now()}.csv`);
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCashbookEntries,
  createCashbookEntry,
  deleteCashbookEntry,
  downloadCashbookReport,
  exportCashbookExcel,
};

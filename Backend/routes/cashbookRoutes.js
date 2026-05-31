const express = require('express');
const router = express.Router();
const {
  getCashbookEntries,
  createCashbookEntry,
  deleteCashbookEntry,
  downloadCashbookReport,
  exportCashbookExcel,
} = require('../controllers/cashbookController');
const { protect } = require('../middleware/authMiddleware');

// Authenticate all routes
router.use(protect);

router.get('/report', downloadCashbookReport);
router.get('/export', exportCashbookExcel);
router.route('/').get(getCashbookEntries).post(createCashbookEntry);
router.route('/:id').delete(deleteCashbookEntry);

module.exports = router;

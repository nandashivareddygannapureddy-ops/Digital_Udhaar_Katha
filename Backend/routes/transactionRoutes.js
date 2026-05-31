const express = require('express');
const router = express.Router();
const {
  getTransactions,
  createTransaction,
  settleTransaction,
  approveTransaction,
  declineTransaction,
  deleteTransaction,
  updateTransaction,
  getStats,
} = require('../controllers/transactionController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/stats', getStats);
router.route('/').get(getTransactions).post(createTransaction);
router.put('/:id/settle', settleTransaction);
router.put('/:id/approve', approveTransaction);
router.put('/:id/decline', declineTransaction);
router.route('/:id').delete(deleteTransaction).put(updateTransaction);

module.exports = router;

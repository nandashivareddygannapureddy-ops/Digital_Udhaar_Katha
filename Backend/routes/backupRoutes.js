const express = require('express');
const router = express.Router();
const { 
  createBackup, 
  restoreBackup,
  getBackupStatus,
  createCloudBackup,
  restoreCloudBackup
} = require('../controllers/backupController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/create', createBackup);
router.post('/restore', restoreBackup);
router.get('/status', getBackupStatus);
router.post('/cloud-create', createCloudBackup);
router.post('/cloud-restore', restoreCloudBackup);

module.exports = router;

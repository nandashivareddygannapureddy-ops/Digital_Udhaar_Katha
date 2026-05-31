const express = require('express');
const router = express.Router();
const { voiceEntry, chatAssistant } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/voice-entry', voiceEntry);
router.post('/chat', chatAssistant);

module.exports = router;

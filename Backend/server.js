const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { initAutoReminderScheduler } = require('./services/autoReminderService');

// Load env vars
dotenv.config();

// Disable SSL certificate verification rejection for local development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Connect to database
connectDB();

// Initialize AI Auto-Reminder Bot Scheduler
initAutoReminderScheduler();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/customers', require('./routes/customerRoutes'));
app.use('/api/transactions', require('./routes/transactionRoutes'));
app.use('/api/reminders', require('./routes/reminderRoutes'));
app.use('/api/reminder', require('./routes/reminderRoutes'));
app.use('/api/cashbook', require('./routes/cashbookRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/history', require('./routes/historyRoutes'));
app.use('/api/backup', require('./routes/backupRoutes'));


// Webhook verification for WhatsApp Cloud API
app.get('/webhook', (req, res) => {
  const verifyToken = "udhar_verify_token";

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token === verifyToken) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Udhaar Khata API is running' });
});

// Error handler
app.use(errorHandler);

const http = require('http');
const socketService = require('./services/socketService');

const server = http.createServer(app);
socketService.init(server);

const PORT = process.env.PORT || 4000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

// Op3nHunt - Main Server
// By NexoraStack (https://x.com/nexorastack)

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const path = require('path');

const app = express();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ MongoDB connected');
    
    // TEMPORARY: Clear all sessions to fix the migration (REMOVE AFTER FIRST RUN)
    try {
      await mongoose.connection.db.collection('sessions').deleteMany({});
      console.log('✓ All sessions cleared - users need to login again');
    } catch (err) {
      console.error('Error clearing sessions:', err);
    }
  })
  .catch(err => console.error('MongoDB error:', err));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Session
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }
}));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Make user available to all views
app.use(async (req, res, next) => {
  if (req.session && req.session.userId) {
    try {
      const User = require('./models/User');
      const user = await User.findById(req.session.userId);
      if (user) {
        res.locals.user = user;
      } else {
        res.locals.user = null;
        req.session.destroy();
      }
    } catch (err) {
      console.error('Error fetching user:', err);
      res.locals.user = null;
    }
  } else {
    res.locals.user = null;
  }
  next();
});

// Routes
const authRoutes = require('./routes/auth');
const gigRoutes = require('./routes/gigs');
const premiumRoutes = require('./routes/premium');
const adminRoutes = require('./routes/admin');

app.use('/', authRoutes);
app.use('/', gigRoutes);
app.use('/', premiumRoutes);
app.use('/', adminRoutes);

// Home
app.get('/', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/dashboard');
  }
  res.render('pages/home');
});

// Initialize Telegram Bot
const Op3nHuntBot = require('./services/telegramAlerts.js');
const telegramBot = new Op3nHuntBot();
global.telegramBot = telegramBot; // Make it globally accessible

// ===== NEW SCHEDULER INTEGRATION =====
const scheduler = require('./services/scheduler');

// Start the automated scheduler
// This will run:
// - Quick scan every 30 minutes (priority categories)
// - Full scan every 2 hours (all categories)
// - Deep scan every 6 hours (comprehensive)
// - Category rotation every hour
scheduler.start();

// Optional: Add manual scan endpoints for testing/admin
app.post('/api/admin/scan/quick', async (req, res) => {
  try {
    console.log('🎯 Manual quick scan triggered by admin');
    const result = await scheduler.manualScan('quick');
    res.json({ 
      success: true, 
      message: 'Quick scan completed',
      result 
    });
  } catch (error) {
    console.error('Manual quick scan failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.post('/api/admin/scan/full', async (req, res) => {
  try {
    console.log('🎯 Manual full scan triggered by admin');
    const result = await scheduler.manualScan('full');
    res.json({ 
      success: true, 
      message: 'Full scan completed',
      result 
    });
  } catch (error) {
    console.error('Manual full scan failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.post('/api/admin/scan/deep', async (req, res) => {
  try {
    console.log('🎯 Manual deep scan triggered by admin');
    const result = await scheduler.manualScan('deep');
    res.json({ 
      success: true, 
      message: 'Deep scan completed',
      result 
    });
  } catch (error) {
    console.error('Manual deep scan failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.post('/api/admin/scan/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    console.log(`🎯 Manual category scan triggered: ${category}`);
    const result = await scheduler.scanCategory(category);
    res.json({ 
      success: true, 
      message: `Category ${category} scan completed`,
      result 
    });
  } catch (error) {
    console.error(`Category ${req.params.category} scan failed:`, error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.get('/api/admin/scanner/status', (req, res) => {
  try {
    const status = scheduler.getStatus();
    res.json({ 
      success: true, 
      status 
    });
  } catch (error) {
    console.error('Failed to get scanner status:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 Op3nHunt Server Started`);
  console.log(`${'='.repeat(60)}`);
  console.log(`📍 URL:       http://localhost:${PORT}`);
  console.log(`🔐 Admin:     http://localhost:${PORT}/admin/${process.env.ADMIN_SECRET_CODE}`);
  console.log(`📊 Scanner:   http://localhost:${PORT}/api/admin/scanner/status`);
  console.log(`${'='.repeat(60)}`);
  console.log(`👨‍💻 By NexoraStack (https://x.com/nexorastack)`);
  console.log(`${'='.repeat(60)}\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n⚠️ SIGTERM received, shutting down gracefully...');
  scheduler.stop();
  mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n⚠️ SIGINT received, shutting down gracefully...');
  scheduler.stop();
  mongoose.connection.close();
  process.exit(0);
});
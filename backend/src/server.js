/**
 * Capital Pyre — Backend API Server
 * Node.js + Express + MySQL
 *
 * Adapted from the IAMS backend (UB CSI341).
 * Architecture, middleware, and patterns inherited directly.
 */

require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const morgan      = require('morgan');
const path        = require('path');
const http        = require('http');
const { Server }  = require('socket.io');
const rateLimit   = require('express-rate-limit');

const errorHandler = require('./middleware/errorHandler');
const { initSocketIO } = require('./utils/socket');
const { runNudges } = require('./utils/nudgeCron');

// ── Route modules ─────────────────────────────────────────
const authRoutes             = require('./routes/auth');
const usersRoutes            = require('./routes/users');
const entrepreneurRoutes     = require('./routes/entrepreneurs');
const smeRoutes              = require('./routes/sme');
const investorRoutes         = require('./routes/investors');
const matchRoutes            = require('./routes/matches');
const dealRoutes             = require('./routes/deals');
const logbookRoutes          = require('./routes/logbooks');
const assessmentRoutes       = require('./routes/assessments');
const bondRoutes             = require('./routes/bonds');
const messageRoutes          = require('./routes/messages');
const notificationRoutes     = require('./routes/notifications');
const documentRoutes         = require('./routes/documents');
const crsRoutes              = require('./routes/crs');
const adminRoutes            = require('./routes/admin');
const reportRoutes           = require('./routes/reports');
const ratingsRoutes          = require('./routes/ratings');

// ── App + HTTP server (needed for Socket.IO) ──────────────
const app    = express();
const server = http.createServer(app);

// ── Socket.IO ─────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});
initSocketIO(io);

// ── CORS ──────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ── Body parsers ──────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── HTTP logger (dev only) ────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// ── Rate limiting on auth routes ──────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { success: false, message: 'Too many attempts. Please try again in 15 minutes.' },
});

// ── Static file serving (uploads) ────────────────────────
app.use('/uploads', express.static(path.resolve(process.env.UPLOAD_DIR || 'uploads')));

// ── Health check ──────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    service: 'Capital Pyre API',
    version: '1.0.0',
    time: new Date().toISOString(),
  });
});

// ── Routes ────────────────────────────────────────────────
app.use('/api/auth',           authLimiter, authRoutes);
app.use('/api/users',          usersRoutes);
app.use('/api/entrepreneurs',  entrepreneurRoutes);
app.use('/api/sme',            smeRoutes);
app.use('/api/investors',      investorRoutes);
app.use('/api/matches',        matchRoutes);
app.use('/api/deals',          dealRoutes);
app.use('/api/logbooks',       logbookRoutes);
app.use('/api/assessments',    assessmentRoutes);
app.use('/api/bonds',          bondRoutes);
app.use('/api/messages',       messageRoutes);
app.use('/api/notifications',  notificationRoutes);
app.use('/api/documents',      documentRoutes);
app.use('/api/crs',            crsRoutes);
app.use('/api/admin',          adminRoutes);
app.use('/api/reports',        reportRoutes);
app.use('/api/ratings',        ratingsRoutes);

// ── 404 catch-all ─────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found.` });
});

// ── Global error handler ──────────────────────────────────
app.use(errorHandler);

// ── Start server ──────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🔥  Capital Pyre API  →  http://localhost:${PORT}`);
  console.log(`📋  Environment      :  ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️   Database         :  ${process.env.DB_NAME} @ ${process.env.DB_HOST}`);
  console.log(`⚡  Socket.IO        :  enabled\n`);
  // Run nudge cron every 6 hours
  setInterval(runNudges, 6 * 60 * 60 * 1000);
  runNudges(); // run once on startup
});

module.exports = { app, server };

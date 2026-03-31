require('dotenv').config();
require('express-async-errors');

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const config  = require('./config/env');
const { errorHandler } = require('./middleware/errorHandler');
const logger  = require('./utils/logger');

const app = express();

// ─── CORS ─────────────────────────────────────────────────────────────────────
const corsOrigin = config.nodeEnv === 'production'
  ? config.frontendUrl
  : (origin, cb) => cb(null, true); // allow any localhost origin in dev
app.use(cors({ origin: corsOrigin, credentials: true }));

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Static uploads ───────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.resolve(config.uploadDir)));

// ─── Request logger ───────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`);
  next();
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/requests',  require('./routes/customer'));
app.use('/api/supplier',  require('./routes/supplier'));
app.use('/api/published', require('./routes/public'));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// ─── Error handler (must be last) ─────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;

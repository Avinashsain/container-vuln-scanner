const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
require('dotenv').config();

const PORT = process.env.PORT || 4003;
const allowedOrigins = (process.env.CLIENT_URLS || process.env.CLIENT_URL || 'http://localhost:4008')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const app = express();

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const isAllowed = !origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin);

  if (isAllowed) {
    res.header('Access-Control-Allow-Origin', origin || allowedOrigins[0] || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

app.use((req, res, next) => {
  res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

app.use(cookieParser());
app.use(express.json());
app.use(morgan('dev'));

const { connectDB } = require('./db');
connectDB();

app.get('/api/health', (_, res) => {
  res.json({ success: true, service: 'admin', status: 'ok' });
});

app.use('/api/admin', require('./routes/video.route'));

app.use((err, req, res, next) => {
  console.error('Admin service error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

app.listen(PORT, () => {
  console.log(`Admin service listening on port ${PORT}`);
});

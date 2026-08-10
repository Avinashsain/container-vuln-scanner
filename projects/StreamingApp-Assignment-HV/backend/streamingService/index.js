const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4002;

const allowedOrigins = (process.env.CLIENT_URLS || process.env.CLIENT_URL || 'http://localhost:4008')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

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

// Middleware
app.use(cookieParser());
app.use(express.json());

// Database connection
const { connectDB } = require('./db');
connectDB();

// Routes
const healthRoutes = require('./routes/health.route');
const streamingRoutes = require('./routes/streaming.route');

app.use('/api/health', healthRoutes);
app.use('/api/streaming', streamingRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong on the server'
  });
});

app.listen(PORT, () => {
  console.log(`Streaming service running on port ${PORT}`);
});

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4001;

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
    res.header('Vary', 'Origin');
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
app.use(express.json());
app.use(cookieParser());

// Database connection
require('./util/conn');

// Routes
const healthCheckRoute = require('./routes/healthCheck.route');
const userRoute = require('./routes/user.route');

app.use('/health', healthCheckRoute);
app.use('/api', userRoute); // Changed from /apiv1 to /api

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong on the server'
  });
});

app.listen(PORT, () => {
  console.log(`Authentication Service Started at port ${PORT}`);
});

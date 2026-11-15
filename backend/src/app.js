/**
 * FitMaster AI – Primary Express Application Configuration
 * Integrates CORS, JSON parsers, static client assets, REST API routers, and error middleware.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes/index');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Security and Cross-Origin Resource Sharing
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Frontend path
const frontendPath = path.resolve(__dirname, '../../frontend');

// Root URL — serve login page BEFORE express.static so it takes priority over index.html.
// The client-side auth guard (auth.js) will redirect to dashboard.html if already logged in.
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'login.html'));
});

// /index.html also serves login (landing page no longer used as app entry point)
app.get('/index.html', (req, res) => {
  res.sendFile(path.join(frontendPath, 'login.html'));
});

// Serve remaining frontend static assets (CSS, JS, images, other HTML pages)
app.use(express.static(frontendPath));

// API Route Gateway
app.use('/api', apiRoutes);

// Fallback route for API 404s
app.all('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint ${req.method} ${req.originalUrl} not found.`
  });
});

// Centralized Error Handling Middleware
app.use(errorHandler);

module.exports = app;


const express = require('express');
const cors = require('cors');
const healthRoutes = require('./src/routes/health.routes');
const { notFoundHandler, errorHandler } = require('./src/middleware/errorHandler');

const app = express();

// Enable Cross-Origin Resource Sharing
app.use(cors());

// Parse incoming JSON request bodies
app.use(express.json());

// API Routes
app.use('/api', healthRoutes);

// Catch-all 404 handler for undefined routes
app.use(notFoundHandler);

// Centralized error handling middleware
app.use(errorHandler);

module.exports = app;

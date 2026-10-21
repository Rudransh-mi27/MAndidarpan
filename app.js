const express = require('express');
const cors = require('cors');
const healthRoutes = require('./src/routes/health.routes');
const priceRoutes = require('./src/routes/priceRoutes');
const mandiRoutes = require('./src/routes/mandiRoutes');
const queryRoutes = require('./src/routes/queryRoutes');
const { notFoundHandler, errorHandler } = require('./src/middleware/errorHandler');

const app = express();

// Enable Cross-Origin Resource Sharing
app.use(cors());

// Parse incoming JSON request bodies
app.use(express.json());

// API Routes
app.use('/api', healthRoutes);
app.use('/api/prices', priceRoutes);
app.use('/api/mandis', mandiRoutes);
app.use('/api', queryRoutes);

// Catch-all 404 handler for undefined routes
app.use(notFoundHandler);

// Centralized error handling middleware
app.use(errorHandler);

module.exports = app;

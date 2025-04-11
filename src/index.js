// src/index.js
import express from 'express';
import cors from 'cors';
import config from './config.js';
import reminderRoutes from './routes/reminderRoutes.js';
import listRoutes from './routes/listRoutes.js';
import database from './database.js';
import { apiKeyAuth } from './middleware/auth.js';

// Initialize the database connection
console.log(`Starting server in ${config.nodeEnv} mode`);
await database.getDb();

const app = express();

// Middleware
app.use(cors({
  origin: config.corsOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Shortcut-Token']
}));
app.use(express.json());

// Add request logging in development
if (config.nodeEnv !== 'production') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });
}

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', environment: config.nodeEnv });
});

// Public welcome route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to the iOS Reminder Manager API',
    version: '1.0.0',
    documentation: 'https://github.com/yourusername/ios-reminders-manager'
  });
});

// Apply API key authentication to all API routes
app.use('/api/reminders', apiKeyAuth, reminderRoutes);
app.use('/api/lists', apiKeyAuth, listRoutes);

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ 
    status: 'error',
    message: 'Route not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  // Don't expose stack traces in production
  const error = config.nodeEnv === 'production' 
    ? { message: 'Internal server error' }
    : { message: err.message, stack: err.stack };
  
  res.status(500).json({ 
    status: 'error',
    ...error
  });
});

// Start the server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${config.nodeEnv}`);
});
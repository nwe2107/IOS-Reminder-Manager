// src/config.js
import dotenv from 'dotenv';

// Load .env file in development
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const config = {
  // Server settings
  port: process.env.PORT || 8080,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Security settings
  apiKey: process.env.API_KEY,
  
  // Shortcut integration settings
  shortcutTokenSecret: process.env.SHORTCUT_TOKEN_SECRET,
  
  // CORS configuration
  corsOrigins: process.env.ALLOWED_ORIGINS ? 
    process.env.ALLOWED_ORIGINS.split(',') : 
    ['http://localhost:3000'],
  
  // Rate limiting
  rateLimit: {
    windowMs: process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutes
    max: process.env.RATE_LIMIT_MAX || 100 // limit each IP to 100 requests per windowMs
  },
  
  // Logging configuration
  logLevel: process.env.LOG_LEVEL || 'info'
};

// Validate required environment variables in production
if (process.env.NODE_ENV === 'production') {
  const requiredEnvVars = ['API_KEY'];
  const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missingVars.length > 0) {
    console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
    process.exit(1);
  }
} else {
  // In development, just warn
  if (!config.apiKey) {
    console.warn('Warning: API_KEY is not set. API endpoints will be unprotected.');
  }
}

export default config;
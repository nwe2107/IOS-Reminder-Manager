// src/middleware/auth.js
import crypto from 'crypto';
import config from '../config.js';

/**
 * API Key authentication middleware
 * Securely validates API key with timing-safe comparison
 */
export const apiKeyAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  
  if (!apiKey) {
    return res.status(401).json({
      status: 'error',
      message: 'API key is required'
    });
  }

  // Skip validation in development if API_KEY is not set
  if (!config.apiKey && config.nodeEnv === 'development') {
    console.warn('Warning: API key validation skipped in development');
    return next();
  }

  try {
    // Use timing-safe comparison to prevent timing attacks
    const expectedHash = crypto.createHash('sha256').update(config.apiKey).digest('hex');
    const receivedHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    
    if (crypto.timingSafeEqual(Buffer.from(expectedHash), Buffer.from(receivedHash))) {
      return next();
    }
  } catch (error) {
    console.error('Error during API key validation:', error);
  }

  // If we get here, authentication failed
  return res.status(401).json({
    status: 'error',
    message: 'Invalid API key'
  });
};


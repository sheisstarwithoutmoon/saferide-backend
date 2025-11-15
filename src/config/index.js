require('dotenv').config();

module.exports = {
  // Server Config
  PORT: process.env.PORT || 5000,
  HOST: process.env.HOST || '0.0.0.0', // Listen on all network interfaces
  NODE_ENV: process.env.NODE_ENV || 'development',

  // MongoDB Config
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/safe_ride',
  
  // JWT Config
  JWT_SECRET: process.env.JWT_SECRET || 'your_jwt_secret_key',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',

  // Redis Config
  REDIS: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || '',
  },

  // Firebase Config
  FIREBASE: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKeyPath: process.env.FIREBASE_PRIVATE_KEY_PATH,
  },

  // Twilio Config
  TWILIO: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
  },

  // App Settings
  MAX_EMERGENCY_CONTACTS: parseInt(process.env.MAX_EMERGENCY_CONTACTS) || 5,
  ALERT_TIMEOUT_SECONDS: parseInt(process.env.ALERT_TIMEOUT_SECONDS) || 15,
  LOCATION_UPDATE_INTERVAL_MS: parseInt(process.env.LOCATION_UPDATE_INTERVAL_MS) || 5000,

  // Rate Limiting
  RATE_LIMIT: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  },

  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
};

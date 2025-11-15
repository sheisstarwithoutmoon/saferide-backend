const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const connectDB = require('./config/database');
const { initializeFirebase } = require('./config/firebase');
const SocketHandler = require('./socket');

// Import routes
const userRoutes = require('./routes/userRoutes');
const alertRoutes = require('./routes/alertRoutes');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIO(server, {
  cors: {
    origin: config.CORS_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Middleware
app.use(helmet());
app.use(cors({ origin: config.CORS_ORIGIN }));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
if (config.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: config.RATE_LIMIT.windowMs,
  max: config.RATE_LIMIT.maxRequests,
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Make io accessible to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/alerts', alertRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(config.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Initialize services
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Initialize Firebase (optional - for FCM)
    try {
      initializeFirebase();
    } catch (firebaseError) {
      console.warn('⚠️  Firebase initialization failed. FCM notifications will not work.');
      console.warn('   Continuing without Firebase...');
    }

    // Initialize Socket.IO handlers
    new SocketHandler(io);

    // Start server
    server.listen(config.PORT, config.HOST, () => {
      console.log('');
      console.log('╔══════════════════════════════════════════════╗');
      console.log('║                                              ║');
      console.log('║      🚗 Safe Ride Backend Server Started    ║');
      console.log('║                                              ║');
      console.log('╚══════════════════════════════════════════════╝');
      console.log('');
      console.log(`🌐 Server:     http://${config.HOST}:${config.PORT}`);
      console.log(`📡 Socket.IO:  ws://${config.HOST}:${config.PORT}`);
      console.log(`🔧 Environment: ${config.NODE_ENV}`);
      console.log('');
      console.log('API Endpoints:');
      console.log(`  POST   /api/users/register`);
      console.log(`  GET    /api/users/profile`);
      console.log(`  POST   /api/users/emergency-contacts`);
      console.log(`  POST   /api/alerts`);
      console.log(`  POST   /api/alerts/:id/cancel`);
      console.log('');
      console.log('Socket.IO Events:');
      console.log(`  📤 emit: authenticate, location:update, emergency:create`);
      console.log(`  📥 on:   authenticated, emergency:alert, location_update`);
      console.log('');
      console.log('═══════════════════════════════════════════════');
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('💥 Unhandled Rejection:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('👋 SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Start the server
startServer();

module.exports = { app, server, io };

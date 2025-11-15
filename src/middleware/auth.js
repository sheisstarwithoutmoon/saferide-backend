const User = require('../models/User');

/**
 * Simple auth middleware - checks if user ID is provided
 * In production, use JWT tokens or similar
 */
const auth = async (req, res, next) => {
  try {
    // Get user ID from header or body
    const userId = req.headers['x-user-id'] || req.body.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ error: 'Invalid user' });
    }

    // Attach user info to request
    req.userId = userId;
    req.user = user;
    req.userPhoneNumber = user.phoneNumber;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

module.exports = auth;

const User = require('../models/User');
const { getFirebaseApp, admin } = require('../config/firebase');

/**
 * Auth middleware - verifies Firebase ID token or falls back to user ID (for backward compatibility)
 */
const auth = async (req, res, next) => {
  try {
    // Get Firebase ID token from Authorization header
    const authHeader = req.headers['authorization'];
    const firebaseToken = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    // Fallback: Get user ID from header (backward compatibility)
    const userId = req.headers['x-user-id'] || req.body.userId;

    // Try Firebase token verification first
    if (firebaseToken) {
      try {
        // Ensure Firebase is initialized
        getFirebaseApp();
        
        // Verify the Firebase ID token
        const decodedToken = await admin.auth().verifyIdToken(firebaseToken);
        const phoneNumber = decodedToken.phone_number;

        if (!phoneNumber) {
          return res.status(401).json({ error: 'Invalid token: phone number not found' });
        }

        // Find or create user by phone number
        let user = await User.findOne({ phoneNumber });
        
        if (!user) {
          // Auto-create user if they authenticated with Firebase but don't exist in DB
          user = new User({
            phoneNumber,
            name: decodedToken.name || '',
            firebaseUid: decodedToken.uid,
          });
          await user.save();
        }

        // Attach user info to request
        req.userId = user._id.toString();
        req.user = user;
        req.userPhoneNumber = user.phoneNumber;
        req.firebaseUid = decodedToken.uid;

        return next();
      } catch (firebaseError) {
        console.error('Firebase token verification failed:', firebaseError.message);
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
    }

    // Fallback to old method (backward compatibility - will be removed later)
    if (userId) {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(401).json({ error: 'Invalid user' });
      }

      req.userId = userId;
      req.user = user;
      req.userPhoneNumber = user.phoneNumber;

      return next();
    }

    // No authentication provided
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'Please provide either Firebase ID token (Authorization: Bearer <token>) or user ID (x-user-id header)'
    });

  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

module.exports = auth;

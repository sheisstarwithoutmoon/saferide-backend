const User = require('../models/User');

class UserController {
  /**
   * Register or login user
   */
  async registerOrLogin(req, res) {
    try {
      const { phoneNumber, name, fcmToken } = req.body;

      if (!phoneNumber) {
        return res.status(400).json({ error: 'Phone number is required' });
      }

      // Find or create user
      let user = await User.findOne({ phoneNumber });

      if (!user) {
        user = new User({
          phoneNumber,
          name: name || '',
          fcmToken: fcmToken || null,
        });
      } else {
        // Update FCM token and name if provided
        if (fcmToken) user.fcmToken = fcmToken;
        if (name) user.name = name;
      }

      user.lastSeen = new Date();
      await user.save();

      res.json({
        success: true,
        user: {
          id: user._id,
          phoneNumber: user.phoneNumber,
          name: user.name,
          emergencyContacts: user.emergencyContacts,
          settings: user.settings,
        },
      });
    } catch (error) {
      console.error('Error in registerOrLogin:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get user profile
   */
  async getProfile(req, res) {
    try {
      const user = await User.findById(req.userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        success: true,
        user: {
          id: user._id,
          phoneNumber: user.phoneNumber,
          name: user.name,
          emergencyContacts: user.emergencyContacts,
          settings: user.settings,
          isOnline: user.isOnline,
          lastSeen: user.lastSeen,
        },
      });
    } catch (error) {
      console.error('Error in getProfile:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(req, res) {
    try {
      const { name, fcmToken } = req.body;
      
      const user = await User.findById(req.userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (name) user.name = name;
      if (fcmToken) user.fcmToken = fcmToken;
      
      await user.save();

      res.json({
        success: true,
        user: {
          id: user._id,
          phoneNumber: user.phoneNumber,
          name: user.name,
        },
      });
    } catch (error) {
      console.error('Error in updateProfile:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Add emergency contact
   */
  async addEmergencyContact(req, res) {
    try {
      const { phoneNumber, name, relationship, isPrimary } = req.body;

      if (!phoneNumber) {
        return res.status(400).json({ error: 'Phone number is required' });
      }

      const user = await User.findById(req.userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Check if already exists
      const exists = user.emergencyContacts.some(c => c.phoneNumber === phoneNumber);
      if (exists) {
        return res.status(400).json({ error: 'Contact already exists' });
      }

      // If setting as primary, unset other primaries
      if (isPrimary) {
        user.emergencyContacts.forEach(c => c.isPrimary = false);
      }

      user.emergencyContacts.push({
        phoneNumber,
        name: name || '',
        relationship: relationship || '',
        isPrimary: isPrimary || false,
      });

      await user.save();

      res.json({
        success: true,
        emergencyContacts: user.emergencyContacts,
      });
    } catch (error) {
      console.error('Error in addEmergencyContact:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Remove emergency contact
   */
  async removeEmergencyContact(req, res) {
    try {
      const { contactId } = req.params;

      const user = await User.findById(req.userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      user.emergencyContacts = user.emergencyContacts.filter(
        c => c._id.toString() !== contactId
      );

      await user.save();

      res.json({
        success: true,
        emergencyContacts: user.emergencyContacts,
      });
    } catch (error) {
      console.error('Error in removeEmergencyContact:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Update user settings
   */
  async updateSettings(req, res) {
    try {
      const { autoSendAlert, alertCountdown, shareLocation, sendSMSFallback } = req.body;

      const user = await User.findById(req.userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (autoSendAlert !== undefined) user.settings.autoSendAlert = autoSendAlert;
      if (alertCountdown !== undefined) user.settings.alertCountdown = alertCountdown;
      if (shareLocation !== undefined) user.settings.shareLocation = shareLocation;
      if (sendSMSFallback !== undefined) user.settings.sendSMSFallback = sendSMSFallback;

      await user.save();

      res.json({
        success: true,
        settings: user.settings,
      });
    } catch (error) {
      console.error('Error in updateSettings:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new UserController();

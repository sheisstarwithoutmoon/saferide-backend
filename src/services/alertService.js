const User = require('../models/User');
const AccidentAlert = require('../models/AccidentAlert');
const fcmService = require('./fcmService');
const smsService = require('./smsService');

class AlertService {
  /**
   * Create and send accident alert
   */
  async createAccidentAlert(userId, alertData, io) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Create alert record
      const alert = new AccidentAlert({
        userId: user._id,
        userPhoneNumber: user.phoneNumber,
        severity: this.calculateSeverity(alertData.magnitude),
        magnitude: alertData.magnitude || 0,
        location: {
          latitude: alertData.latitude,
          longitude: alertData.longitude,
          address: alertData.address || '',
        },
        status: 'pending',
        metadata: {
          deviceInfo: alertData.deviceInfo,
          bluetoothDevice: alertData.bluetoothDevice,
          rawSensorData: alertData.rawSensorData,
        },
      });

      await alert.save();

      // Emit socket event to user
      if (user.socketId) {
        io.to(user.socketId).emit('alert:countdown_started', {
          alertId: alert._id,
          countdown: user.settings.alertCountdown,
        });
      }

      // Start countdown timer
      setTimeout(async () => {
        await this.processAlertAfterCountdown(alert._id, io);
      }, user.settings.alertCountdown * 1000);

      return alert;
    } catch (error) {
      console.error('❌ Error creating accident alert:', error);
      throw error;
    }
  }

  /**
   * Process alert after countdown expires
   */
  async processAlertAfterCountdown(alertId, io) {
    try {
      const alert = await AccidentAlert.findById(alertId).populate('userId');
      
      if (!alert || alert.status !== 'pending') {
        return; // Alert was cancelled or already processed
      }

      // Update alert status
      alert.status = 'sent';
      alert.sentAt = new Date();

      // Send notifications to emergency contacts
      const user = alert.userId;
      const notificationResults = [];

      for (const contact of user.emergencyContacts) {
        const result = await this.sendEmergencyNotification(contact, alert, user, io);
        notificationResults.push(result);
      }

      alert.notificationsSent = notificationResults;
      await alert.save();

      // Emit event to user
      if (user.socketId) {
        io.to(user.socketId).emit('alert:sent', {
          alertId: alert._id,
          notificationsSent: notificationResults.length,
        });
      }

      console.log(`✅ Emergency alert sent for alert ${alertId}`);
      return alert;
    } catch (error) {
      console.error('❌ Error processing alert after countdown:', error);
      throw error;
    }
  }

  /**
   * Send emergency notification to a contact
   */
  async sendEmergencyNotification(contact, alert, user, io) {
    const result = {
      contactPhoneNumber: contact.phoneNumber,
      method: null,
      status: 'failed',
      sentAt: new Date(),
      error: null,
    };

    try {
      // Check if contact has the app installed
      const contactUser = await User.findOne({ phoneNumber: contact.phoneNumber });

      const alertData = {
        alertId: alert._id.toString(),
        severity: alert.severity,
        magnitude: alert.magnitude,
        latitude: alert.location.latitude,
        longitude: alert.location.longitude,
        userPhoneNumber: user.phoneNumber,
        userName: user.name || 'Unknown',
      };

      if (contactUser && contactUser.fcmToken) {
        // Contact has app - send push notification
        try {
          await fcmService.sendEmergencyAlert(contactUser.fcmToken, alertData);
          result.method = 'push';
          result.status = 'sent';

          // Also send via Socket.io if online
          if (contactUser.socketId) {
            io.to(contactUser.socketId).emit('emergency:alert', {
              ...alertData,
              contactName: contact.name,
            });
          }
        } catch (fcmError) {
          console.error('FCM failed, falling back to SMS:', fcmError.message);
          // Fallback to SMS
          await this.sendSMSFallback(contact.phoneNumber, alertData, result);
        }
      } else {
        // Contact doesn't have app - send SMS
        await this.sendSMSFallback(contact.phoneNumber, alertData, result);
      }

      return result;
    } catch (error) {
      result.error = error.message;
      console.error(`❌ Error sending notification to ${contact.phoneNumber}:`, error);
      return result;
    }
  }

  /**
   * Send SMS fallback
   */
  async sendSMSFallback(phoneNumber, alertData, result) {
    try {
      await smsService.sendEmergencyAlertSMS(phoneNumber, alertData);
      result.method = 'sms';
      result.status = 'sent';
    } catch (smsError) {
      result.error = smsError.message;
      throw smsError;
    }
  }

  /**
   * Cancel accident alert
   */
  async cancelAlert(alertId, userId, io) {
    try {
      const alert = await AccidentAlert.findOne({ _id: alertId, userId });
      
      if (!alert) {
        throw new Error('Alert not found');
      }

      if (alert.status !== 'pending') {
        throw new Error('Alert cannot be cancelled');
      }

      alert.status = 'cancelled';
      alert.cancelledAt = new Date();
      await alert.save();

      const user = await User.findById(userId);

      // Notify emergency contacts that alert was cancelled
      for (const contact of user.emergencyContacts) {
        const contactUser = await User.findOne({ phoneNumber: contact.phoneNumber });
        
        if (contactUser && contactUser.fcmToken) {
          await fcmService.sendAlertCancelled(contactUser.fcmToken, {
            alertId: alert._id.toString(),
            userName: user.name,
          });

          if (contactUser.socketId) {
            io.to(contactUser.socketId).emit('emergency:cancelled', {
              alertId: alert._id.toString(),
            });
          }
        }
      }

      return alert;
    } catch (error) {
      console.error('❌ Error cancelling alert:', error);
      throw error;
    }
  }

  /**
   * Calculate severity based on magnitude
   */
  calculateSeverity(magnitude) {
    if (magnitude >= 80) return 'critical';
    if (magnitude >= 60) return 'severe';
    if (magnitude >= 40) return 'moderate';
    return 'minor';
  }

  /**
   * Update location for active alert
   */
  async updateAlertLocation(alertId, location, io) {
    try {
      const alert = await AccidentAlert.findById(alertId).populate('userId');
      
      if (!alert || alert.status === 'cancelled' || alert.status === 'resolved') {
        return;
      }

      alert.location = {
        ...alert.location,
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: new Date(),
      };
      await alert.save();

      // Notify emergency contacts
      const user = alert.userId;
      for (const contact of user.emergencyContacts) {
        const contactUser = await User.findOne({ phoneNumber: contact.phoneNumber });
        
        if (contactUser && contactUser.socketId) {
          io.to(contactUser.socketId).emit('emergency:location_update', {
            alertId: alert._id.toString(),
            latitude: location.latitude,
            longitude: location.longitude,
          });
        }
      }

      return alert;
    } catch (error) {
      console.error('❌ Error updating alert location:', error);
      throw error;
    }
  }
}

module.exports = new AlertService();

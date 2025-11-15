const { admin } = require('../config/firebase');

class FCMService {
  /**
   * Send push notification to a single device
   */
  async sendToDevice(fcmToken, notification, data = {}) {
    try {
      const message = {
        token: fcmToken,
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: {
          ...data,
          timestamp: new Date().toISOString(),
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'emergency_alerts',
            priority: 'high',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().send(message);
      console.log('✅ FCM notification sent:', response);
      return { success: true, messageId: response };
    } catch (error) {
      console.error('❌ Error sending FCM notification:', error);
      throw error;
    }
  }

  /**
   * Send push notification to multiple devices
   */
  async sendToMultipleDevices(fcmTokens, notification, data = {}) {
    try {
      const message = {
        tokens: fcmTokens,
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: {
          ...data,
          timestamp: new Date().toISOString(),
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'emergency_alerts',
            priority: 'high',
          },
        },
      };

      const response = await admin.messaging().sendMulticast(message);
      console.log(`✅ FCM notifications sent: ${response.successCount}/${fcmTokens.length}`);
      
      // Handle failed tokens
      if (response.failureCount > 0) {
        const failedTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(fcmTokens[idx]);
            console.error(`❌ Failed to send to token ${idx}:`, resp.error);
          }
        });
        return { success: true, failedTokens };
      }

      return { success: true, failedTokens: [] };
    } catch (error) {
      console.error('❌ Error sending multicast FCM notification:', error);
      throw error;
    }
  }

  /**
   * Send emergency alert notification
   */
  async sendEmergencyAlert(fcmToken, alertData) {
    const notification = {
      title: '🚨 EMERGENCY ALERT!',
      body: `${alertData.userName || 'Someone'} may have been in an accident. Immediate assistance needed!`,
    };

    const data = {
      type: 'emergency_alert',
      alertId: alertData.alertId,
      severity: alertData.severity,
      latitude: alertData.latitude?.toString() || '',
      longitude: alertData.longitude?.toString() || '',
      magnitude: alertData.magnitude?.toString() || '',
      userPhoneNumber: alertData.userPhoneNumber || '',
      userName: alertData.userName || '',
    };

    return this.sendToDevice(fcmToken, notification, data);
  }

  /**
   * Send location update notification
   */
  async sendLocationUpdate(fcmToken, locationData) {
    const data = {
      type: 'location_update',
      latitude: locationData.latitude?.toString() || '',
      longitude: locationData.longitude?.toString() || '',
      timestamp: new Date().toISOString(),
    };

    const notification = {
      title: 'Location Update',
      body: 'Live location updated',
    };

    return this.sendToDevice(fcmToken, notification, data);
  }

  /**
   * Send alert cancelled notification
   */
  async sendAlertCancelled(fcmToken, alertData) {
    const notification = {
      title: '✅ Alert Cancelled',
      body: `${alertData.userName || 'User'} has cancelled the emergency alert. They are safe.`,
    };

    const data = {
      type: 'alert_cancelled',
      alertId: alertData.alertId,
    };

    return this.sendToDevice(fcmToken, notification, data);
  }
}

module.exports = new FCMService();

const twilio = require('twilio');
const config = require('../config');

class SMSService {
  constructor() {
    this.client = twilio(config.TWILIO.accountSid, config.TWILIO.authToken);
    this.fromNumber = config.TWILIO.phoneNumber;
  }

  /**
   * Send SMS message
   */
  async sendSMS(to, message) {
    try {
      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: to,
      });

      console.log(`SMS sent to ${to}: ${result.sid}`);
      return { success: true, messageId: result.sid, status: result.status };
    } catch (error) {
      console.error(`Error sending SMS to ${to}:`, error.message);
      throw error;
    }
  }

  /**
   * Send emergency alert SMS
   */
  async sendEmergencyAlertSMS(to, alertData) {
    const locationUrl = alertData.latitude && alertData.longitude
      ? `https://maps.google.com/?q=${alertData.latitude},${alertData.longitude}`
      : 'Location unavailable';

    // Convert to Indian Standard Time
    const istTime = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    const message = `EMERGENCY ALERT!

${alertData.userName || 'Someone'} may have been in an accident!

Severity: ${alertData.severity || 'Unknown'}
Time: ${istTime}
Location: ${locationUrl}

Please check on them immediately!

- Safe Ride Alert System`;

    return this.sendSMS(to, message);
  }

  /**
   * Send alert cancelled SMS
   */
  async sendAlertCancelledSMS(to, alertData) {
    // Convert to Indian Standard Time
    const istTime = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    const message = `ALERT CANCELLED

${alertData.userName || 'User'} has cancelled the emergency alert. They are safe.

Time: ${istTime}

- Safe Ride Alert System`;

    return this.sendSMS(to, message);
  }

  /**
   * Send batch SMS to multiple recipients
   */
  async sendBatchSMS(recipients, message) {
    const promises = recipients.map(to => this.sendSMS(to, message));
    
    try {
      const results = await Promise.allSettled(promises);
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      console.log(`SMS Batch: ${successful} sent, ${failed} failed`);
      
      return {
        successful,
        failed,
        results: results.map((r, index) => ({
          to: recipients[index],
          success: r.status === 'fulfilled',
          error: r.status === 'rejected' ? r.reason.message : null,
        })),
      };
    } catch (error) {
      console.error('Error in batch SMS:', error);
      throw error;
    }
  }
}

module.exports = new SMSService();

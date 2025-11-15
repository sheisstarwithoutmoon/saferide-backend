const AccidentAlert = require('../models/AccidentAlert');
const alertService = require('../services/alertService');

class AlertController {
  /**
   * Create accident alert
   */
  async createAlert(req, res) {
    try {
      const { magnitude, latitude, longitude, address, deviceInfo, bluetoothDevice, rawSensorData } = req.body;

      if (!latitude || !longitude) {
        return res.status(400).json({ error: 'Location is required' });
      }

      const alert = await alertService.createAccidentAlert(req.userId, {
        magnitude,
        latitude,
        longitude,
        address,
        deviceInfo,
        bluetoothDevice,
        rawSensorData,
      }, req.io);

      res.json({
        success: true,
        alert: {
          id: alert._id,
          severity: alert.severity,
          status: alert.status,
          countdown: req.user?.settings?.alertCountdown || 15,
        },
      });
    } catch (error) {
      console.error('Error in createAlert:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Cancel accident alert
   */
  async cancelAlert(req, res) {
    try {
      const { alertId } = req.params;

      const alert = await alertService.cancelAlert(alertId, req.userId, req.io);

      res.json({
        success: true,
        alert: {
          id: alert._id,
          status: alert.status,
        },
      });
    } catch (error) {
      console.error('Error in cancelAlert:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }

  /**
   * Get alert details
   */
  async getAlert(req, res) {
    try {
      const { alertId } = req.params;

      const alert = await AccidentAlert.findById(alertId).populate('userId', 'name phoneNumber');

      if (!alert) {
        return res.status(404).json({ error: 'Alert not found' });
      }

      res.json({
        success: true,
        alert,
      });
    } catch (error) {
      console.error('Error in getAlert:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get user's alert history
   */
  async getAlertHistory(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;

      const alerts = await AccidentAlert.find({ userId: req.userId })
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .exec();

      const count = await AccidentAlert.countDocuments({ userId: req.userId });

      res.json({
        success: true,
        alerts,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
      });
    } catch (error) {
      console.error('Error in getAlertHistory:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Acknowledge alert (for emergency contacts)
   */
  async acknowledgeAlert(req, res) {
    try {
      const { alertId } = req.params;

      const alert = await AccidentAlert.findById(alertId);

      if (!alert) {
        return res.status(404).json({ error: 'Alert not found' });
      }

      alert.status = 'acknowledged';
      alert.acknowledgedAt = new Date();
      await alert.save();

      // Notify the driver that help is on the way
      if (req.io) {
        const user = await alert.populate('userId');
        if (user.userId.socketId) {
          req.io.to(user.userId.socketId).emit('alert:acknowledged', {
            alertId: alert._id,
            acknowledgedBy: req.userPhoneNumber,
          });
        }
      }

      res.json({
        success: true,
        alert,
      });
    } catch (error) {
      console.error('Error in acknowledgeAlert:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Update alert location
   */
  async updateLocation(req, res) {
    try {
      const { alertId } = req.params;
      const { latitude, longitude } = req.body;

      if (!latitude || !longitude) {
        return res.status(400).json({ error: 'Location is required' });
      }

      const alert = await alertService.updateAlertLocation(alertId, { latitude, longitude }, req.io);

      res.json({
        success: true,
        location: alert.location,
      });
    } catch (error) {
      console.error('Error in updateLocation:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get notification history for alerts received by this user
   * Shows alerts from emergency contacts where this user was notified
   */
  async getNotificationHistory(req, res) {
    try {
      const { page = 1, limit = 20, status } = req.query;
      const userPhone = req.user.phoneNumber;

      // Find alerts where this user's phone number is in the notificationsSent array
      // AND the alert was NOT created by this user (exclude own alerts)
      const query = {
        'notificationsSent.contactPhoneNumber': userPhone,
        userId: { $ne: req.userId }, // Exclude alerts created by this user
      };

      // Filter by status if provided
      if (status) {
        query.status = status;
      }

      const alerts = await AccidentAlert.find(query)
        .populate('userId', 'name phoneNumber')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .exec();

      const count = await AccidentAlert.countDocuments(query);

      // Format the response to include relevant notification details
      const formattedAlerts = alerts.map(alert => ({
        id: alert._id,
        type: 'received',
        severity: alert.severity,
        magnitude: alert.magnitude,
        status: alert.status,
        location: alert.location,
        user: {
          name: alert.userId.name,
          phoneNumber: alert.userId.phoneNumber,
        },
        sentAt: alert.sentAt,
        acknowledgedAt: alert.acknowledgedAt,
        myNotification: alert.notificationsSent.find(n => n.contactPhoneNumber === userPhone),
        createdAt: alert.createdAt,
      }));

      res.json({
        success: true,
        notifications: formattedAlerts,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        total: count,
      });
    } catch (error) {
      console.error('Error in getNotificationHistory:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get all notifications (sent and received)
   */
  async getAllNotifications(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const userPhone = req.user.phoneNumber;

      // Find alerts where user is either the creator OR was notified
      const sentAlerts = await AccidentAlert.find({ userId: req.userId })
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const receivedAlerts = await AccidentAlert.find({
        'notificationsSent.contactPhoneNumber': userPhone,
        userId: { $ne: req.userId }, // Exclude own alerts
      })
        .populate('userId', 'name phoneNumber')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      // Combine and sort
      const allAlerts = [...sentAlerts, ...receivedAlerts]
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, limit);

      const formatted = allAlerts.map(alert => ({
        id: alert._id,
        type: alert.userId.toString() === req.userId ? 'sent' : 'received',
        severity: alert.severity,
        magnitude: alert.magnitude,
        status: alert.status,
        location: alert.location,
        user: alert.userId.name ? {
          name: alert.userId.name,
          phoneNumber: alert.userId.phoneNumber,
        } : null,
        sentAt: alert.sentAt,
        acknowledgedAt: alert.acknowledgedAt,
        createdAt: alert.createdAt,
      }));

      res.json({
        success: true,
        notifications: formatted,
        currentPage: parseInt(page),
      });
    } catch (error) {
      console.error('Error in getAllNotifications:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get sent notifications (alerts created by this user)
   */
  async getSentNotifications(req, res) {
    try {
      const { page = 1, limit = 20, status } = req.query;

      const query = { userId: req.userId };

      // Filter by status if provided
      if (status) {
        query.status = status;
      }

      const alerts = await AccidentAlert.find(query)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .exec();

      const count = await AccidentAlert.countDocuments(query);

      // Format the response
      const formattedAlerts = alerts.map(alert => ({
        id: alert._id,
        type: 'sent',
        severity: alert.severity,
        magnitude: alert.magnitude,
        status: alert.status,
        location: alert.location,
        sentAt: alert.sentAt,
        cancelledAt: alert.cancelledAt,
        acknowledgedAt: alert.acknowledgedAt,
        notificationsSent: alert.notificationsSent,
        createdAt: alert.createdAt,
      }));

      res.json({
        success: true,
        notifications: formattedAlerts,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        total: count,
      });
    } catch (error) {
      console.error('Error in getSentNotifications:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new AlertController();

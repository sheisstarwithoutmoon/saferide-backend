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
}

module.exports = new AlertController();

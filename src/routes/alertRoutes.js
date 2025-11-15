const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const auth = require('../middleware/auth');

// All alert routes require authentication
router.use(auth);

// Create and manage alerts
router.post('/', alertController.createAlert);
router.post('/:alertId/cancel', alertController.cancelAlert);
router.get('/:alertId', alertController.getAlert);
router.post('/:alertId/acknowledge', alertController.acknowledgeAlert);
router.put('/:alertId/location', alertController.updateLocation);

// Notification history
router.get('/notifications/received', alertController.getNotificationHistory);
router.get('/notifications/all', alertController.getAllNotifications);

// Alert history (must be last to avoid route conflicts)
router.get('/', alertController.getAlertHistory);

module.exports = router;

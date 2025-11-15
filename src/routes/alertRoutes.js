const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const auth = require('../middleware/auth');

// All alert routes require authentication
router.use(auth);

router.post('/', alertController.createAlert);
router.post('/:alertId/cancel', alertController.cancelAlert);
router.get('/:alertId', alertController.getAlert);
router.get('/', alertController.getAlertHistory);
router.post('/:alertId/acknowledge', alertController.acknowledgeAlert);
router.put('/:alertId/location', alertController.updateLocation);

module.exports = router;

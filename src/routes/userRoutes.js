const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');

// Public routes
router.post('/register', userController.registerOrLogin);

// Protected routes
router.get('/profile', auth, userController.getProfile);
router.put('/profile', auth, userController.updateProfile);

// Emergency contacts
router.post('/emergency-contacts', auth, userController.addEmergencyContact);
router.delete('/emergency-contacts/:contactId', auth, userController.removeEmergencyContact);

// Settings
router.put('/settings', auth, userController.updateSettings);

module.exports = router;

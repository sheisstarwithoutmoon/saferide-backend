const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    match: /^\+?[1-9]\d{1,14}$/, // E.164 format
  },
  name: {
    type: String,
    trim: true,
  },
  fcmToken: {
    type: String,
    default: null,
  },
  emergencyContacts: [{
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
    relationship: {
      type: String,
      trim: true,
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  isOnline: {
    type: Boolean,
    default: false,
  },
  lastSeen: {
    type: Date,
    default: Date.now,
  },
  socketId: {
    type: String,
    default: null,
  },
  settings: {
    autoSendAlert: {
      type: Boolean,
      default: true,
    },
    alertCountdown: {
      type: Number,
      default: 15, // seconds
    },
    shareLocation: {
      type: Boolean,
      default: true,
    },
    sendSMSFallback: {
      type: Boolean,
      default: true,
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update timestamps before saving
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Indexes
userSchema.index({ phoneNumber: 1 });
userSchema.index({ fcmToken: 1 });
userSchema.index({ 'emergencyContacts.phoneNumber': 1 });

module.exports = mongoose.model('User', userSchema);

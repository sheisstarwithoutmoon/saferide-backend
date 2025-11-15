const mongoose = require('mongoose');

const accidentAlertSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  userPhoneNumber: {
    type: String,
    required: true,
  },
  severity: {
    type: String,
    enum: ['minor', 'moderate', 'severe', 'critical'],
    default: 'moderate',
  },
  magnitude: {
    type: Number,
    default: 0,
  },
  location: {
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    address: {
      type: String,
      default: '',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  status: {
    type: String,
    enum: ['pending', 'cancelled', 'sent', 'acknowledged', 'resolved'],
    default: 'pending',
  },
  countdownStartedAt: {
    type: Date,
    default: Date.now,
  },
  cancelledAt: {
    type: Date,
    default: null,
  },
  sentAt: {
    type: Date,
    default: null,
  },
  acknowledgedAt: {
    type: Date,
    default: null,
  },
  notificationsSent: [{
    contactPhoneNumber: String,
    method: {
      type: String,
      enum: ['push', 'sms', 'call'],
    },
    status: {
      type: String,
      enum: ['sent', 'failed', 'delivered'],
    },
    sentAt: Date,
    error: String,
  }],
  metadata: {
    deviceInfo: String,
    bluetoothDevice: String,
    rawSensorData: mongoose.Schema.Types.Mixed,
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

// Indexes
accidentAlertSchema.index({ userId: 1, createdAt: -1 });
accidentAlertSchema.index({ status: 1 });
accidentAlertSchema.index({ userPhoneNumber: 1 });

// Update timestamp before saving
accidentAlertSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('AccidentAlert', accidentAlertSchema);

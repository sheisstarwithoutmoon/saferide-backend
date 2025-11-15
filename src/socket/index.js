const User = require('../models/User');
const alertService = require('../services/alertService');

class SocketHandler {
  constructor(io) {
    this.io = io;
    this.setupSocketEvents();
  }

  setupSocketEvents() {
    this.io.on('connection', (socket) => {
      console.log(`🔌 Client connected: ${socket.id}`);

      // Handle user authentication
      socket.on('authenticate', async (data) => {
        try {
          const { userId, phoneNumber } = data;
          
          if (!userId && !phoneNumber) {
            socket.emit('error', { message: 'User ID or phone number required' });
            return;
          }

          let user;
          if (userId) {
            user = await User.findById(userId);
          } else if (phoneNumber) {
            user = await User.findOne({ phoneNumber });
          }

          if (!user) {
            socket.emit('error', { message: 'User not found' });
            return;
          }

          // Update user's socket ID and online status
          user.socketId = socket.id;
          user.isOnline = true;
          user.lastSeen = new Date();
          await user.save();

          socket.userId = user._id.toString();
          socket.userPhoneNumber = user.phoneNumber;

          socket.emit('authenticated', {
            userId: user._id,
            phoneNumber: user.phoneNumber,
            name: user.name,
          });

          console.log(`✅ User authenticated: ${user.phoneNumber} (${socket.id})`);
        } catch (error) {
          console.error('Socket authentication error:', error);
          socket.emit('error', { message: 'Authentication failed' });
        }
      });

      // Handle location updates
      socket.on('location:update', async (data) => {
        try {
          if (!socket.userId) {
            socket.emit('error', { message: 'Not authenticated' });
            return;
          }

          const { latitude, longitude, alertId } = data;

          if (alertId) {
            // Update location for active alert
            await alertService.updateAlertLocation(alertId, { latitude, longitude }, this.io);
          }

          // Broadcast to emergency contacts if they're connected
          const user = await User.findById(socket.userId);
          for (const contact of user.emergencyContacts) {
            const contactUser = await User.findOne({ phoneNumber: contact.phoneNumber });
            if (contactUser && contactUser.socketId) {
              this.io.to(contactUser.socketId).emit('contact:location_update', {
                userId: user._id,
                phoneNumber: user.phoneNumber,
                name: user.name,
                latitude,
                longitude,
                timestamp: new Date(),
              });
            }
          }
        } catch (error) {
          console.error('Location update error:', error);
          socket.emit('error', { message: 'Location update failed' });
        }
      });

      // Handle emergency alert creation
      socket.on('emergency:create', async (data) => {
        try {
          if (!socket.userId) {
            socket.emit('error', { message: 'Not authenticated' });
            return;
          }

          const alert = await alertService.createAccidentAlert(socket.userId, data, this.io);

          socket.emit('emergency:created', {
            alertId: alert._id,
            countdown: alert.userId.settings?.alertCountdown || 15,
          });
        } catch (error) {
          console.error('Emergency creation error:', error);
          socket.emit('error', { message: 'Failed to create emergency alert' });
        }
      });

      // Handle emergency alert cancellation
      socket.on('emergency:cancel', async (data) => {
        try {
          if (!socket.userId) {
            socket.emit('error', { message: 'Not authenticated' });
            return;
          }

          const { alertId } = data;
          await alertService.cancelAlert(alertId, socket.userId, this.io);

          socket.emit('emergency:cancelled', { alertId });
        } catch (error) {
          console.error('Emergency cancellation error:', error);
          socket.emit('error', { message: 'Failed to cancel alert' });
        }
      });

      // Handle alert acknowledgment
      socket.on('emergency:acknowledge', async (data) => {
        try {
          if (!socket.userId) {
            socket.emit('error', { message: 'Not authenticated' });
            return;
          }

          const { alertId } = data;
          const alert = await AccidentAlert.findById(alertId).populate('userId');

          if (!alert) {
            socket.emit('error', { message: 'Alert not found' });
            return;
          }

          alert.status = 'acknowledged';
          alert.acknowledgedAt = new Date();
          await alert.save();

          // Notify the driver
          if (alert.userId.socketId) {
            this.io.to(alert.userId.socketId).emit('alert:acknowledged', {
              alertId: alert._id,
              acknowledgedBy: socket.userPhoneNumber,
            });
          }

          socket.emit('emergency:acknowledged', { alertId });
        } catch (error) {
          console.error('Emergency acknowledgment error:', error);
          socket.emit('error', { message: 'Failed to acknowledge alert' });
        }
      });

      // Handle typing indicator for chat (future feature)
      socket.on('typing', (data) => {
        socket.broadcast.emit('user:typing', {
          userId: socket.userId,
          isTyping: data.isTyping,
        });
      });

      // Handle disconnect
      socket.on('disconnect', async () => {
        try {
          if (socket.userId) {
            const user = await User.findById(socket.userId);
            if (user) {
              user.isOnline = false;
              user.lastSeen = new Date();
              user.socketId = null;
              await user.save();

              console.log(`👋 User disconnected: ${user.phoneNumber} (${socket.id})`);
            }
          } else {
            console.log(`👋 Client disconnected: ${socket.id}`);
          }
        } catch (error) {
          console.error('Disconnect handling error:', error);
        }
      });
    });
  }
}

module.exports = SocketHandler;

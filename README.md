# Safe Ride Backend API

Complete backend server for the Safe Ride Accident Detection System with real-time emergency alerts.

## 🚀 Features

- ✅ Express.js REST API
- ✅ MongoDB for data storage
- ✅ Socket.IO for real-time bidirectional communication
- ✅ Firebase Cloud Messaging (FCM) for push notifications
- ✅ Twilio SMS fallback
- ✅ Redis support (optional)
- ✅ Rate limiting
- ✅ Authentication middleware
- ✅ Error handling

## 📋 Prerequisites

- Node.js >= 18.0.0
- MongoDB (local or Atlas)
- Firebase project (for FCM)
- Twilio account (for SMS fallback)
- Redis (optional, for session management)

## 🛠️ Installation

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Setup MongoDB

**Option A: Local MongoDB**
```bash
# Install MongoDB on your system
# Windows: https://www.mongodb.com/try/download/community
# Mac: brew install mongodb-community
# Linux: sudo apt-get install mongodb

# Start MongoDB
mongod
```

**Option B: MongoDB Atlas (Cloud)**
1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free cluster
3. Get your connection string
4. Update `.env` file

### 3. Setup Firebase

1. Go to Firebase Console: https://console.firebase.google.com
2. Select your project: `alpha-flutter-health`
3. Go to Project Settings > Service Accounts
4. Click "Generate new private key"
5. Save the JSON file as `firebase-service-account.json` in the `backend/` folder

### 4. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and update:
```env
NODE_ENV=development
PORT=5000

# MongoDB - Update this
MONGODB_URI=mongodb://localhost:27017/safe_ride

# JWT Secret - Change this!
JWT_SECRET=your_very_secret_key_change_this

# Firebase
FIREBASE_PROJECT_ID=alpha-flutter-health
FIREBASE_PRIVATE_KEY_PATH=./firebase-service-account.json



## 🚀 Running the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

Server will start on: `http://localhost:5000`

## 📡 API Endpoints

### User Endpoints

**Register/Login**
```http
POST /api/users/register
Content-Type: application/json

{
  "phoneNumber": "+916261795658",
  "name": "John Doe",
  "fcmToken": "firebase_token_here"
}
```

**Get Profile**
```http
GET /api/users/profile
x-user-id: user_id_here
```

**Add Emergency Contact**
```http
POST /api/users/emergency-contacts
x-user-id: user_id_here
Content-Type: application/json

{
  "phoneNumber": "+919876543210",
  "name": "Jane Doe",
  "relationship": "Wife",
  "isPrimary": true
}
```

**Update Settings**
```http
PUT /api/users/settings
x-user-id: user_id_here
Content-Type: application/json

{
  "autoSendAlert": true,
  "alertCountdown": 15,
  "shareLocation": true,
  "sendSMSFallback": true
}
```

### Alert Endpoints

**Create Alert**
```http
POST /api/alerts
x-user-id: user_id_here
Content-Type: application/json

{
  "magnitude": 75,
  "latitude": 23.2599,
  "longitude": 77.4126,
  "address": "Bhopal, MP",
  "deviceInfo": "Samsung M556B",
  "bluetoothDevice": "HC-05"
}
```

**Cancel Alert**
```http
POST /api/alerts/:alertId/cancel
x-user-id: user_id_here
```

**Get Alert History**
```http
GET /api/alerts?page=1&limit=20
x-user-id: user_id_here
```

## 🔌 Socket.IO Events

### Client → Server

**Authenticate**
```javascript
socket.emit('authenticate', {
  userId: 'user_id_here',
  phoneNumber: '+916261795658'
});
```

**Create Emergency**
```javascript
socket.emit('emergency:create', {
  magnitude: 80,
  latitude: 23.2599,
  longitude: 77.4126
});
```

**Update Location**
```javascript
socket.emit('location:update', {
  latitude: 23.2599,
  longitude: 77.4126,
  alertId: 'alert_id_if_active'
});
```

**Cancel Emergency**
```javascript
socket.emit('emergency:cancel', {
  alertId: 'alert_id_here'
});
```

### Server → Client

**Authentication Success**
```javascript
socket.on('authenticated', (data) => {
  console.log('Authenticated:', data);
});
```

**Emergency Alert Received**
```javascript
socket.on('emergency:alert', (data) => {
  console.log('Emergency Alert:', data);
  // data contains: alertId, severity, latitude, longitude, userPhoneNumber, userName
});
```

**Alert Countdown Started**
```javascript
socket.on('alert:countdown_started', (data) => {
  console.log('Countdown started:', data.countdown);
});
```

**Alert Sent**
```javascript
socket.on('alert:sent', (data) => {
  console.log('Alert sent to emergency contacts');
});
```

**Alert Cancelled**
```javascript
socket.on('emergency:cancelled', (data) => {
  console.log('Alert was cancelled');
});
```

**Location Update**
```javascript
socket.on('emergency:location_update', (data) => {
  console.log('Location updated:', data.latitude, data.longitude);
});
```

## 🗄️ Database Schema

### User
- `phoneNumber`: String (unique)
- `name`: String
- `fcmToken`: String
- `emergencyContacts`: Array
- `settings`: Object
- `isOnline`: Boolean
- `socketId`: String

### AccidentAlert
- `userId`: ObjectId
- `severity`: String (minor, moderate, severe, critical)
- `magnitude`: Number
- `location`: Object {latitude, longitude, address}
- `status`: String (pending, cancelled, sent, acknowledged, resolved)
- `notificationsSent`: Array
- `metadata`: Object

## 🧪 Testing with Postman

1. Import the API endpoints into Postman
2. Register a user: `POST /api/users/register`
3. Copy the returned `userId`
4. Add emergency contacts
5. Create an alert
6. Check MongoDB to see the data

## 🔍 Testing Socket.IO

Use https://www.websocket.org/echo.html or Socket.IO client:

```javascript
const socket = io('http://localhost:5000');

socket.on('connect', () => {
  console.log('Connected');
  
  socket.emit('authenticate', {
    phoneNumber: '+916261795658'
  });
});

socket.on('authenticated', (data) => {
  console.log('Authenticated:', data);
});
```

## 📦 Project Structure

```
backend/
├── src/
│   ├── config/           # Configuration files
│   ├── controllers/      # Route controllers
│   ├── models/          # MongoDB models
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── middleware/      # Custom middleware
│   ├── socket/          # Socket.IO handlers
│   └── server.js        # Main server file
├── package.json
├── .env
└── README.md
```

## 🐛 Troubleshooting

**MongoDB Connection Error**
- Make sure MongoDB is running: `mongod`
- Check connection string in `.env`

**Firebase Error**
- Ensure `firebase-service-account.json` is in the backend folder
- Check file path in `.env`

**Socket.IO Not Connecting**
- Check CORS settings
- Verify port is not in use
- Check firewall settings

## 📝 License

MIT

## 👨‍💻 Author

Safe Ride Team

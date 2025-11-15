# Firebase Service Account Setup Instructions

## ⚠️ IMPORTANT: Your backend is running but FCM won't work without this file!

### Current Status:
- ✅ Backend server: Running on http://localhost:5000
- ✅ MongoDB: Connected
- ❌ Firebase: Missing service account file

### How to Get Firebase Service Account:

1. **Open Firebase Console:**
   - Go to: https://console.firebase.google.com
   - Login with your Google account

2. **Select Your Project:**
   - Click on project: **alpha-flutter-health**

3. **Navigate to Service Accounts:**
   - Click ⚙️ (Settings icon) in left sidebar
   - Click **Project Settings**
   - Click **Service Accounts** tab

4. **Generate Private Key:**
   - Scroll down to "Firebase Admin SDK"
   - Click **Generate new private key** button
   - Click **Generate key** in confirmation dialog
   - A JSON file will download (e.g., `alpha-flutter-health-firebase-adminsdk-xxxxx.json`)

5. **Rename and Place File:**
   ```powershell
   # Rename the downloaded file to:
   firebase-service-account.json
   
   # Place it in:
   c:\flutter_projects\safe_ride\backend\firebase-service-account.json
   ```

6. **Restart Backend:**
   ```powershell
   # Stop current server (Ctrl+C in terminal)
   # Then restart:
   cd c:\flutter_projects\safe_ride\backend
   npm start
   ```

### Expected Output After Fix:
```
✅ MongoDB Connected: localhost
✅ Firebase Admin initialized successfully
🚗 Safe Ride Backend Server Started
```

### Alternative: Use Test Mode (No FCM)

If you just want to test the API without push notifications:

1. Backend will work for:
   - ✅ User registration
   - ✅ Emergency contacts
   - ✅ Alert creation
   - ✅ Socket.IO real-time updates
   - ❌ Push notifications (won't send)

2. You can still test the flow, just won't receive actual push notifications

### Verify Setup:

Once you add the file, test with:

```powershell
# Test API endpoint
curl http://localhost:5000/api/users/register -X POST -H "Content-Type: application/json" -d "{\"phoneNumber\":\"+916261795658\",\"name\":\"Test User\"}"
```

Should return: `{"success":true,"user":{...}}`

---

**After adding the file, your app will be able to send FREE push notifications! 🎉**

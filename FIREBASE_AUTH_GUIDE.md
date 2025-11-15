# Firebase Authentication Integration Guide

## Overview

The backend now supports Firebase Authentication for secure phone number verification with OTP.

## How It Works

1. **Client Side**: User authenticates with Firebase Auth (gets OTP via SMS - FREE)
2. **Client**: Sends Firebase ID token to backend
3. **Backend**: Verifies token with Firebase Admin SDK
4. **Backend**: Returns user data or creates new user

## Client Implementation (Flutter/Mobile)

### 1. Add Firebase Auth to your Flutter app

```yaml
# pubspec.yaml
dependencies:
  firebase_auth: ^4.15.0
  firebase_core: ^2.24.0
```

### 2. Initialize Firebase in your app

```dart
import 'package:firebase_core/firebase_core.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  runApp(MyApp());
}
```

### 3. Phone Authentication Flow

```dart
import 'package:firebase_auth/firebase_auth.dart';

class AuthService {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  
  // Step 1: Send OTP to phone number
  Future<void> sendOTP(String phoneNumber) async {
    await _auth.verifyPhoneNumber(
      phoneNumber: phoneNumber, // Must be in E.164 format: +916261795658
      verificationCompleted: (PhoneAuthCredential credential) async {
        // Auto-verification (Android only)
        await _auth.signInWithCredential(credential);
      },
      verificationFailed: (FirebaseAuthException e) {
        print('Verification failed: ${e.message}');
      },
      codeSent: (String verificationId, int? resendToken) {
        // Save verificationId for later use
        this.verificationId = verificationId;
      },
      codeAutoRetrievalTimeout: (String verificationId) {
        this.verificationId = verificationId;
      },
      timeout: Duration(seconds: 60),
    );
  }
  
  // Step 2: Verify OTP and sign in
  Future<String?> verifyOTP(String smsCode) async {
    try {
      PhoneAuthCredential credential = PhoneAuthProvider.credential(
        verificationId: verificationId!,
        smsCode: smsCode,
      );
      
      UserCredential userCredential = await _auth.signInWithCredential(credential);
      
      // Get Firebase ID token
      String? idToken = await userCredential.user?.getIdToken();
      return idToken;
    } catch (e) {
      print('Error verifying OTP: $e');
      return null;
    }
  }
  
  // Step 3: Register/Login with backend
  Future<void> registerWithBackend(String firebaseToken, String name) async {
    final response = await http.post(
      Uri.parse('https://saferide-backend-04w2.onrender.com/api/users/register'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'firebaseToken': firebaseToken,
        'name': name,
        'fcmToken': 'your_fcm_token_here', // Optional
      }),
    );
    
    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      // Save user data
      print('User registered: ${data['user']}');
    }
  }
}
```

## API Usage

### 1. Register/Login (NEW - with Firebase)

**Endpoint:** `POST /api/users/register`

**Request:**
```json
{
  "firebaseToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjFkYzBmM...",
  "name": "John Doe",
  "fcmToken": "device_fcm_token_here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Authenticated with Firebase",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "phoneNumber": "+916261795658",
    "name": "John Doe",
    "emergencyContacts": [],
    "settings": {...}
  }
}
```

### 2. Authenticated Requests (NEW - with Firebase token)

**All protected endpoints now accept Firebase token:**

```http
GET /api/users/profile
Authorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IjFkYzBmM...
```

**Example:**
```dart
final idToken = await FirebaseAuth.instance.currentUser?.getIdToken();

final response = await http.get(
  Uri.parse('https://saferide-backend-04w2.onrender.com/api/users/profile'),
  headers: {
    'Authorization': 'Bearer $idToken',
  },
);
```

## Backward Compatibility

The old method still works (for existing users):

**Old method:**
```http
POST /api/users/register
Content-Type: application/json

{
  "phoneNumber": "+916261795658",
  "name": "John Doe"
}
```

**Old auth:**
```http
GET /api/users/profile
x-user-id: 507f1f77bcf86cd799439011
```

## Benefits

✅ **FREE** - Firebase provides generous free tier for phone auth
✅ **Secure** - Industry-standard authentication
✅ **OTP via SMS** - Automatic SMS sending by Firebase
✅ **No backend changes needed** - Works on Render without extra config
✅ **Rate limiting** - Built-in by Firebase
✅ **Easy to use** - Simple client SDK

## Firebase Console Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select project: `alpha-flutter-health`
3. Go to **Authentication** → **Sign-in method**
4. Enable **Phone** provider
5. Add your app's SHA-256 fingerprint (for Android)
6. Done! No additional config needed on backend

## Environment Variables (Already Set on Render)

Your Render deployment already has:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

No changes needed!

## Testing

Test with curl:
```bash
# 1. Get Firebase token from your mobile app after OTP verification
# 2. Test register endpoint
curl -X POST https://saferide-backend-04w2.onrender.com/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "firebaseToken": "YOUR_FIREBASE_ID_TOKEN",
    "name": "Test User"
  }'

# 3. Test authenticated endpoint
curl https://saferide-backend-04w2.onrender.com/api/users/profile \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN"
```

## Migration Strategy

1. **Phase 1** (Now): Both old and new auth work
2. **Phase 2**: Update mobile app to use Firebase Auth
3. **Phase 3**: Gradually migrate existing users
4. **Phase 4**: Remove old auth method (optional)

## Questions?

The implementation is backward compatible - existing users can continue using the old method while new users use Firebase Auth.

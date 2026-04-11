# Firebase Push Notification Integration — Frontend Guide

This document explains how to integrate Firebase Cloud Messaging (FCM) with the Zenova backend from any frontend (Flutter, React Native, Web).

---

## How It Works

1. Frontend gets a **device FCM token** from Firebase SDK on app launch / login
2. Token is sent to the backend during **sign-in** or **OTP verification** (as a string or array)
3. Token can also be registered via **GET /me** (useful after token refresh)
4. Backend stores all tokens in `user.fcmTokens[]` (duplicates are ignored automatically)
5. Backend sends push notifications to all stored tokens for that user

---

## Endpoints That Accept FCM Tokens

| Endpoint | Field | Location | Type |
|---|---|---|---|
| `POST /api/auth/signin` | `fcmTokens` | body | `string` or `string[]` |
| `POST /api/auth/google` | `fcmTokens` | body | `string` or `string[]` |
| `POST /api/auth/apple` | `fcmTokens` | body | `string` or `string[]` |
| `POST /api/otp/verify-otp` | `fcmTokens` | body | `string` or `string[]` |
| `GET /api/auth/me` | `fcmToken` | query param | `string` |

---

### 1. Sign In — `POST /api/auth/signin`

```json
{
  "email": "user@example.com",
  "password": "yourpassword",
  "fcmTokens": "device_fcm_token"
}
```

### 2. Verify OTP — `POST /api/otp/verify-otp`

```json
{
  "email": "user@example.com",
  "otp": "123456",
  "type": "LOGIN",
  "fcmTokens": "device_fcm_token"
}
```

### 3. Get Current User — `GET /api/auth/me?fcmToken=<token>`

Useful to register/refresh the token without signing in again.

```
GET /api/auth/me?fcmToken=your_device_fcm_token
Authorization: Bearer <accessToken>
```

---

## Flutter Integration

### Step 1 — Add dependencies

```yaml
# pubspec.yaml
dependencies:
  firebase_core: latest
  firebase_messaging: latest
```

### Step 2 — Initialize Firebase & request permission

```dart
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

// In main()
await Firebase.initializeApp();

Future<String?> getFcmToken() async {
  final messaging = FirebaseMessaging.instance;

  // Request permission (required on iOS)
  final settings = await messaging.requestPermission();
  if (settings.authorizationStatus != AuthorizationStatus.authorized) {
    return null; // User denied
  }

  return await messaging.getToken();
}
```

### Step 3 — Send token during sign-in (password flow)

```dart
Future<void> signIn(String email, String password) async {
  final fcmToken = await getFcmToken();

  final response = await http.post(
    Uri.parse('https://your-api.com/api/auth/signin'),
    headers: {'Content-Type': 'application/json'},
    body: jsonEncode({
      'email': email,
      'password': password,
      'fcmTokens': fcmToken ?? '',
    }),
  );

  final data = jsonDecode(response.body);
  // data['data']['user']['fcmTokens'] contains the saved tokens
}
```

### Step 4 — Send token during OTP verification

```dart
Future<void> verifyOtp(String email, String otp) async {
  final fcmToken = await getFcmToken();

  final response = await http.post(
    Uri.parse('https://your-api.com/api/otp/verify-otp'),
    headers: {'Content-Type': 'application/json'},
    body: jsonEncode({
      'email': email,
      'otp': otp,
      'type': 'LOGIN',
      'fcmTokens': fcmToken ?? '',
    }),
  );

  final data = jsonDecode(response.body);
  // data['data']['user']['fcmTokens'] contains the saved tokens
}
```

### Step 5 — Handle FCM token refresh

FCM tokens can rotate. Listen for updates and re-register via `/me`:

```dart
void setupTokenRefreshListener(String accessToken) {
  FirebaseMessaging.instance.onTokenRefresh.listen((newToken) async {
    final uri = Uri.parse(
      'https://your-api.com/api/auth/me?fcmToken=$newToken',
    );
    await http.get(uri, headers: {'Authorization': 'Bearer $accessToken'});
  });
}
```

### Step 6 — Handle foreground notifications

```dart
void setupForegroundNotificationHandler() {
  FirebaseMessaging.onMessage.listen((RemoteMessage message) {
    final title = message.notification?.title;
    final body = message.notification?.body;
    final data = message.data;

    // Show local notification or update UI
    print('Notification: $title - $body');
    print('Data: $data');
  });
}
```

### Step 7 — Handle background / terminated tap

```dart
// Background tap
FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
  // Navigate based on message.data
});

// App opened from terminated state via notification
final initialMessage = await FirebaseMessaging.instance.getInitialMessage();
if (initialMessage != null) {
  // Handle deep link
}
```

---

## Notification Payload Structure

When a push is received on the device:

```json
{
  "notification": {
    "title": "Notification Title",
    "body": "Notification body text"
  },
  "data": {
    "key": "value",
    "timestamp": "2026-04-11T10:00:00.000Z"
  }
}
```

Android extras:
- `sound`: `"default"`
- `clickAction`: `"FLUTTER_NOTIFICATION_CLICK"`

iOS (APNS) extras:
- `sound`: `"default"`
- `content-available`: `1`

---

## Notes

- `fcmTokens` accepts a **string or array** — backend normalizes both
- Duplicate tokens are automatically ignored (JS `Set` deduplication)
- Tokens persist across sessions; they are tied to the user account
- Always handle the case where `getFcmToken()` returns `null` (user denied permission)
- FCM tokens rotate periodically — use the `onTokenRefresh` listener to keep them updated

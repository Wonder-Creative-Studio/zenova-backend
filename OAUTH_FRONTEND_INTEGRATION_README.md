# OAuth Integration Guide for Flutter

This guide is for the Flutter/frontend developer integrating Google Sign-In, Apple Sign-In, OTP login, and onboarding with this backend.

Base API URL:

```text
http://localhost:666/api
```

## Backend Endpoints

Google login:

```http
POST /api/auth/google
Content-Type: application/json
```

Body:

```json
{
  "idToken": "GOOGLE_ID_TOKEN",
  "fcmTokens": ["FCM_TOKEN_OPTIONAL"],
  "location": {
    "type": "Point",
    "coordinates": [72.8777, 19.0760]
  }
}
```

Apple login:

```http
POST /api/auth/apple
Content-Type: application/json
```

Body:

```json
{
  "identityToken": "APPLE_IDENTITY_TOKEN",
  "email": "optional-first-login@email.com",
  "fullName": "Optional Apple User Name",
  "fcmTokens": ["FCM_TOKEN_OPTIONAL"],
  "location": {
    "type": "Point",
    "coordinates": [72.8777, 19.0760]
  }
}
```

Password login:

```http
POST /api/auth/signin
Content-Type: application/json
```

Body:

```json
{
  "email": "user@example.com",
  "password": "secret123",
  "fcmTokens": ["FCM_TOKEN_OPTIONAL"],
  "location": {
    "type": "Point",
    "coordinates": [72.8777, 19.0760]
  }
}
```

OTP verification login:

```http
POST /api/otp/verify-otp
Content-Type: application/json
```

Body:

```json
{
  "email": "user@example.com",
  "otp": "123456",
  "type": "LOGIN",
  "fcmTokens": ["FCM_TOKEN_OPTIONAL"],
  "location": {
    "type": "Point",
    "coordinates": [72.8777, 19.0760]
  }
}
```

Onboarding profile:

```http
POST /api/onboard/profile
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
```

Body:

```json
{
  "name": "Moinak",
  "dob": "1998-01-15",
  "height": 178,
  "weight": 76,
  "gender": "male",
  "dietType": "veg",
  "lifestyle": "active",
  "medicalCondition": "",
  "locationName": "Mumbai",
  "location": {
    "type": "Point",
    "coordinates": [72.8777, 19.0760]
  }
}
```

## Location Format

Use GeoJSON `Point` format everywhere:

```json
{
  "type": "Point",
  "coordinates": [longitude, latitude]
}
```

Do not send `[latitude, longitude]`.

## Backend Setup

Add these env variables to the backend:

```env
GOOGLE_CLIENT_ID=your_google_web_or_server_client_id
APPLE_CLIENT_ID=your_apple_bundle_id_or_service_id
```

Notes:

- `GOOGLE_CLIENT_ID` must match the audience used to mint the Google ID token you send from Flutter.
- `APPLE_CLIENT_ID` should be your Bundle ID for native Apple-platform sign-in. Use the matching Service ID if you later support Apple web/Android flows through a web-style callback flow.

## Google Console Setup

1. Open Google Cloud Console.
2. Create or select the project used by the mobile app.
3. Configure the OAuth consent screen.
4. Create OAuth client IDs for the platforms you use.
5. For Flutter Android/iOS sign-in that sends an ID token to the backend, make sure the app is configured with the backend audience as `serverClientId`.
6. Put that backend audience in `GOOGLE_CLIENT_ID`.

What the frontend must send to backend:

- Send the Google `idToken` returned after sign-in.
- Do not send only the Google user ID.

## Apple Developer Setup

1. In Apple Developer, create or open your App ID.
2. Enable the `Sign in with Apple` capability.
3. If you also support Android or web-style Apple sign-in later, create a Service ID too.
4. In Xcode, make sure the iOS Runner target has the `Sign in with Apple` capability enabled.
5. Set `APPLE_CLIENT_ID` on backend to the identifier expected by the token you are verifying.

Important Apple behavior:

- Apple may provide email only on the first successful sign-in.
- Apple name is also usually available only on first sign-in.
- Flutter should send `identityToken` every time.
- On first Apple login, Flutter should also send `email` and `fullName` to backend when available.

## Flutter Packages

As checked on May 7, 2026:

- `google_sign_in`: `^7.2.0`
- `sign_in_with_apple`: `^8.0.0`

Add to `pubspec.yaml`:

```yaml
dependencies:
  google_sign_in: ^7.2.0
  sign_in_with_apple: ^8.0.0
  http: ^1.2.1
```

## Flutter Google Sign-In Example

```dart
import 'dart:convert';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:http/http.dart' as http;

Future<void> signInWithGoogle() async {
  final GoogleSignIn googleSignIn = GoogleSignIn.instance;
  await googleSignIn.initialize(
    serverClientId: 'YOUR_GOOGLE_SERVER_CLIENT_ID',
  );

  final GoogleSignInAccount account = await googleSignIn.authenticate();

  final GoogleSignInAuthentication auth = await account.authentication;
  final String? idToken = auth.idToken;
  if (idToken == null) {
    throw Exception('Google idToken not returned');
  }

  final response = await http.post(
    Uri.parse('http://localhost:666/api/auth/google'),
    headers: {'Content-Type': 'application/json'},
    body: jsonEncode({
      'idToken': idToken,
      'fcmTokens': [],
      'location': {
        'type': 'Point',
        'coordinates': [72.8777, 19.0760]
      }
    }),
  );

  final body = jsonDecode(response.body);
  if (response.statusCode >= 400 || body['success'] != true) {
    throw Exception(body['message'] ?? 'Google login failed');
  }

  final accessToken = body['data']['tokens']['accessToken']['token'];
  final isNewUser = body['data']['isNewUser'] == true;
  final user = body['data']['user'];

  print(accessToken);
  print(isNewUser);
  print(user);
}
```

If your app is still on `google_sign_in` 6.x, the older `GoogleSignIn(...).signIn()` API is also valid, but the backend contract stays the same: send `idToken`.

## Flutter Apple Sign-In Example

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:sign_in_with_apple/sign_in_with_apple.dart';

Future<void> signInWithApple() async {
  final credential = await SignInWithApple.getAppleIDCredential(
    scopes: [
      AppleIDAuthorizationScopes.email,
      AppleIDAuthorizationScopes.fullName,
    ],
  );

  final response = await http.post(
    Uri.parse('http://localhost:666/api/auth/apple'),
    headers: {'Content-Type': 'application/json'},
    body: jsonEncode({
      'identityToken': credential.identityToken,
      'email': credential.email,
      'fullName': [
        credential.givenName,
        credential.familyName,
      ].where((e) => e != null && e!.trim().isNotEmpty).join(' ').trim(),
      'fcmTokens': [],
      'location': {
        'type': 'Point',
        'coordinates': [72.8777, 19.0760]
      }
    }),
  );

  final body = jsonDecode(response.body);
  if (response.statusCode >= 400 || body['success'] != true) {
    throw Exception(body['message'] ?? 'Apple login failed');
  }

  final accessToken = body['data']['tokens']['accessToken']['token'];
  final isNewUser = body['data']['isNewUser'] == true;

  print(accessToken);
  print(isNewUser);
}
```

## OTP Flow for Flutter

Step 1: request OTP

```http
POST /api/otp/send-otp
```

```json
{
  "email": "user@example.com",
  "type": "LOGIN"
}
```

Step 2: verify OTP

```http
POST /api/otp/verify-otp
```

```json
{
  "email": "user@example.com",
  "otp": "123456",
  "type": "LOGIN",
  "location": {
    "type": "Point",
    "coordinates": [72.8777, 19.0760]
  }
}
```

If response contains `isNewUser: true`, call onboarding next.

## Onboarding Flow After Social Login or OTP Login

1. Call Google, Apple, or OTP verify endpoint.
2. Read `data.isNewUser`.
3. If `true`, navigate user to onboarding form.
4. Submit onboarding to `/api/onboard/profile` with bearer token.
5. If `false`, go directly to app home.

## Expected Response Shape

Google and Apple login return:

```json
{
  "success": true,
  "data": {
    "user": {},
    "tokens": {
      "accessToken": {
        "token": "..."
      },
      "refreshToken": {
        "token": "..."
      }
    },
    "isNewUser": true
  },
  "message": "Google login successful"
}
```

OTP verify returns:

```json
{
  "success": true,
  "data": {
    "userId": "mongo_id",
    "isNewUser": true,
    "user": {},
    "tokens": {
      "accessToken": {
        "token": "..."
      },
      "refreshToken": {
        "token": "..."
      }
    }
  },
  "message": "Account created. Complete onboarding."
}
```

## Testing Checklist

Backend config:

1. Set `GOOGLE_CLIENT_ID`.
2. Set `APPLE_CLIENT_ID`.
3. Start backend.

Google login test:

1. Sign in on Flutter device/emulator.
2. Confirm frontend receives `idToken`.
3. Post token to `/api/auth/google`.
4. Confirm backend returns `success: true`.
5. Confirm user is created in MongoDB with `googleId`.
6. Confirm `location.coordinates` is stored if sent.

Apple login test:

1. Run on a real Apple device or valid Apple-capable simulator setup.
2. Sign in with Apple.
3. Post `identityToken` to `/api/auth/apple`.
4. On first login, also send `email` and `fullName` if available.
5. Confirm user is created in MongoDB with `appleId`.
6. Confirm repeat login still works when Apple no longer returns email/name.

OTP test:

1. Call `/api/otp/send-otp`.
2. Read OTP from mail or dev logs/store.
3. Call `/api/otp/verify-otp` with optional location.
4. Confirm `isVerified` becomes `true`.

Onboarding test:

1. Use returned bearer token.
2. Call `/api/onboard/profile`.
3. Confirm `isOnboarded` becomes `true`.
4. Confirm `location` and `locationName` are stored.

## Useful cURL Samples

Google:

```bash
curl -X POST http://localhost:666/api/auth/google \
  -H "Content-Type: application/json" \
  -d '{
    "idToken":"GOOGLE_ID_TOKEN",
    "location":{"type":"Point","coordinates":[72.8777,19.0760]}
  }'
```

Apple:

```bash
curl -X POST http://localhost:666/api/auth/apple \
  -H "Content-Type: application/json" \
  -d '{
    "identityToken":"APPLE_IDENTITY_TOKEN",
    "email":"first-login@example.com",
    "fullName":"Apple User",
    "location":{"type":"Point","coordinates":[72.8777,19.0760]}
  }'
```

OTP verify:

```bash
curl -X POST http://localhost:666/api/otp/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email":"user@example.com",
    "otp":"123456",
    "type":"LOGIN",
    "location":{"type":"Point","coordinates":[72.8777,19.0760]}
  }'
```

## Common Issues

- `Google authentication failed`: usually wrong `GOOGLE_CLIENT_ID` or wrong token audience.
- `Apple authentication failed`: usually wrong `APPLE_CLIENT_ID`, missing Apple capability, or invalid test setup.
- Apple returns no email on second login: this is normal.
- Location saved incorrectly: verify you are sending `[longitude, latitude]`.

## References

- Google backend token verification: https://developers.google.com/identity/sign-in/android/backend-auth
- Google Flutter package: https://pub.dev/packages/google_sign_in
- Apple Sign in overview: https://developer.apple.com/documentation/SigninwithApple
- Apple token validation: https://developer.apple.com/documentation/accountorganizationaldatasharing/generate-and-validate-tokens
- Apple Flutter package: https://pub.dev/packages/sign_in_with_apple

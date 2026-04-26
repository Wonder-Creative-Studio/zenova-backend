// src/services/fcmService.js
import admin from 'firebase-admin';
import config from '~/config/config';

// Initialize only once
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.FCM_PROJECT_ID,
        clientEmail: config.FCM_CLIENT_EMAIL,
        privateKey: config.FCM_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
  } catch (err) {
    console.warn('Firebase not configured:', err.message);
  }
}

/**
 * Send FCM push notification (official SDK)
 */
export const sendPushNotification = async (deviceToken, title, body, data = {}) => {
  if (!admin.apps.length) {
    console.warn('Firebase not initialized — skipping push');
    return false;
  }

  const message = {
    token: deviceToken,
    notification: {
      title,
      body,
    },
    data: {
      ...data,
      timestamp: new Date().toISOString(),
    },
    android: {
      notification: {
        sound: 'default',
        clickAction: 'FLUTTER_NOTIFICATION_CLICK',
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          'content-available': 1,
        },
      },
    },
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('✅ FCM sent:', response);
    return true;
  } catch (err) {
    console.error('❌ FCM error:', err.message);
    return false;
  }
};

export default {
  sendPushNotification,
};
// src/jobs/notificationScheduler.js
import cron from 'node-cron';
import Notification from '~/models/notificationModel';
import User from '~/models/userModel';
import fcmService from '~/services/fcmService';

/**
 * Auto-send scheduled notifications
 */
const sendScheduledNotifications = async () => {
  try {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    // Find notifications scheduled in the last 5 minutes (to handle delays)
    const notifications = await Notification.find({
      scheduledAt: { $gte: fiveMinutesAgo, $lte: now },
      status: 'scheduled',
    }).populate('userId', 'fcmTokens');

    if (notifications.length === 0) return;

    console.log(`[SCHEDULER] Processing ${notifications.length} notifications...`);

    for (const notif of notifications) {
      try {
        const tokens = notif.userId?.fcmTokens || [];

        if (tokens.length > 0) {
          const results = await Promise.all(
            tokens.map(token =>
              fcmService.sendPushNotification(token, notif.title, notif.body, {
                notificationId: notif._id.toString(),
                category: notif.category,
              })
            )
          );
          const sent = results.filter(Boolean).length;
          console.log(`✅ Notification ${notif._id} — ${sent}/${tokens.length} device(s) reached`);
        } else {
          console.warn(`⚠️ No FCM tokens for notification: ${notif._id}`);
        }

        notif.status = 'sent';
        notif.sentAt = new Date();
        await notif.save();
      } catch (err) {
        console.error(`❌ Failed to send notification ${notif._id}:`, err.message);
      }
    }
  } catch (err) {
    console.error('❌ Scheduler error:', err.message);
  }
};

// Run every minute
const startNotificationScheduler = () => {
  console.log('🚀 Starting Notification Scheduler...');
  cron.schedule('* * * * *', sendScheduledNotifications); // Every minute
};

export default startNotificationScheduler;
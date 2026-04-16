// src/controllers/notificationController.js
import Notification from '~/models/notificationModel';
import User from '~/models/userModel';
import httpStatus from 'http-status';
import APIError from '~/utils/apiError'; 
import fcmService from '~/services/fcmService';

export const scheduleNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, body, category, scheduledAt } = req.body;

    if (!title || !body || !category || !scheduledAt) {
      return res.status(400).json({
        success: false,
        data:{},
        message: 'Title, body, category, and scheduledAt are required',
      });
    }

    const notification = new Notification({
      userId,
      title,
      body,
      category,
      scheduledAt: new Date(scheduledAt),
    });

    const savedNotification = await notification.save();

    return res.json({
      success: true,
       savedNotification,
      message: 'Notification scheduled successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
       data:{},
      message: err.message || 'Failed to schedule notification',
    });
  }
};


export const sendPushNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationId } = req.body;

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({
        success: false,
         data:{},
        message: 'Notification not found',
      });
    }

    if (notification.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
         data:{},
        message: 'Access denied',
      });
    }

    const user = await User.findById(notification.userId).select('fcmTokens').lean();
    const tokens = user?.fcmTokens || [];

    let fcmSent = 0;
    if (tokens.length > 0) {
      const results = await Promise.all(
        tokens.map(token =>
          fcmService.sendPushNotification(token, notification.title, notification.body, {
            notificationId: notification._id.toString(),
            category: notification.category,
          })
        )
      );
      fcmSent = results.filter(Boolean).length;
    }

    notification.sentAt = new Date();
    notification.status = 'sent';
    await notification.save();

    return res.json({
      success: true,
      data: {
        ...notification.toObject(),
        fcmSent,
        tokensTargeted: tokens.length,
      },
      message: `Notification sent — ${fcmSent} device(s) reached`,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
       data:{},
      message: err.message || 'Failed to send notification',
    });
  }
};

// export const sendPushNotification = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { notificationId } = req.body;

//     const notification = await Notification.findById(notificationId);
//     if (!notification) {
//       return res.status(404).json({
//         success: false,
//         data:{},
//         message: 'Notification not found',
//       });
//     }

//     if (notification.userId.toString() !== userId) {
//       return res.status(403).json({
//         success: false,
//         data:{},
//         message: 'Access denied',
//       });
//     }

//     // Simulate FCM push (in production, use fcm-node)
//     // In real app, send to device token
//     console.log(`[FCM] Sending push to user ${userId}:`, {
//       title: notification.title,
//       body: notification.body,
//       data: { notificationId: notification._id },
//     });

//     // Mark as sent
//     notification.sentAt = new Date();
//     notification.status = 'sent';
//     await notification.save();

//     return res.json({
//       success: true,
//        notification,
//       message: 'Push notification sent successfully',
//     });
//   } catch (err) {
//     return res.status(400).json({
//       success: false,
//       data:{},
//       message: err.message || 'Failed to send push notification',
//     });
//   }
// };

export const getNotificationHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { period } = req.query; // 'today', 'yesterday', 'all'

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    let filter = { userId };

    if (period === 'today') {
      filter.scheduledAt = { $gte: today, $lt: tomorrow };
    } else if (period === 'yesterday') {
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      filter.scheduledAt = { $gte: yesterday, $lt: today };
    } else if (period === 'all' || !period) {
      // no date filter — return everything
    }

    const notifications = await Notification.find(filter).sort({ scheduledAt: -1 });

    return res.json({
      success: true,
      data: {
        notifications,
        period: period || 'all',
        total: notifications.length,
      },
      message: 'Notification history fetched successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data:{},
      message: err.message || 'Failed to fetch notification history',
    });
  }
};

export const updateNotificationAction = async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationId, action } = req.body;

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({
        success: false,
        data:{},
        message: 'Notification not found',
      });
    }

    if (notification.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        data:{},
        message: 'Access denied',
      });
    }

    notification.action = action;
    notification.status = 'read'; // or 'snoozed'/'dismissed'
    await notification.save();

    return res.json({
      success: true,
       notification,
      message: 'Notification action updated successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data:{},
      message: err.message || 'Failed to update notification action',
    });
  }
}; 

export const getScheduledNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

    const notifications = await Notification.find({
      userId,
      scheduledAt: { $gte: start, $lte: end },
      status: 'scheduled',
    }).sort({ scheduledAt: 1 });

    return res.json({
      success: true,
       data:{notifications},
      message: 'Scheduled notifications fetched successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
       data:{},
      message: err.message || 'Failed to fetch scheduled notifications',
    });
  }
};

export const sendInstantNotification = async (req, res) => {
  try {
    const { title, body, category, data = {}, targetUserId, targetAll = false } = req.body;

    if (!title || !body || !category) {
      return res.status(400).json({
        success: false,
        data: {},
        message: 'title, body, and category are required',
      });
    }

    if (!targetAll && !targetUserId) {
      return res.status(400).json({
        success: false,
        data: {},
        message: 'Provide either targetUserId or set targetAll: true',
      });
    }

    // Resolve target users
    let targetUsers = [];
    if (targetAll) {
      targetUsers = await User.find({ fcmTokens: { $exists: true, $ne: [] } })
        .select('_id fcmTokens')
        .lean();
    } else {
      const user = await User.findById(targetUserId).select('_id fcmTokens').lean();
      if (!user) {
        return res.status(404).json({ success: false, data: {}, message: 'Target user not found' });
      }
      targetUsers = [user];
    }

    const now = new Date();
    let totalSent = 0;
    let totalFailed = 0;
    const notifications = [];

    // Send to each user's FCM tokens and save a notification record
    await Promise.all(
      targetUsers.map(async (user) => {
        const tokens = user.fcmTokens || [];

        const notification = await Notification.create({
          userId: user._id,
          title,
          body,
          category,
          scheduledAt: now,
          sentAt: now,
          status: tokens.length > 0 ? 'sent' : 'scheduled',
        });

        notifications.push(notification._id);

        if (tokens.length > 0) {
          const results = await Promise.all(
            tokens.map(token =>
              fcmService.sendPushNotification(token, title, body, {
                notificationId: notification._id.toString(),
                category,
                ...data,
              })
            )
          );
          totalSent += results.filter(Boolean).length;
          totalFailed += results.filter(r => !r).length;
        }
      })
    );

    return res.json({
      success: true,
      data: {
        usersTargeted: targetUsers.length,
        notificationsCreated: notifications.length,
        fcmSent: totalSent,
        fcmFailed: totalFailed,
      },
      message: targetAll
        ? `Broadcast sent to ${targetUsers.length} user(s) — ${totalSent} device(s) reached`
        : `Notification sent to user — ${totalSent} device(s) reached`,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data: {},
      message: err.message || 'Failed to send instant notification',
    });
  }
};

export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 20 } = req.query;

    const filter = { userId };
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .sort({ scheduledAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Notification.countDocuments(filter),
    ]);

    const unreadCount = await Notification.countDocuments({ userId, status: { $nin: ['read', 'dismissed'] } });

    return res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
      message: 'Notifications fetched successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data: {},
      message: err.message || 'Failed to fetch notifications',
    });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId },
      { status: 'read' },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        data: {},
        message: 'Notification not found',
      });
    }

    return res.json({
      success: true,
      data: notification,
      message: 'Notification marked as read',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data: {},
      message: err.message || 'Failed to mark notification as read',
    });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await Notification.updateMany(
      { userId, status: { $nin: ['read', 'dismissed'] } },
      { status: 'read' }
    );

    return res.json({
      success: true,
      data: { updatedCount: result.modifiedCount },
      message: 'All notifications marked as read',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data: {},
      message: err.message || 'Failed to mark all notifications as read',
    });
  }
};

export default {
  scheduleNotification,
  sendPushNotification,
  sendInstantNotification,
  getNotificationHistory,
  updateNotificationAction,
  getScheduledNotifications,
  getNotifications,
  markAsRead,
  markAllAsRead,
};
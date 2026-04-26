// src/routes/notificationRoutes.js
import { Router } from 'express';
import catchAsync from '~/utils/catchAsync';
import validate from '~/middlewares/validate';
import authenticate from '~/middlewares/authenticate';
import isAdmin from '~/middlewares/isAdmin';
import notificationValidation from '~/validations/notificationValidation';
import notificationController from '~/controllers/notificationController';

const router = Router();

router.post('/schedule', authenticate(), validate(notificationValidation.scheduleNotification), catchAsync(notificationController.scheduleNotification));

// Admin only — create and send instantly to a specific user or broadcast to all
router.post('/instant', authenticate(), isAdmin(), catchAsync(notificationController.sendInstantNotification));
router.post('/send', authenticate(), validate(notificationValidation.sendPushNotification), catchAsync(notificationController.sendPushNotification));
router.get('/history', authenticate(), validate(notificationValidation.getNotificationHistory), catchAsync(notificationController.getNotificationHistory));
router.post('/action', authenticate(), validate(notificationValidation.updateNotificationAction), catchAsync(notificationController.updateNotificationAction));

router.get('/scheduled', authenticate(), validate(notificationValidation.getScheduledNotifications), catchAsync(notificationController.getScheduledNotifications));

// Get all notifications (with optional ?status= and pagination ?page= &limit=)
router.get('/', authenticate(), catchAsync(notificationController.getNotifications));

// Mark single notification as read
router.patch('/:id/read', authenticate(), catchAsync(notificationController.markAsRead));

// Mark all notifications as read
router.patch('/read-all', authenticate(), catchAsync(notificationController.markAllAsRead));

export default router;
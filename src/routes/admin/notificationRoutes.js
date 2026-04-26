// src/routes/admin/notificationRoutes.js
import { Router } from 'express';
import catchAsync from '~/utils/catchAsync';
import validate from '~/middlewares/validate';
import authenticate from '~/middlewares/authenticate';
import authorize from '~/middlewares/authorize';
import auditLog from '~/middlewares/auditLog';
import notificationController from '~/controllers/admin/notificationController';
import notificationValidation from '~/validations/admin/notificationValidation';

const router = Router();

router.use(authenticate(), authorize());

router.get('/', validate(notificationValidation.list), catchAsync(notificationController.list));
router.get('/stats', catchAsync(notificationController.stats));

router.post(
	'/send',
	authorize('Super Administrator', 'Administrator'),
	validate(notificationValidation.send),
	auditLog({ action: 'notification.send', targetModel: 'notifications' }),
	catchAsync(notificationController.send)
);

export default router;

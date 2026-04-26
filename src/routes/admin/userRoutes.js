// src/routes/admin/userRoutes.js
import { Router } from 'express';
import catchAsync from '~/utils/catchAsync';
import validate from '~/middlewares/validate';
import authenticate from '~/middlewares/authenticate';
import authorize from '~/middlewares/authorize';
import auditLog from '~/middlewares/auditLog';
import userController from '~/controllers/admin/userController';
import userValidation from '~/validations/admin/userValidation';

const router = Router();

router.use(authenticate(), authorize('Super Administrator', 'Administrator', 'Moderator'));

router.get('/', validate(userValidation.list), catchAsync(userController.list));
router.get('/:userId', validate(userValidation.getOne), catchAsync(userController.getOne));
router.get('/:userId/activity', validate(userValidation.activity), catchAsync(userController.activity));
router.get('/:userId/stats', validate(userValidation.getOne), catchAsync(userController.stats));

// Mutations — scoped to Admin+ (Moderator is read-only).
router.patch(
	'/:userId',
	authorize('Super Administrator', 'Administrator'),
	validate(userValidation.update),
	auditLog({ action: 'user.update', targetModel: 'users', targetIdFrom: 'params.userId' }),
	catchAsync(userController.update)
);

router.patch(
	'/:userId/ban',
	authorize('Super Administrator', 'Administrator'),
	validate(userValidation.ban),
	auditLog({ action: 'user.ban', targetModel: 'users', targetIdFrom: 'params.userId' }),
	catchAsync(userController.ban)
);

router.patch(
	'/:userId/unban',
	authorize('Super Administrator', 'Administrator'),
	validate(userValidation.unban),
	auditLog({ action: 'user.unban', targetModel: 'users', targetIdFrom: 'params.userId' }),
	catchAsync(userController.unban)
);

export default router;

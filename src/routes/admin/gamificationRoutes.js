// src/routes/admin/gamificationRoutes.js
import { Router } from 'express';
import catchAsync from '~/utils/catchAsync';
import validate from '~/middlewares/validate';
import authenticate from '~/middlewares/authenticate';
import authorize from '~/middlewares/authorize';
import auditLog from '~/middlewares/auditLog';
import gamificationController from '~/controllers/admin/gamificationController';
import gamificationValidation from '~/validations/admin/gamificationValidation';

const router = Router();

router.use(authenticate(), authorize());

router.get('/economy-overview', catchAsync(gamificationController.economy));
router.get(
	'/transactions',
	validate(gamificationValidation.transactions),
	catchAsync(gamificationController.transactions)
);

router.post(
	'/adjust-coins',
	authorize('Super Administrator', 'Administrator'),
	validate(gamificationValidation.adjust),
	auditLog({ action: 'gamification.coin_adjust', targetModel: 'users', targetIdFrom: 'body.userId' }),
	catchAsync(gamificationController.adjust)
);

export default router;

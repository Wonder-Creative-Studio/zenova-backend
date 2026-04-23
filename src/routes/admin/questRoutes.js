// src/routes/admin/questRoutes.js
import { Router } from 'express';
import catchAsync from '~/utils/catchAsync';
import validate from '~/middlewares/validate';
import authenticate from '~/middlewares/authenticate';
import authorize from '~/middlewares/authorize';
import auditLog from '~/middlewares/auditLog';
import questController from '~/controllers/admin/questController';
import questValidation from '~/validations/admin/questValidation';

const router = Router();

router.use(authenticate(), authorize());

router.get('/', catchAsync(questController.list));

router.post(
	'/',
	authorize('Super Administrator', 'Administrator'),
	validate(questValidation.create),
	auditLog({ action: 'quest.create', targetModel: 'quests' }),
	catchAsync(questController.create)
);

router.patch(
	'/:questId',
	authorize('Super Administrator', 'Administrator'),
	validate(questValidation.update),
	auditLog({ action: 'quest.update', targetModel: 'quests', targetIdFrom: 'params.questId' }),
	catchAsync(questController.update)
);

router.patch(
	'/:questId/toggle',
	authorize('Super Administrator', 'Administrator'),
	validate(questValidation.toggle),
	auditLog({ action: 'quest.toggle', targetModel: 'quests', targetIdFrom: 'params.questId' }),
	catchAsync(questController.toggle)
);

router.get(
	'/:questId/completions',
	validate(questValidation.byId),
	catchAsync(questController.completions)
);

export default router;

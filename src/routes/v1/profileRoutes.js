// src/routes/v1/profileRoutes.js
import { Router } from 'express';
import catchAsync from '~/utils/catchAsync';
import validate from '~/middlewares/validate';
import authenticate from '~/middlewares/authenticate';
import profileController from '~/controllers/v1/profileController';
import profileValidation from '~/validations/v1/profileValidation';

const router = Router();

router.get('/', authenticate(), catchAsync(profileController.getProfile));

router.post(
	'/onboarding',
	authenticate(),
	validate(profileValidation.upsertProfile),
	catchAsync(profileController.upsertProfile)
);

router.put(
	'/',
	authenticate(),
	validate(profileValidation.upsertProfile),
	catchAsync(profileController.upsertProfile)
);

export default router;

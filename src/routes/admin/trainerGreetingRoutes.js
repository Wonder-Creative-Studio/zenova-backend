// src/routes/admin/trainerGreetingRoutes.js
import { Router } from 'express';
import catchAsync from '~/utils/catchAsync';
import authenticate from '~/middlewares/authenticate';
import authorize from '~/middlewares/authorize';
import validate from '~/middlewares/validate';
import trainerGreetingController from '~/controllers/admin/trainerGreetingController';
import trainerGreetingValidation from '~/validations/admin/trainerGreetingValidation';

const router = Router();

// Secure all admin trainer greeting routes
router.use(authenticate(), authorize());

router.get('/', catchAsync(trainerGreetingController.list));
router.post('/', validate(trainerGreetingValidation.create), catchAsync(trainerGreetingController.create));
router.put('/:id', validate(trainerGreetingValidation.update), catchAsync(trainerGreetingController.update));

export default router;

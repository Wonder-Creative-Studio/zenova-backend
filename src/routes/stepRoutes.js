// src/routes/stepRoutes.js
import { Router } from 'express';
import catchAsync from '~/utils/catchAsync';
import validate from '~/middlewares/validate';
import authenticate from '~/middlewares/authenticate';
import stepValidation from '~/validations/stepValidation';
import stepController from '~/controllers/stepController';

const router = Router();


router.post('/goal', authenticate(), validate(stepValidation.setStepGoal), catchAsync(stepController.setStepGoal));
router.post('/log', authenticate(), validate(stepValidation.logSteps), catchAsync(stepController.logSteps));
router.get('/progress', authenticate(), validate(stepValidation.getStepProgress), catchAsync(stepController.getStepProgress));

export default router;
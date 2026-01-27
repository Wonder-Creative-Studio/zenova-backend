import { Router } from 'express';
import catchAsync from '~/utils/catchAsync';
import validate from '~/middlewares/validate';
import authenticate from '~/middlewares/authenticate';
import screenTimeValidation from '~/validations/screenTimeValidation';
import screenTimeController from '~/controllers/screenTimeController';

const router = Router();

router.post('/goal', authenticate(), validate(screenTimeValidation.setFocusGoal), catchAsync(screenTimeController.setFocusGoal));
router.post('/log', authenticate(), validate(screenTimeValidation.logScreenTime), catchAsync(screenTimeController.logScreenTime));
router.get('/progress', authenticate(), validate(screenTimeValidation.getScreenTimeProgress), catchAsync(screenTimeController.getScreenTimeProgress));
router.get('/focus-progress', authenticate(), catchAsync(screenTimeController.getFocusProgress));

export default router;
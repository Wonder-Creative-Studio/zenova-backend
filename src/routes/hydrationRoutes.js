import { Router } from 'express';
import authenticate from '~/middlewares/authenticate';
import validate from '~/middlewares/validate';
import catchAsync from '~/utils/catchAsync';
import hydrationValidation from '~/validations/hydrationValidation';
import hydrationController from '~/controllers/hydrationController';

const router = Router();

router.post('/log', authenticate(), validate(hydrationValidation.logHydration), catchAsync(hydrationController.logHydration));
router.get('/today', authenticate(), validate(hydrationValidation.getHydration), catchAsync(hydrationController.getTodayHydration));
router.get('/summary', authenticate(), validate(hydrationValidation.getHydration), catchAsync(hydrationController.getHydrationSummary));
router.put('/goal', authenticate(), validate(hydrationValidation.updateGoal), catchAsync(hydrationController.updateHydrationGoal));

export default router;

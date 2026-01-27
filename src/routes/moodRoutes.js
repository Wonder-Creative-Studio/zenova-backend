import { Router } from 'express';
import catchAsync from '~/utils/catchAsync';
import validate from '~/middlewares/validate';
import authenticate from '~/middlewares/authenticate';
import moodValidation from '~/validations/moodValidation';
import moodController from '~/controllers/moodController';

const router = Router();

router.post('/log', authenticate(), validate(moodValidation.logMood), catchAsync(moodController.logMood));
router.get('/summary', authenticate(), validate(moodValidation.getMoodSummary), catchAsync(moodController.getMoodSummary));
router.get('/today', authenticate(), catchAsync(moodController.getTodayMood));
router.get('/progress/:limit', authenticate(), catchAsync(moodController.getMoodProgress));

export default router;
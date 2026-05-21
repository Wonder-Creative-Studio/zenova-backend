import { Router } from 'express';
import authenticate from '~/middlewares/authenticate';
import catchAsync from '~/utils/catchAsync';
import auraController from '~/controllers/auraController';

const router = Router();

router.get('/today', authenticate(), catchAsync(auraController.getTodayAura));
router.get('/stream', authenticate(), catchAsync(auraController.streamAura));

export default router;

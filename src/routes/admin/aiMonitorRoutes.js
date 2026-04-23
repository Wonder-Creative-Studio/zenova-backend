// src/routes/admin/aiMonitorRoutes.js
import { Router } from 'express';
import catchAsync from '~/utils/catchAsync';
import authenticate from '~/middlewares/authenticate';
import authorize from '~/middlewares/authorize';
import aiMonitorController from '~/controllers/admin/aiMonitorController';

const router = Router();

router.use(authenticate(), authorize());

router.get('/overview', catchAsync(aiMonitorController.overview));
router.get('/users/:userId/threads', catchAsync(aiMonitorController.userThreads));
router.get('/threads/:threadId/messages', catchAsync(aiMonitorController.threadMessages));

export default router;

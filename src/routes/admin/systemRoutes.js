// src/routes/admin/systemRoutes.js
import { Router } from 'express';
import catchAsync from '~/utils/catchAsync';
import authenticate from '~/middlewares/authenticate';
import authorize from '~/middlewares/authorize';
import systemController from '~/controllers/admin/systemController';

const router = Router();
router.use(authenticate(), authorize('Super Administrator', 'Administrator'));
router.get('/health', catchAsync(systemController.health));
export default router;

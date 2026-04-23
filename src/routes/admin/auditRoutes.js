// src/routes/admin/auditRoutes.js
import { Router } from 'express';
import catchAsync from '~/utils/catchAsync';
import authenticate from '~/middlewares/authenticate';
import authorize from '~/middlewares/authorize';
import auditController from '~/controllers/admin/auditController';

const router = Router();
router.use(authenticate(), authorize('Super Administrator', 'Administrator'));
router.get('/', catchAsync(auditController.list));
export default router;

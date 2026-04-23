// src/routes/admin/safetyRoutes.js
import { Router } from 'express';
import catchAsync from '~/utils/catchAsync';
import authenticate from '~/middlewares/authenticate';
import authorize from '~/middlewares/authorize';
import safetyController from '~/controllers/admin/safetyController';

const router = Router();

router.use(authenticate(), authorize());

router.get('/', catchAsync(safetyController.list));
router.get('/stats', catchAsync(safetyController.stats));

export default router;

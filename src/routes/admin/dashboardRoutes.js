// src/routes/admin/dashboardRoutes.js
import { Router } from 'express';
import catchAsync from '~/utils/catchAsync';
import authenticate from '~/middlewares/authenticate';
import authorize from '~/middlewares/authorize';
import dashboardController from '~/controllers/admin/dashboardController';

const router = Router();

router.use(authenticate(), authorize());

router.get('/overview', catchAsync(dashboardController.overview));
router.get('/user-growth', catchAsync(dashboardController.userGrowth));
router.get('/activity-summary', catchAsync(dashboardController.activitySummary));
router.get('/top-features', catchAsync(dashboardController.topFeatures));
router.get('/nova-coins-flow', catchAsync(dashboardController.novaCoinsFlow));

export default router;

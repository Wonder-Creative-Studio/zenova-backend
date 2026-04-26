// src/routes/admin/roleRoutes.js (readonly in MVP)
import { Router } from 'express';
import catchAsync from '~/utils/catchAsync';
import authenticate from '~/middlewares/authenticate';
import authorize from '~/middlewares/authorize';
import roleController from '~/controllers/admin/roleController';

const router = Router();
router.use(authenticate(), authorize());
router.get('/', catchAsync(roleController.listRoles));
router.get('/permissions', catchAsync(roleController.listPermissions));
export default router;

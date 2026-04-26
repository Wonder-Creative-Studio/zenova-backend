// src/routes/admin/index.js
// All admin routes live under /api/admin/*
// Individual route files attach their own authenticate() + authorize() guards.
import { Router } from 'express';
import dashboardRoutes from './dashboardRoutes';
import userRoutes from './userRoutes';
import notificationRoutes from './notificationRoutes';
import safetyRoutes from './safetyRoutes';
import auditRoutes from './auditRoutes';
import aiMonitorRoutes from './aiMonitorRoutes';
import gamificationRoutes from './gamificationRoutes';
import questRoutes from './questRoutes';
import roleRoutes from './roleRoutes';
import systemRoutes from './systemRoutes';

const router = Router();

router.use('/dashboard', dashboardRoutes);
router.use('/users', userRoutes);
router.use('/notifications', notificationRoutes);
router.use('/safety-events', safetyRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/ai', aiMonitorRoutes);
router.use('/gamification', gamificationRoutes);
router.use('/quests', questRoutes);
router.use('/roles', roleRoutes);
router.use('/system', systemRoutes);

export default router;

import { Router } from 'express';
import authRoute from './authRoute';
import onboardingRoutes from './onboardingRoutes';
import otpRoutes from './otpRoutes';
import mealRoute from './mealRoutes';
import bmrRoutes from './bmrRoutes';
import stepRoutes from './stepRoutes';
import workoutRoutes from './workoutRoutes';
import uploadRoutes from './uploadRoutes';
import meditationRoutes from './meditationRoutes';
import yogaRoutes from './yogaRoutes';
import sleepRoutes from './sleepRoutes';
import moodRoutes from './moodRoutes';
import menstrualRoutes from './menstrualRoutes';
import screenTimeRoutes from './screenTimeRoutes';
import aiRoutes from './aiRoutes';
import chatRoutes from './chatRoutes';
import notificationRoutes from './notificationRoutes';
import medicineRoutes from './medicineRoutes';
import habitRoutes from './habitRoutes'
import readingRoutes from './readingRoutes';
import measurementRoutes from './measurementRoutes';
import gamificationRoutes from './gamificationRoutes';

const router = Router();

router.use('/auth', authRoute);
router.use('/onboard', onboardingRoutes);
router.use('/otp', otpRoutes);
router.use('/meal', mealRoute);
router.use('/bmr', bmrRoutes);
router.use('/steps', stepRoutes);
router.use('/workouts', workoutRoutes);
router.use('/upload', uploadRoutes);
router.use('/meditation', meditationRoutes);
router.use('/yoga', yogaRoutes);
router.use('/sleep', sleepRoutes);
router.use('/mood', moodRoutes);
router.use('/menstrual', menstrualRoutes);
router.use('/screen-time', screenTimeRoutes);
router.use('/ai', aiRoutes);
router.use('/chat', chatRoutes);
router.use('/notification', notificationRoutes);
router.use('/medicine', medicineRoutes);
router.use('/habit', habitRoutes);
router.use('/reading', readingRoutes);
router.use('/measurement', measurementRoutes);
router.use('/gamification', gamificationRoutes);

export default router;


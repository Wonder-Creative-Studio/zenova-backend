// src/routes/v1/index.js
import { Router } from 'express';
import aiChatRoutes from './aiChatRoutes';
import profileRoutes from './profileRoutes';

const router = Router();

router.use('/chat', aiChatRoutes);
router.use('/profile', profileRoutes);

export default router;

// src/routes/gamificationRoutes.js
import { Router } from 'express';
import gamificationController from '~/controllers/gamificationController';
import authenticate from '~/middlewares/authenticate';
import catchAsync from '~/utils/catchAsync';

const router = Router();

// All routes require authentication
router.use(authenticate());

// Summary
router.get('/summary', catchAsync(gamificationController.getSummary));

// NovaCoins
router.get('/coins/balance', catchAsync(gamificationController.getCoinsBalance));
router.get('/coins/history', catchAsync(gamificationController.getCoinsHistory));
router.get('/coins/earnings', catchAsync(gamificationController.getEarningsBreakdown));

// Quests
router.get('/quests', catchAsync(gamificationController.getQuests));

// Stats
router.get('/stats', catchAsync(gamificationController.getStats));

// Level rewards history
router.get('/level-rewards', catchAsync(gamificationController.getLevelRewards));

// Leaderboard
router.get('/leaderboard', catchAsync(gamificationController.getLeaderboard));

// Test V2 endpoint
router.post('/test-v2', catchAsync(gamificationController.testV2GameLogic));

export default router;

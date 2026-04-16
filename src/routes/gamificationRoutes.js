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

// Streaks (regular + nova) with V2 boost multipliers
router.get('/streaks', catchAsync(gamificationController.getStreaks));

// Get full V2 gamification state
// GET /api/gamification/get-v2?include=profile,medals,streaks,today,rank,levelMap,rewards,quests
// Optional: &questPeriod=daily|weekly|milestone|special
router.get('/get-v2', catchAsync(gamificationController.getV2State));

export default router;

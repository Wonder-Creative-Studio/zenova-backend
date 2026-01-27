// src/controllers/stepController.js
import StepLog from '~/models/stepLogModel';
import User from '~/models/userModel';
import httpStatus from 'http-status';
import APIError from '~/utils/apiError';
import gamificationService from '~/services/gamificationService';

// Helper: Calculate calories burned
const calculateCaloriesBurned = (steps, weightKg = 70) => {
  const caloriesPerStepPerKg = 0.0005;
  return Math.round(steps * weightKg * caloriesPerStepPerKg);
};

// Helper: Calculate distance
const calculateDistanceKm = (steps) => {
  const metersPerStep = 0.762;
  return parseFloat((steps * metersPerStep / 1000).toFixed(2));
};

export const setStepGoal = async (req, res) => {
  try {
    const userId = req.user.id;
    const { stepGoal } = req.body;

    if (!stepGoal || stepGoal < 0) {
      return res.status(400).json({
        success: false,
        data: {},
        message: 'Step goal must be a positive number',
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { stepGoal },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        data: {},
        message: 'User not found',
      });
    }

    return res.json({
      success: true,
      user,
      message: 'Step goal set successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data: {},
      message: err.message || 'Failed to set step goal',
    });
  }
};

export const logSteps = async (req, res) => {
  try {
    const userId = req.user.id;
    const { steps, source = 'manual' } = req.body;

    if (steps === undefined || steps < 0) {
      return res.status(400).json({
        success: false,
        data: {},
        message: 'Steps must be a non-negative number',
      });
    }

    const user = await User.findById(userId);
    if (!user || !user.weight) {
      return res.status(400).json({
        success: false,
        data: {},
        message: 'User weight not found',
      });
    }

    const distanceKm = calculateDistanceKm(steps);
    const caloriesBurned = calculateCaloriesBurned(steps, user.weight);

    const stepLog = new StepLog({
      userId,
      steps,
      distanceKm,
      caloriesBurned,
      source,
    });

    const savedLog = await stepLog.save();

    // Process gamification
    const gamificationResult = await gamificationService.processActivity(userId, {
      type: 'steps',
      logId: savedLog._id,
      logModel: 'stepLogs',
      data: { steps }
    });

    return res.json({
      success: true,
      data: {
        savedLog,
        novaCoinsEarned: gamificationResult.coinsEarned,
        bonusCoins: gamificationResult.bonusCoins,
        totalCoins: gamificationResult.totalCoins,
        streak: gamificationResult.streak,
        level: gamificationResult.level,
        questsCompleted: gamificationResult.questsCompleted,
        badgesUnlocked: gamificationResult.badgesUnlocked
      },
      message: 'Steps logged successfully',
    });
  } catch (err) {
    console.error('Step log error:', err);
    return res.status(400).json({
      success: false,
      data: {},
      message: err.message || 'Failed to log steps',
    });
  }
};

export const getStepProgress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { period } = req.query;

    let start, end;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (period === 'today') {
      start = today;
      end = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    } else if (period === 'weekly') {
      start = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      end = today;
    } else if (period === 'monthly') {
      start = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      end = today;
    } else {
      start = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      end = today;
    }

    const logs = await StepLog.find({
      userId,
      loggedAt: { $gte: start, $lte: end },
    }).sort({ loggedAt: 1 });

    const dailyData = {};
    logs.forEach(log => {
      const dateStr = log.loggedAt.toISOString().split('T')[0];
      dailyData[dateStr] = {
        steps: log.steps,
        distanceKm: log.distanceKm,
        caloriesBurned: log.caloriesBurned,
      };
    });

    const latestLog = logs[logs.length - 1];
    const currentSteps = latestLog ? latestLog.steps : 0;

    return res.json({
      success: true,
      data: {
        currentSteps,
        dailyData,
        period: period || 'weekly',
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      },
      message: 'Step progress fetched successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data: {},
      message: err.message || 'Failed to fetch step progress',
    });
  }
};

export default {
  setStepGoal,
  logSteps,
  getStepProgress,
};
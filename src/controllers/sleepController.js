// src/controllers/sleepController.js
import SleepLog from '~/models/sleepLogModel';
import User from '~/models/userModel';
import httpStatus from 'http-status';
import APIError from '~/utils/apiError';
import gamificationService from '~/services/gamificationService';
import SleepGoal from '~/models/sleepGoalModel';

export const setSleepGoal = async (req, res) => {
  try {
    const userId = req.user.id;
    const { recommendedDurationMin, regularSleptAt, regularWokeUpAt } = req.body;

    if (!recommendedDurationMin || !regularSleptAt || !regularWokeUpAt) {
      return res.status(400).json({
        success: false,
        data: {},
        message: 'Recommended duration, regular sleep time, and wake-up time are required',
      });
    }

    const sleepGoal = await SleepGoal.create({
      userId,
      recommendedDurationMin,
      regularSleptAt,
      regularWokeUpAt,
    });

    if (!sleepGoal) {
      return res.status(404).json({
        success: false,
        data: {},
        message: 'Sleep goal not found',
      });
    }

    return res.json({
      success: true,
      data: sleepGoal,
      message: 'Sleep goal set successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data: {},
      message: err.message || 'Failed to set sleep goal',
    });
  }
};

export const logSleep = async (req, res) => {
  try {
    const userId = req.user.id;
    const { durationMin, quality, sleptAt, wokeUpAt, source = 'manual' } = req.body;

    if (!durationMin || !sleptAt || !wokeUpAt) {
      return res.status(400).json({
        success: false,
        data: {},
        message: 'Duration, sleep time, and wake-up time are required',
      });
    }

    const sleepLog = new SleepLog({
      userId,
      durationMin,
      quality,
      sleptAt: new Date(sleptAt),
      wokeUpAt: new Date(wokeUpAt),
      source,
    });

    const savedLog = await sleepLog.save();

    // Process gamification
    const gamificationResult = await gamificationService.processActivity(userId, {
      type: 'sleep',
      logId: savedLog._id,
      logModel: 'sleepLogs',
      data: { durationMin }
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
      message: 'Sleep logged successfully',
    });
  } catch (err) {
    console.error('Sleep log error:', err);
    return res.status(400).json({
      success: false,
      data: {},
      message: err.message || 'Failed to log sleep',
    });
  }
};

export const getSleepProgress = async (req, res) => {
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

    const logs = await SleepLog.find({
      userId,
      loggedAt: { $gte: start, $lte: end },
    }).sort({ loggedAt: 1 });

    const dailyData = {};
    logs.forEach(log => {
      const dateStr = log.sleptAt.toISOString().split('T')[0];
      dailyData[dateStr] = log.durationMin;
    });

    const latestLog = logs[logs.length - 1];
    const currentSleepDuration = latestLog ? latestLog.durationMin : 0;
    const avgSleepDuration = logs.length ? Math.round(logs.reduce((sum, log) => sum + log.durationMin, 0) / logs.length) : 0;

    return res.json({
      success: true,
      data: {
        currentSleepDuration,
        avgSleepDuration,
        dailyData,
        period: period || 'weekly',
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      },
      message: 'Sleep progress fetched successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data: {},
      message: err.message || 'Failed to fetch sleep progress',
    });
  }
};

export default {
  setSleepGoal,
  logSleep,
  getSleepProgress,
};
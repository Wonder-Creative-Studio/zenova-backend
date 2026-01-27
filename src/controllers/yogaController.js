// src/controllers/yogaController.js
import YogaLog from '~/models/yogaLogModel';
import User from '~/models/userModel';
import httpStatus from 'http-status';
import APIError from '~/utils/apiError';
import gamificationService from '~/services/gamificationService';

export const logYoga = async (req, res) => {
  try {
    const userId = req.user.id;
    const { durationMin, type, mood } = req.body;

    if (!durationMin || durationMin < 1) {
      return res.status(400).json({
        success: false,
        data: {},
        message: 'Duration must be at least 1 minute',
      });
    }

    const yogaLog = new YogaLog({
      userId,
      durationMin,
      type: type || 'Manual',
      mood: mood || 'Neutral',
    });

    const savedLog = await yogaLog.save();

    // Process gamification
    const gamificationResult = await gamificationService.processActivity(userId, {
      type: 'yoga',
      logId: savedLog._id,
      logModel: 'yogaLogs',
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
      message: 'Yoga session logged successfully',
    });
  } catch (err) {
    console.error('Yoga log error:', err);
    return res.status(400).json({
      success: false,
      data: {},
      message: err.message || 'Failed to log yoga',
    });
  }
};

export const getYogaProgress = async (req, res) => {
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

    const logs = await YogaLog.find({
      userId,
      loggedAt: { $gte: start, $lte: end },
    }).sort({ loggedAt: 1 });

    const dailyData = {};
    logs.forEach(log => {
      const dateStr = log.loggedAt.toISOString().split('T')[0];
      dailyData[dateStr] = log.durationMin;
    });

    const latestLog = logs[logs.length - 1];
    const currentSessionTime = latestLog ? latestLog.durationMin : 0;
    const avgSessionTime = logs.length ? Math.round(logs.reduce((sum, log) => sum + log.durationMin, 0) / logs.length) : 0;

    return res.json({
      success: true,
      data: {
        currentSessionTime,
        avgSessionTime,
        dailyData,
        period: period || 'weekly',
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      },
      message: 'Yoga progress fetched successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data: {},
      message: err.message || 'Failed to fetch yoga progress',
    });
  }
};

export default {
  logYoga,
  getYogaProgress,
};
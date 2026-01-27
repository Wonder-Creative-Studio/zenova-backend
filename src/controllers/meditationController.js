// src/controllers/meditationController.js
import MeditationLog from '~/models/meditationLogModel';
import MeditationPlan from '~/models/meditationPlanModel';
import User from '~/models/userModel';
import httpStatus from 'http-status';
import APIError from '~/utils/apiError';
import gamificationService from '~/services/gamificationService';
import MoodLog from '~/models/moodLogModel';

export const logMeditation = async (req, res) => {
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

    const meditationLog = new MeditationLog({
      userId,
      durationMin,
      type: type || 'Manual',
      mood: mood || 'Neutral',
    });

    const savedLog = await meditationLog.save();

    // Check for pending mood suggestion
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

    const pendingMoodLog = await MoodLog.findOne({
      userId,
      loggedAt: { $gte: start, $lte: end },
      isSuggestionCompleted: false,
      'suggestedActivity.type': 'meditation'
    });

    let extraCoins = 0;
    if (pendingMoodLog) {
      extraCoins = pendingMoodLog.suggestedActivity.reward;
      pendingMoodLog.isSuggestionCompleted = true;
      pendingMoodLog.completedAt = new Date();
      await pendingMoodLog.save();
    }

    // Process gamification
    const gamificationResult = await gamificationService.processActivity(userId, {
      type: 'meditation',
      logId: savedLog._id,
      logModel: 'meditationLogs',
      data: { durationMin }
    });

    return res.json({
      success: true,
      data: {
        savedLog,
        novaCoinsEarned: gamificationResult.coinsEarned + extraCoins,
        extraCoins,
        bonusCoins: gamificationResult.bonusCoins,
        totalCoins: gamificationResult.totalCoins,
        streak: gamificationResult.streak,
        level: gamificationResult.level,
        questsCompleted: gamificationResult.questsCompleted,
        badgesUnlocked: gamificationResult.badgesUnlocked
      },
      message: 'Meditation session logged successfully',
    });
  } catch (err) {
    console.error('Meditation log error:', err);
    return res.status(400).json({
      success: false,
      data: {},
      message: err.message || 'Failed to log meditation',
    });
  }
};

export const getMeditationProgress = async (req, res) => {
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

    const logs = await MeditationLog.find({
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
      message: 'Meditation progress fetched successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data: {},
      message: err.message || 'Failed to fetch meditation progress',
    });
  }
};

export const generateMeditationPlan = async (req, res) => {
  try {
    const userId = req.user.id;
    const inputDate = req.body.date ? new Date(req.body.date) : new Date();
    const date = new Date(inputDate.getFullYear(), inputDate.getMonth(), inputDate.getDate());

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        data: {},
        message: 'User not found',
      });
    }

    let recommendedSession;
    if (user.lifestyle === 'very_active') {
      recommendedSession = {
        name: 'Zen Burn',
        durationMin: 20,
        type: 'Zen Burn',
        rewards: { novaCoins: 200, other: 20 },
        videoUrl: 'https://res.cloudinary.com/djp3ztex2/video/upload/v1761373409/zenova/meditation/i7wpam85qnfkin0gpwac.m4a',
      };
    } else {
      recommendedSession = {
        name: 'Zen Hyper',
        durationMin: 20,
        type: 'Zen Hyper',
        rewards: { novaCoins: 200, other: 20 },
        videoUrl: 'https://res.cloudinary.com/djp3ztex2/video/upload/v1761373409/zenova/meditation/i7wpam85qnfkin0gpwac.m4a',
      };
    }

    const existingPlan = await MeditationPlan.findOne({ userId, date });
    if (existingPlan) {
      return res.json({
        success: true,
        data: { existingPlan },
        message: 'Meditation plan already exists for this date',
      });
    }

    const meditationPlan = new MeditationPlan({
      userId,
      date,
      recommendedSession,
    });

    const savedPlan = await meditationPlan.save();

    return res.json({
      success: true,
      data: { savedPlan },
      message: 'Meditation plan generated successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data: {},
      message: err.message || 'Failed to generate meditation plan',
    });
  }
};

export default {
  logMeditation,
  getMeditationProgress,
  generateMeditationPlan
};

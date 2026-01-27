// src/controllers/screenTimeController.js
import ScreenTimeLog from '~/models/screenTimeLogModel';
import User from '~/models/userModel';
import httpStatus from 'http-status';
import APIError from '~/utils/apiError';
import gamificationService from '~/services/gamificationService';

// Helper to format minutes to "Xh Ym" format
const formatDuration = (minutes) => {
  if (!minutes || minutes === 0) return '0m';
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

export const setFocusGoal = async (req, res) => {
  try {
    const userId = req.user.id;
    const { dailyScreenTimeLimitMin, focusModeTargetHours, reminderEnabled } = req.body;

    if (!dailyScreenTimeLimitMin || !focusModeTargetHours) {
      return res.status(400).json({
        success: false,
        data: {},
        message: 'Daily screen time limit and focus mode target hours are required',
      });
    }

    await User.findByIdAndUpdate(
      userId,
      {
        focusGoal: {
          dailyScreenTimeLimitMin,
          focusModeTargetHours,
          reminderEnabled: reminderEnabled ?? true,
        }
      },
      { new: true }
    );

    return res.json({
      success: true,
      data: {
        dailyScreenTimeLimitMin,
        focusModeTargetHours,
        reminderEnabled: reminderEnabled ?? true,
      },
      message: 'Focus goal set successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data: {},
      message: err.message || 'Failed to set focus goal',
    });
  }
};

export const logScreenTime = async (req, res) => {
  try {
    const userId = req.user.id;
    const { durationMin, category, source = 'manual' } = req.body;

    if (!durationMin || !category) {
      return res.status(400).json({
        success: false,
        data: {},
        message: 'Duration and category are required',
      });
    }

    const screenTimeLog = new ScreenTimeLog({
      userId,
      durationMin,
      category,
      source,
    });

    const savedLog = await screenTimeLog.save();

    // Process gamification
    const gamificationResult = await gamificationService.processActivity(userId, {
      type: 'screen_time',
      logId: savedLog._id,
      logModel: 'screenTimeLogs',
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
      message: 'Screen time logged successfully',
    });
  } catch (err) {
    console.error('Screen time log error:', err);
    return res.status(400).json({
      success: false,
      data: {},
      message: err.message || 'Failed to log screen time',
    });
  }
};

export const getScreenTimeProgress = async (req, res) => {
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

    const logs = await ScreenTimeLog.find({
      userId,
      loggedAt: { $gte: start, $lte: end },
    }).sort({ loggedAt: 1 });

    const dailyData = {};
    logs.forEach(log => {
      const dateStr = log.loggedAt.toISOString().split('T')[0];
      dailyData[dateStr] = log.durationMin;
    });

    const latestLog = logs[logs.length - 1];
    const currentScreenTime = latestLog ? latestLog.durationMin : 0;
    const avgScreenTime = logs.length ? Math.round(logs.reduce((sum, log) => sum + log.durationMin, 0) / logs.length) : 0;

    return res.json({
      success: true,
      data: {
        currentScreenTime,
        avgScreenTime,
        dailyData,
        period: period || 'weekly',
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      },
      message: 'Screen time progress fetched successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data: {},
      message: err.message || 'Failed to fetch screen time progress',
    });
  }
};

/**
 * Get Focus Progress - For Focus Progress Screen
 * GET /api/screen-time/focus-progress
 */
export const getFocusProgress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = 'today' } = req.query;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let start, end;

    if (period === 'today') {
      start = today;
      end = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    } else if (period === 'weekly') {
      start = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      end = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    } else if (period === 'monthly') {
      start = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      end = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    } else {
      start = today;
      end = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    }

    // Get user's focus goal
    const user = await User.findById(userId).select('focusGoal');
    const targetTime = user?.focusGoal?.dailyScreenTimeLimitMin || 150; // Default 2.5 hours
    const reminderEnabled = user?.focusGoal?.reminderEnabled ?? true;

    // Get all screen time logs for period
    const logs = await ScreenTimeLog.find({
      userId,
      loggedAt: { $gte: start, $lte: end },
    });

    // Calculate totals by category
    const categoryTotals = {};
    let totalScreenTime = 0;

    logs.forEach(log => {
      const cat = log.category || 'Other';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + log.durationMin;
      totalScreenTime += log.durationMin;
    });

    // Format categories array
    const categories = Object.entries(categoryTotals).map(([name, time]) => ({
      name,
      time: formatDuration(time),
      minutes: time
    })).sort((a, b) => b.minutes - a.minutes);

    // Calculate daily average (for multi-day periods)
    const daysInPeriod = period === 'today' ? 1 : period === 'weekly' ? 7 : 30;
    const dailyAverageMin = Math.round(totalScreenTime / daysInPeriod);

    // Focus time = Work Apps category (or 0 if not tracked)
    const focusTimeMin = categoryTotals['Work Apps'] || 0;

    // Calculate goal exceeded/remaining
    const diff = totalScreenTime - targetTime;
    let goalExceeded = null;
    if (diff > 0) {
      goalExceeded = `+${formatDuration(diff)} over daily target`;
    } else if (diff < 0) {
      goalExceeded = `${formatDuration(Math.abs(diff))} remaining`;
    } else {
      goalExceeded = 'On target';
    }

    return res.json({
      success: true,
      data: {
        dailyAverageScreenTime: formatDuration(dailyAverageMin),
        focusTime: formatDuration(focusTimeMin),
        targetTime,
        goalExceeded,
        categories,
        reminderEnabled,
        period,
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      },
      message: 'Focus progress data retrieved successfully',
    });
  } catch (err) {
    console.error('Focus progress error:', err);
    return res.status(400).json({
      success: false,
      data: {},
      message: err.message || 'Failed to fetch focus progress',
    });
  }
};

export default {
  setFocusGoal,
  logScreenTime,
  getScreenTimeProgress,
  getFocusProgress,
};
// src/services/statsService.js
import UserStats from '~/models/userStatsModel';

const WEEKLY_FIELDS = [
  'moodLogs',
  'workoutLogs',
  'mealLogs',
  'meditationLogs',
  'yogaLogs',
  'sleepLogs',
  'stepLogs',
  'screenTimeLogs',
  'readingLogs',
  'medicineLogs',
  'habitLogs',
  'menstrualLogs',
  'bmrLogs',
  'measurementLogs',
  'activityCount',
];

const getWeekStart = (date = new Date()) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  value.setDate(value.getDate() - value.getDay());
  return value;
};

const createDefaultStats = (userId, now = new Date()) => ({
  userId,
  totals: {},
  streaks: { current: 0, longest: 0, novaCurrent: 0, novaLongest: 0 },
  thisWeek: {
    weekStart: getWeekStart(now),
    activityCount: 0,
  },
  today: {
    date: now,
    coinsEarned: 0,
    medalsEarnedStandard: 0,
    categoriesTracked: [],
    moodCoins: 0,
    workoutCoins: 0,
    mealCoins: 0,
    snapMealCount: 0,
    activityCount: 0,
  },
});

const applyWeeklyResetIfNeeded = async (stats, now = new Date()) => {
  const targetWeekStart = getWeekStart(now);
  const existingWeekStart = stats.thisWeek?.weekStart ? new Date(stats.thisWeek.weekStart) : null;

  if (existingWeekStart && existingWeekStart.getTime() === targetWeekStart.getTime()) {
    return stats;
  }

  const weeklyReset = { 'thisWeek.weekStart': targetWeekStart };
  WEEKLY_FIELDS.forEach((field) => {
    weeklyReset[`thisWeek.${field}`] = 0;
  });

  const updated = await UserStats.findOneAndUpdate(
    { userId: stats.userId },
    { $set: weeklyReset },
    { new: true }
  );
  return updated || stats;
};

export const updateStats = async (userId, category, data = {}) => {
  const stats = await getStats(userId);
  const updates = {};

  const increment = (path, amount = 1) => {
    updates[path] = (updates[path] || 0) + amount;
  };

  switch (category) {
    case 'mood':
      increment('totals.moodLogs');
      increment('thisWeek.moodLogs');
      break;
    case 'workout':
      increment('totals.workoutLogs');
      increment('thisWeek.workoutLogs');
      increment('totals.workoutMinutes', data.durationMin || 0);
      increment('totals.caloriesBurned', data.caloriesBurned || 0);
      break;
    case 'meal':
      increment('totals.mealLogs');
      increment('thisWeek.mealLogs');
      break;
    case 'meditation':
      increment('totals.meditationLogs');
      increment('thisWeek.meditationLogs');
      increment('totals.meditationMinutes', data.durationMin || 0);
      break;
    case 'yoga':
      increment('totals.yogaLogs');
      increment('thisWeek.yogaLogs');
      increment('totals.yogaMinutes', data.durationMin || 0);
      break;
    case 'sleep':
      increment('totals.sleepLogs');
      increment('thisWeek.sleepLogs');
      increment('totals.sleepMinutes', data.durationMin || 0);
      break;
    case 'steps':
      increment('totals.stepLogs');
      increment('thisWeek.stepLogs');
      increment('totals.steps', data.steps || 0);
      break;
    case 'reading':
      increment('totals.readingLogs');
      increment('thisWeek.readingLogs');
      increment('totals.readingMinutes', data.durationMin || 0);
      break;
    case 'screen_time':
      increment('totals.screenTimeLogs');
      increment('thisWeek.screenTimeLogs');
      break;
    case 'habit':
      increment('totals.habitLogs');
      increment('thisWeek.habitLogs');
      increment('totals.habitCompletions', data.completedCount || 0);
      break;
    case 'medicine':
      increment('totals.medicineLogs');
      increment('thisWeek.medicineLogs');
      break;
    case 'menstrual':
      increment('totals.menstrualLogs');
      increment('thisWeek.menstrualLogs');
      break;
    case 'bmr':
      increment('totals.bmrLogs');
      increment('thisWeek.bmrLogs');
      break;
    case 'measurement':
      increment('totals.measurementLogs');
      increment('thisWeek.measurementLogs');
      break;
    default:
      break;
  }

  if (Object.keys(updates).some((path) => path.startsWith('totals.') && path !== 'totals.coinsEarned')) {
    increment('totals.activityCount');
    increment('today.activityCount');
    increment('thisWeek.activityCount');
  }

  if (data.coinsEarned) {
    increment('totals.coinsEarned', data.coinsEarned);
    increment('today.coinsEarned', data.coinsEarned);
  }

  if (!Object.keys(updates).length) return stats;

  return UserStats.findOneAndUpdate(
    { userId },
    {
      $inc: updates,
    },
    { new: true }
  );
};

export const updateStreak = async (userId) => {
  const stats = await getStats(userId);
  return {
    current: stats?.streaks?.current || 0,
    longest: stats?.streaks?.longest || 0,
    isNewStreak: false,
  };
};

export const getStats = async (userId) => {
  let stats = await UserStats.findOne({ userId });

  if (!stats) {
    stats = await UserStats.create(createDefaultStats(userId));
  }

  stats = await applyWeeklyResetIfNeeded(stats);
  return stats;
};

export const resetDailyStats = async (userId) => {
  const now = new Date();
  return UserStats.findOneAndUpdate(
    { userId },
    {
      $set: {
        'today.date': now,
        'today.coinsEarned': 0,
        'today.medalsEarnedStandard': 0,
        'today.categoriesTracked': [],
        'today.moodCoins': 0,
        'today.workoutCoins': 0,
        'today.mealCoins': 0,
        'today.snapMealCount': 0,
        'today.activityCount': 0,
      },
    },
    { new: true }
  );
};

export default {
  updateStats,
  updateStreak,
  getStats,
  resetDailyStats,
};

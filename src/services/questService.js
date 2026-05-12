// src/services/questService.js
import { Parser } from 'expr-eval';
import Quest from '~/models/questModel';
import User from '~/models/userModel';
import novaCoinsService from '~/services/novaCoinsService';
import httpStatus from 'http-status';
import APIError from '~/utils/apiError';

const parser = new Parser();

const LEGACY_MEDAL_REWARDS = {
  daily: 2,
  weekly: 5,
  monthly: 15,
};

const DAILY_CHECK_IN_TITLE = 'Daily Check-in';
const DAILY_CHECK_IN_CONDITION = 'today.activityCount >= 1';
const APP_TIME_ZONE = 'Asia/Kolkata';

const getZonedDateParts = (date = new Date(), timeZone = APP_TIME_ZONE) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const getPart = (type) => Number(parts.find(part => part.type === type)?.value);
  return {
    year: getPart('year'),
    month: getPart('month'),
    day: getPart('day'),
  };
};

const getZonedDateKey = (date = new Date(), timeZone = APP_TIME_ZONE) => {
  const { year, month, day } = getZonedDateParts(date, timeZone);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const addDaysToDateKey = (dateKey, days) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0));
  return utcDate.toISOString().split('T')[0];
};

const getMondayDateKey = (dateKey) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const daysSinceMonday = (utcDate.getUTCDay() + 6) % 7;
  return addDaysToDateKey(dateKey, -daysSinceMonday);
};

const getQuestPeriodKey = (quest, now = new Date()) => {
  const period = quest.resetPeriod || quest.category;
  const todayKey = getZonedDateKey(now);
  if (period === 'daily') return todayKey;
  if (period === 'weekly') return getMondayDateKey(todayKey);
  if (period === 'monthly') return todayKey.slice(0, 7);
  return 'once';
};

const isQuestCompletedInWindow = (user, quest, now = new Date()) => {
  const entries = user?.questsCompleted || [];
  const matching = entries.filter((entry) => entry.questId?.toString() === quest._id.toString());
  if (!matching.length) return false;

  const period = quest.resetPeriod || quest.category;
  const todayKey = getZonedDateKey(now);
  const weekStartKey = getMondayDateKey(todayKey);
  const monthKey = todayKey.slice(0, 7);

  return matching.some((entry) => {
    if (!entry.completedAt) return false;
    const completedKey = getZonedDateKey(new Date(entry.completedAt));
    if (period === 'daily') return completedKey === todayKey;
    if (period === 'weekly') return completedKey >= weekStartKey;
    if (period === 'monthly') return completedKey.startsWith(monthKey);
    return true;
  });
};

const getQuestMedalReward = (quest) => {
  if (typeof quest.rewardMedals === 'number' && quest.rewardMedals > 0) {
    return quest.rewardMedals;
  }
  return LEGACY_MEDAL_REWARDS[quest.category] || 0;
};

const isDailyCheckInQuest = (quest) => quest?.category === 'daily' && quest?.title === DAILY_CHECK_IN_TITLE;

const hasDailyActivity = (stats = {}) => {
  const today = stats?.today || {};
  return Boolean(
    (today.activityCount || 0) > 0 ||
    (today.categoriesTracked || []).length > 0 ||
    (today.medalsEarnedStandard || 0) > 0 ||
    (today.coinsEarned || 0) > 0
  );
};

const repairDailyCheckInQuest = async (quest) => {
  if (!isDailyCheckInQuest(quest)) return;

  const needsRepair = (
    quest.condition !== DAILY_CHECK_IN_CONDITION ||
    quest.resetPeriod !== 'daily' ||
    quest.rewardCoins !== 100 ||
    quest.rewardMedals !== 2
  );

  if (!needsRepair) return;

  quest.condition = DAILY_CHECK_IN_CONDITION;
  quest.resetPeriod = 'daily';
  quest.rewardCoins = 100;
  quest.rewardMedals = 2;
  quest.description = quest.description || 'Log any activity today';
  await quest.save();
};

const getQuestConditionMet = (quest, stats, context) => {
  if (isDailyCheckInQuest(quest)) {
    return hasDailyActivity(stats);
  }

  return Boolean(parser.parse(quest.condition).evaluate(context));
};

const ensureBadge = async (userId, badge = {}) => {
  if (!badge?.name) return;

  await User.findOneAndUpdate(
    {
      _id: userId,
      'badges.name': { $ne: badge.name },
    },
    {
      $push: {
        badges: {
          name: badge.name,
          icon: badge.icon,
          unlockedAt: new Date(),
        },
      },
    }
  );
};

/**
 * Check quest completion using already-computed user stats.
 * Rewards are applied here exactly once per reset window.
 */
export const checkQuestCompletion = async (userId, params = {}) => {
  try {
    const { stats, streakDays } = params;
    const user = await User.findById(userId).select('questsCompleted badges medals level rank');
    if (!user) {
      throw new APIError('User not found', httpStatus.NOT_FOUND);
    }

    const quests = await Quest.find({ isActive: true }).sort({ createdAt: 1 });
    const completedQuests = [];
    const now = new Date();
    const context = buildContext(stats, streakDays);

    for (const quest of quests) {
      if (quest.expiresAt && new Date(quest.expiresAt) < now) continue;
      await repairDailyCheckInQuest(quest);
      if (isQuestCompletedInWindow(user, quest, now)) continue;

      let conditionMet = false;
      try {
        conditionMet = getQuestConditionMet(quest, stats, context);
      } catch (err) {
        console.error(`Quest condition error (ID: ${quest._id}):`, err.message);
        continue;
      }

      if (!conditionMet) continue;

      const rewardCoins = quest.rewardCoins || 0;
      const rewardMedals = getQuestMedalReward(quest);
      const questPeriodKey = getQuestPeriodKey(quest, now);
      const completionEntry = {
        questId: quest._id,
        completedAt: now,
        category: quest.category,
        coinsAwarded: rewardCoins,
        medalsAwarded: rewardMedals,
      };

      const updatedUser = await User.findById(userId).select('questsCompleted badges medals level rank');
      if (!updatedUser || isQuestCompletedInWindow(updatedUser, quest, now)) {
        continue;
      }

      let coinsAwardedNow = 0;
      if (rewardCoins > 0) {
        const coinResult = await novaCoinsService.awardCoins(userId, {
          amount: rewardCoins,
          type: 'quest_bonus',
          category: 'quest',
          refId: quest._id,
          refModel: 'quests',
          description: `Quest completed: ${quest.title}`,
          metadata: {
            questId: quest._id.toString(),
            questCategory: quest.category,
            questPeriodKey,
          },
        });
        coinsAwardedNow = coinResult?.earned || 0;
      }

      await ensureBadge(userId, quest.badge);

      if (rewardMedals > 0) {
        updatedUser.medals = (updatedUser.medals || 0) + rewardMedals;
      }

      updatedUser.questsCompleted.push(completionEntry);
      await updatedUser.save();

      user.questsCompleted.push(completionEntry);
      user.medals = updatedUser.medals;

      completedQuests.push({
        questId: quest._id,
        id: quest._id,
        title: quest.title,
        description: quest.description,
        category: quest.category,
        rewardCoins: coinsAwardedNow,
        configuredRewardCoins: rewardCoins,
        rewardMedals,
        badge: quest.badge || null,
        completedAt: now,
      });
    }

    return {
      completed: completedQuests,
      bonusCoins: completedQuests.reduce((sum, quest) => sum + (quest.rewardCoins || 0), 0),
      bonusMedals: completedQuests.reduce((sum, quest) => sum + (quest.rewardMedals || 0), 0),
    };
  } catch (err) {
    console.error('Quest service error:', err);
    return { completed: [], bonusCoins: 0, bonusMedals: 0 };
  }
};

/**
 * Get user's available quests with completion state.
 */
export const getUserQuests = async (userId) => {
  const [user, quests] = await Promise.all([
    User.findById(userId).select('questsCompleted'),
    Quest.find({ isActive: true }),
  ]);

  return quests.map((quest) => ({
    id: quest._id,
    title: quest.title,
    description: quest.description,
    category: quest.category,
    rewardCoins: quest.rewardCoins || 0,
    rewardMedals: getQuestMedalReward(quest),
    badge: quest.badge || null,
    isCompleted: isQuestCompletedInWindow(user, quest),
  }));
};

/**
 * Build the condition-evaluation context from stats.
 */
function buildContext(stats, streakDays) {
  return {
    totals: stats?.totals || {},
    streaks: {
      current: streakDays || stats?.streaks?.current || 0,
      longest: stats?.streaks?.longest || 0,
      novaCurrent: stats?.streaks?.novaCurrent || 0,
      novaLongest: stats?.streaks?.novaLongest || 0,
    },
    thisWeek: stats?.thisWeek || {},
    today: {
      ...(stats?.today || {}),
      hasActivity: hasDailyActivity(stats),
    },
    streakDays: streakDays || stats?.streaks?.current || 0,
    mealLogs: stats?.totals?.mealLogs || 0,
    workoutLogs: stats?.totals?.workoutLogs || 0,
    meditationLogs: stats?.totals?.meditationLogs || 0,
    yogaLogs: stats?.totals?.yogaLogs || 0,
    sleepLogs: stats?.totals?.sleepLogs || 0,
    moodLogs: stats?.totals?.moodLogs || 0,
    menstrualLogs: stats?.totals?.menstrualLogs || 0,
    screenTimeLogs: stats?.totals?.screenTimeLogs || 0,
    readingLogs: stats?.totals?.readingLogs || 0,
    habitLogs: stats?.totals?.habitLogs || 0,
    stepLogs: stats?.totals?.stepLogs || 0,
    activityCount: stats?.totals?.activityCount || 0,
    todayActivityCount: stats?.today?.activityCount || 0,
    weeklyActivityCount: stats?.thisWeek?.activityCount || 0,
    totalNovaCoins: stats?.totals?.coinsEarned || 0,
  };
}

export default {
  checkQuestCompletion,
  getUserQuests,
};

// src/services/questService.js
import { Parser } from 'expr-eval';
import Quest from '~/models/questModel';
import User from '~/models/userModel';
import novaCoinsService from '~/services/novaCoinsService';
import httpStatus from 'http-status';
import APIError from '~/utils/apiError';

const parser = new Parser();

/**
 * Check quest completion using pre-computed stats
 * @param {ObjectId} userId
 * @param {Object} params
 * @param {Object} params.stats - UserStats object with totals, streaks, thisWeek
 * @param {Number} params.streakDays - Current streak
 */
export const checkQuestCompletion = async (userId, params = {}) => {
  try {
    const { stats, streakDays } = params;

    const user = await User.findById(userId).select('questsCompleted novaCoins');
    if (!user) {
      throw new APIError('User not found', httpStatus.NOT_FOUND);
    }

    const quests = await Quest.find({ isActive: true });

    const completedQuests = [];
    let totalBonusCoins = 0;

    // Build evaluation context from stats
    const context = buildContext(stats, streakDays);

    for (const quest of quests) {
      // Skip if already completed (for milestone quests)
      if (quest.resetPeriod === 'none') {
        const alreadyCompleted = (user.questsCompleted || []).some(
          (q) => q.questId?.toString() === quest._id.toString()
        );
        if (alreadyCompleted) continue;
      }

      try {
        const conditionMet = parser.parse(quest.condition).evaluate(context);

        if (conditionMet) {
          // Award coins
          if (quest.rewardCoins > 0) {
            await novaCoinsService.awardCoins(userId, {
              amount: quest.rewardCoins,
              type: 'quest_bonus',
              category: 'quest',
              refId: quest._id,
              refModel: 'quests',
              description: `Quest completed: ${quest.title}`,
              metadata: { questId: quest._id }
            });

            totalBonusCoins += quest.rewardCoins;
          }

          // Add badge if any
          if (quest.badge?.name) {
            await User.findByIdAndUpdate(userId, {
              $push: {
                badges: {
                  name: quest.badge.name,
                  icon: quest.badge.icon,
                  unlockedAt: new Date(),
                }
              }
            });
          }

          // Mark quest as completed
          await User.findByIdAndUpdate(userId, {
            $push: {
              questsCompleted: {
                questId: quest._id,
                completedAt: new Date(),
                coinsAwarded: quest.rewardCoins
              }
            }
          });

          completedQuests.push({
            id: quest._id,
            title: quest.title,
            description: quest.description,
            rewardCoins: quest.rewardCoins,
            badge: quest.badge
          });
        }
      } catch (err) {
        console.error(`Quest condition error (ID: ${quest._id}):`, err.message);
      }
    }

    return {
      completed: completedQuests,
      bonusCoins: totalBonusCoins
    };
  } catch (err) {
    console.error('Quest service error:', err);
    return { completed: [], bonusCoins: 0 };
  }
};

/**
 * Get user's available quests with progress
 */
export const getUserQuests = async (userId) => {
  const [user, quests, stats] = await Promise.all([
    User.findById(userId).select('questsCompleted'),
    Quest.find({ isActive: true }),
    require('~/services/statsService').getStats(userId)
  ]);

  const completedIds = new Set(
    (user?.questsCompleted || []).map(q => q.questId?.toString())
  );

  const streakDays = stats?.streaks?.current || 0;
  const context = buildContext(stats, streakDays);

  return quests.map(quest => {
    const isCompleted = completedIds.has(quest._id.toString());

    return {
      id: quest._id,
      title: quest.title,
      description: quest.description,
      category: quest.category,
      rewardCoins: quest.rewardCoins,
      badge: quest.badge,
      isCompleted,
    };
  });
};

/**
 * Build context object for condition evaluation
 */
function buildContext(stats, streakDays) {
  return {
    // From UserStats.totals
    totals: stats?.totals || {},

    // From UserStats.streaks
    streaks: {
      current: streakDays || stats?.streaks?.current || 0,
      longest: stats?.streaks?.longest || 0
    },

    // From UserStats.thisWeek
    thisWeek: stats?.thisWeek || {},

    // Flat access for backward compatibility
    streakDays: streakDays || stats?.streaks?.current || 0,
    mealLogs: stats?.totals?.mealLogs || 0,
    workoutLogs: stats?.totals?.workoutLogs || 0,
    meditationLogs: stats?.totals?.meditationLogs || 0,
    yogaLogs: stats?.totals?.yogaLogs || 0,
    sleepLogs: stats?.totals?.sleepLogs || 0,
    moodLogs: stats?.totals?.moodLogs || 0,
    menstrualLogs: stats?.totals?.menstrualLogs || 0,
    screenTimeLogs: stats?.totals?.screenTimeLogs || 0,
    totalNovaCoins: stats?.totals?.coinsEarned || 0,
  };
}

export default {
  checkQuestCompletion,
  getUserQuests
};
// src/services/gamificationService.js
import novaCoinsService from '~/services/novaCoinsService';
import statsService from '~/services/statsService';
import badgeService from '~/services/badgeService';
import questService from '~/services/questService';
import { COIN_REWARDS, LEVEL_CONFIG, STREAK_CONFIG } from '~/config/gamification';
import User from '~/models/userModel';

/**
 * Main orchestrator for all gamification actions
 * Call this after any activity is logged
 * 
 * @param {ObjectId} userId 
 * @param {Object} activity
 * @param {String} activity.type - Activity type (mood, workout, etc.)
 * @param {ObjectId} activity.logId - ID of the saved log document
 * @param {String} activity.logModel - Model name (moodLogs, workoutLogs, etc.)
 * @param {Object} activity.data - Activity-specific data
 */
export const processActivity = async (userId, activity) => {
    try {
        const { type, logId, logModel, data = {} } = activity;
        const rewardConfig = COIN_REWARDS[type];

        if (!rewardConfig) {
            throw new Error(`Unknown activity type: ${type}`);
        }

        // 1. Calculate base coins
        let baseCoins = rewardConfig.base;
        if (rewardConfig.formula) {
            baseCoins = calculateFromFormula(rewardConfig.formula, data);
        }

        // 2. Update streak and get multiplier
        const streakResult = await statsService.updateStreak(userId);
        const multiplier = STREAK_CONFIG.bonusMultiplier(streakResult.current);

        // 3. Apply multiplier and cap
        let finalCoins = Math.floor(baseCoins * multiplier);
        finalCoins = Math.min(finalCoins, rewardConfig.dailyCap);

        // 4. Award coins with transaction log
        let coinsResult = { earned: 0, balance: 0 };
        if (finalCoins > 0) {
            coinsResult = await novaCoinsService.awardCoins(userId, {
                amount: finalCoins,
                type: 'activity_reward',
                category: type,
                refId: logId,
                refModel: logModel,
                description: rewardConfig.description,
                metadata: {
                    formula: rewardConfig.formula,
                    baseAmount: baseCoins,
                    multiplier: multiplier
                }
            });
        }

        // 5. Update user stats
        await statsService.updateStats(userId, type, {
            ...data,
            coinsEarned: finalCoins
        });

        // 6. Get updated stats for quest/badge evaluation
        const stats = await statsService.getStats(userId);

        // 7. Check quest completion
        const questResult = await questService.checkQuestCompletion(userId, {
            stats,
            streakDays: streakResult.current
        });

        // 8. Check badge unlocks
        const badgeResult = await badgeService.evaluate(userId, stats);

        // 9. Check streak milestones
        let streakBonus = 0;
        const streakMilestone = STREAK_CONFIG.milestones[streakResult.current];
        if (streakResult.isNewStreak && streakMilestone) {
            streakBonus = streakMilestone.bonusCoins || 0;
            if (streakBonus > 0) {
                await novaCoinsService.awardCoins(userId, {
                    amount: streakBonus,
                    type: 'streak_bonus',
                    category: 'streak',
                    description: `${streakResult.current}-day streak bonus!`,
                    metadata: { streakDays: streakResult.current }
                });
            }
        }

        // 10. Update level if needed
        const totalCoins = coinsResult.balance + questResult.bonusCoins + badgeResult.bonusCoins + streakBonus;
        const levelResult = await updateLevel(userId, totalCoins);

        return {
            coinsEarned: finalCoins,
            bonusCoins: {
                quest: questResult.bonusCoins,
                badge: badgeResult.bonusCoins,
                streak: streakBonus
            },
            totalCoinsEarned: finalCoins + questResult.bonusCoins + badgeResult.bonusCoins + streakBonus,
            totalCoins: totalCoins,
            streak: {
                current: streakResult.current,
                isNew: streakResult.isNewStreak,
                milestone: streakMilestone ? streakResult.current : null
            },
            level: levelResult,
            questsCompleted: questResult.completed,
            badgesUnlocked: badgeResult.unlocked
        };

    } catch (err) {
        console.error('Gamification error:', err);
        // Return safe defaults instead of throwing
        return {
            coinsEarned: 0,
            bonusCoins: { quest: 0, badge: 0, streak: 0 },
            totalCoinsEarned: 0,
            totalCoins: 0,
            streak: { current: 0, isNew: false, milestone: null },
            level: { current: 1, previous: 1, isLevelUp: false, milestone: null },
            questsCompleted: [],
            badgesUnlocked: []
        };
    }
};

/**
 * Calculate coins from formula string
 */
function calculateFromFormula(formula, data) {
    try {
        // Simple formula evaluation
        // Supports: "steps / 1000", "durationMin / 5", "caloriesBurned / 100"
        const parts = formula.split('/').map(p => p.trim());
        if (parts.length === 2) {
            const value = data[parts[0]] || 0;
            const divisor = parseFloat(parts[1]);
            return Math.floor(value / divisor);
        }
        return 0;
    } catch (err) {
        console.error('Formula calculation error:', err);
        return 0;
    }
}

/**
 * Update user level based on total coins
 */
async function updateLevel(userId, totalCoins) {
    const newLevel = Math.min(
        Math.floor(totalCoins / LEVEL_CONFIG.coinsPerLevel) + 1,
        LEVEL_CONFIG.maxLevel
    );

    const user = await User.findById(userId).select('level');
    const currentLevel = user?.level || 1;

    if (newLevel > currentLevel) {
        await User.findByIdAndUpdate(
            userId,
            { level: newLevel },
            { new: true }
        );

        // Check for level milestone rewards
        const milestone = LEVEL_CONFIG.milestones[newLevel];
        if (milestone?.bonusCoins) {
            await novaCoinsService.awardCoins(userId, {
                amount: milestone.bonusCoins,
                type: 'badge_bonus',
                category: 'badge',
                description: `Level ${newLevel} milestone!`,
                metadata: { level: newLevel }
            });
        }

        return {
            current: newLevel,
            previous: currentLevel,
            isLevelUp: true,
            milestone: milestone || null
        };
    }

    return {
        current: currentLevel,
        previous: currentLevel,
        isLevelUp: false,
        milestone: null
    };
}

/**
 * Get user's gamification summary
 */
export const getSummary = async (userId) => {
    const [user, stats, badges] = await Promise.all([
        User.findById(userId).select('novaCoins level badges questsCompleted'),
        statsService.getStats(userId),
        badgeService.getUserBadges(userId)
    ]);

    const currentLevel = user?.level || 1;
    const coinsForNextLevel = currentLevel * LEVEL_CONFIG.coinsPerLevel;
    const progress = Math.round(((user?.novaCoins || 0) % LEVEL_CONFIG.coinsPerLevel) / LEVEL_CONFIG.coinsPerLevel * 100);

    return {
        novaCoins: user?.novaCoins || 0,
        level: currentLevel,
        levelProgress: progress,
        coinsToNextLevel: coinsForNextLevel - (user?.novaCoins || 0),
        streak: {
            current: stats?.streaks?.current || 0,
            longest: stats?.streaks?.longest || 0
        },
        stats: stats?.totals || {},
        badgesCount: {
            unlocked: (user?.badges || []).length,
            total: badges.length
        },
        questsCompleted: (user?.questsCompleted || []).length
    };
};

export default {
    processActivity,
    getSummary
};

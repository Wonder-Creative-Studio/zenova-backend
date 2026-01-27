// src/services/badgeService.js
import { Parser } from 'expr-eval';
import Badge from '~/models/badgeModel';
import User from '~/models/userModel';
import novaCoinsService from '~/services/novaCoinsService';

const parser = new Parser();

/**
 * Evaluate and unlock badges for a user
 * @param {ObjectId} userId
 * @param {Object} stats - UserStats object
 */
export const evaluate = async (userId, stats) => {
    try {
        const user = await User.findById(userId).select('badges');
        if (!user) {
            return { unlocked: [], bonusCoins: 0 };
        }

        const badges = await Badge.find({ isActive: true });
        const unlocked = [];
        let totalBonusCoins = 0;

        // Build context for condition evaluation
        const context = buildContext(stats);

        // Get already unlocked badge names
        const unlockedNames = new Set((user.badges || []).map(b => b.name));

        for (const badge of badges) {
            // Skip if already unlocked
            if (unlockedNames.has(badge.name)) continue;

            try {
                // Evaluate condition
                let conditionMet = false;

                if (badge.statField && badge.targetValue !== undefined) {
                    // Simple stat-based badge
                    const currentValue = getNestedValue(context, badge.statField) || 0;
                    conditionMet = currentValue >= badge.targetValue;
                } else if (badge.condition) {
                    // Expression-based badge
                    conditionMet = parser.parse(badge.condition).evaluate(context);
                }

                if (conditionMet) {
                    // Unlock badge
                    await User.findByIdAndUpdate(userId, {
                        $push: {
                            badges: {
                                name: badge.name,
                                displayName: badge.displayName,
                                icon: badge.icon,
                                tier: badge.tier,
                                unlockedAt: new Date()
                            }
                        }
                    });

                    // Award bonus coins
                    if (badge.bonusCoins > 0) {
                        await novaCoinsService.awardCoins(userId, {
                            amount: badge.bonusCoins,
                            type: 'badge_bonus',
                            category: 'badge',
                            refId: badge._id,
                            refModel: 'badges',
                            description: `Badge unlocked: ${badge.displayName}`,
                            metadata: { badgeId: badge._id }
                        });
                        totalBonusCoins += badge.bonusCoins;
                    }

                    unlocked.push({
                        name: badge.name,
                        displayName: badge.displayName,
                        icon: badge.icon,
                        tier: badge.tier,
                        bonusCoins: badge.bonusCoins
                    });
                }
            } catch (err) {
                console.error(`Badge condition error (${badge.name}):`, err.message);
            }
        }

        return { unlocked, bonusCoins: totalBonusCoins };
    } catch (err) {
        console.error('Badge service error:', err);
        return { unlocked: [], bonusCoins: 0 };
    }
};

/**
 * Get user's badges with progress info
 */
export const getUserBadges = async (userId) => {
    const [user, allBadges, stats] = await Promise.all([
        User.findById(userId).select('badges'),
        Badge.find({ isActive: true }).sort({ sortOrder: 1 }),
        require('~/services/statsService').getStats(userId)
    ]);

    const unlockedMap = new Map();
    (user?.badges || []).forEach(b => {
        unlockedMap.set(b.name, b);
    });

    const context = buildContext(stats);

    return allBadges.map(badge => {
        const unlocked = unlockedMap.get(badge.name);
        let progress = 0;

        if (badge.statField && badge.targetValue) {
            const currentValue = getNestedValue(context, badge.statField) || 0;
            progress = Math.min(100, Math.round((currentValue / badge.targetValue) * 100));
        }

        return {
            name: badge.name,
            displayName: badge.displayName,
            description: badge.description,
            icon: badge.icon,
            category: badge.category,
            tier: badge.tier,
            bonusCoins: badge.bonusCoins,
            isUnlocked: !!unlocked,
            unlockedAt: unlocked?.unlockedAt,
            progress
        };
    });
};

/**
 * Build context for condition evaluation
 */
function buildContext(stats) {
    return {
        totals: stats?.totals || {},
        streaks: stats?.streaks || { current: 0, longest: 0 },
        thisWeek: stats?.thisWeek || {},
        // Flatten for easier access in conditions
        moodLogs: stats?.totals?.moodLogs || 0,
        workoutLogs: stats?.totals?.workoutLogs || 0,
        meditationLogs: stats?.totals?.meditationLogs || 0,
        yogaLogs: stats?.totals?.yogaLogs || 0,
        sleepLogs: stats?.totals?.sleepLogs || 0,
        steps: stats?.totals?.steps || 0,
        coinsEarned: stats?.totals?.coinsEarned || 0,
        streakDays: stats?.streaks?.current || 0,
        longestStreak: stats?.streaks?.longest || 0
    };
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj, path) {
    return path.split('.').reduce((acc, part) => acc?.[part], obj);
}

export default {
    evaluate,
    getUserBadges
};

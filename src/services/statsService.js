// src/services/statsService.js
import UserStats from '~/models/userStatsModel';
import { CATEGORY_STAT_MAP } from '~/config/gamification';

/**
 * Update user statistics after an activity
 * @param {ObjectId} userId
 * @param {String} category - Activity type (mood, workout, etc.)
 * @param {Object} data - Activity-specific data
 */
export const updateStats = async (userId, category, data = {}) => {
    const statMap = CATEGORY_STAT_MAP[category];
    if (!statMap) {
        console.warn(`No stat mapping for category: ${category}`);
        return;
    }

    const updates = { $inc: {} };

    // Increment total count
    if (statMap.total) {
        updates.$inc[statMap.total] = 1;
    }

    // Increment weekly count
    if (statMap.weekly) {
        updates.$inc[statMap.weekly] = 1;
    }

    // Add specific values if provided
    if (data.steps) {
        updates.$inc['totals.steps'] = data.steps;
        updates.$inc['thisWeek.steps'] = data.steps;
    }
    if (data.durationMin) {
        updates.$inc['totals.minutes'] = data.durationMin;
        updates.$inc['thisWeek.minutes'] = data.durationMin;
    }
    if (data.caloriesBurned) {
        updates.$inc['totals.caloriesBurned'] = data.caloriesBurned;
        updates.$inc['thisWeek.caloriesBurned'] = data.caloriesBurned;
    }
    if (data.coinsEarned) {
        updates.$inc['totals.coinsEarned'] = data.coinsEarned;
        updates.$inc['today.coinsEarned'] = data.coinsEarned;
    }

    await UserStats.findOneAndUpdate(
        { userId },
        updates,
        { upsert: true, new: true }
    );
};

/**
 * Update streak for a user
 * @param {ObjectId} userId
 * @returns {Object} { current, longest, isNewStreak }
 */
export const updateStreak = async (userId) => {
    const stats = await UserStats.findOne({ userId });
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let current = stats?.streaks?.current || 0;
    let longest = stats?.streaks?.longest || 0;
    let lastDate = stats?.streaks?.lastActivityDate;
    let isNewStreak = false;

    if (!lastDate) {
        // First activity ever
        current = 1;
        isNewStreak = true;
    } else {
        const lastActivityDate = new Date(lastDate);
        const lastDay = new Date(lastActivityDate.getFullYear(), lastActivityDate.getMonth(), lastActivityDate.getDate());
        const diffDays = Math.floor((today - lastDay) / (24 * 60 * 60 * 1000));

        if (diffDays === 0) {
            // Same day, no streak change
            isNewStreak = false;
        } else if (diffDays === 1) {
            // Consecutive day
            current += 1;
            isNewStreak = true;
        } else {
            // Streak broken
            current = 1;
            isNewStreak = true;
        }
    }

    // Update longest if needed
    if (current > longest) {
        longest = current;
    }

    await UserStats.findOneAndUpdate(
        { userId },
        {
            $set: {
                'streaks.current': current,
                'streaks.longest': longest,
                'streaks.lastActivityDate': now
            }
        },
        { upsert: true }
    );

    return { current, longest, isNewStreak };
};

/**
 * Get user stats
 * @param {ObjectId} userId
 */
export const getStats = async (userId) => {
    let stats = await UserStats.findOne({ userId });

    if (!stats) {
        // Create default stats
        stats = await UserStats.create({
            userId,
            totals: {},
            streaks: { current: 0, longest: 0 },
            thisWeek: {},
            today: {}
        });
    }

    // Check if we need to reset weekly stats
    const now = new Date();
    const lastReset = stats.lastWeeklyReset;
    if (lastReset) {
        const daysSinceReset = Math.floor((now - lastReset) / (24 * 60 * 60 * 1000));
        if (daysSinceReset >= 7) {
            // Reset weekly stats
            await UserStats.findOneAndUpdate(
                { userId },
                {
                    $set: {
                        thisWeek: {},
                        lastWeeklyReset: now
                    }
                }
            );
            stats.thisWeek = {};
        }
    }

    return stats;
};

/**
 * Reset daily stats (call via cron at midnight)
 */
export const resetDailyStats = async (userId) => {
    await UserStats.findOneAndUpdate(
        { userId },
        { $set: { today: {} } }
    );
};

export default {
    updateStats,
    updateStreak,
    getStats,
    resetDailyStats
};

// src/services/gamificationServiceV2.js
import User from '~/models/userModel';
import UserStats from '~/models/userStatsModel';
import configV2 from '~/config/gamificationV2';
import novaCoinsService from '~/services/novaCoinsService';

// Helper to map generic activities to the 3 Core Nova Categories
const getNovaCategory = (activityType) => {
    const move = ['workout', 'steps', 'yoga'];
    const eat = ['meal', 'water'];
    const thrive = ['mood', 'meditation', 'sleep', 'reading', 'habit', 'screen_time'];
    if (move.includes(activityType)) return 'move';
    if (eat.includes(activityType)) return 'eat';
    if (thrive.includes(activityType)) return 'thrive';
    return null;
};

export const processActivityV2 = async (userId, activity) => {
    try {
        const { type, logId, logModel } = activity;
        const now = new Date();

        // Ensure user stats exist and are populated
        let stats = await UserStats.findOne({ userId });
        if (!stats) {
            stats = await UserStats.create({ userId });
        }

        const user = await User.findById(userId);
        if (!user) throw new Error('User not found');

        // 1. Resolve Rank Config
        const rankName = user.rank || 'Awakener';
        const rankConfig = configV2.RANKS_CONFIG.find(r => r.name === rankName) || configV2.RANKS_CONFIG[0];

        // 2. Identify track actions and Nova Categories
        let medalsToAward = 0;
        let ncToAward = 0;
        let description = `Tracked ${type}`;

        // Base Tracking Rewards
        let baseMedals = configV2.ACTIONS_CONFIG.track_item.medals;
        let bypassLimit = configV2.ACTIONS_CONFIG.track_item.bypassLimit;
        let baseNC = configV2.ACTIONS_CONFIG.track_item.baseNC;

        const novaCategory = getNovaCategory(type);
        let categoriesTrackedToday = stats.today?.categoriesTracked || [];

        let isFirstOfCategory = false;
        let didActivateNovaStreak = false;

        // Daily Reset checking
        const todayStatsDate = stats.today?.date ? new Date(stats.today.date) : new Date(0);
        if (todayStatsDate.getDate() !== now.getDate() || todayStatsDate.getMonth() !== now.getMonth()) {
            categoriesTrackedToday = [];
            stats.today.medalsEarnedStandard = 0;
            stats.today.coinsEarned = 0;
            stats.today.date = now;
        }

        if (novaCategory && !categoriesTrackedToday.includes(novaCategory)) {
            categoriesTrackedToday.push(novaCategory);
            isFirstOfCategory = true;

            // Category Activation Bonus
            baseMedals += configV2.ACTIONS_CONFIG.category_activation.bonusMedal;
            baseNC += configV2.ACTIONS_CONFIG.category_activation.baseNC;

            // Check if all 3 (Eat, Move, Thrive) are now hit!
            if (categoriesTrackedToday.includes('move') && categoriesTrackedToday.includes('eat') && categoriesTrackedToday.includes('thrive')) {
                didActivateNovaStreak = true;

                // Add Nova-streak bonus limits and Medals
                const nsConfig = configV2.ACTIONS_CONFIG.nova_streak_activation;
                baseMedals += nsConfig.medals;
                baseNC += nsConfig.baseNC;
                bypassLimit = nsConfig.bypassLimit; // Inherit bypass because it triggered a Nova streak!
                description = "Nova-streak Activated! Logged Eat, Move & Thrive!";

                // Update Nova Streak counts
                let nsCurrent = stats.streaks.novaCurrent || 0;
                let nsLongest = stats.streaks.novaLongest || 0;
                nsCurrent += 1;
                if (nsCurrent > nsLongest) nsLongest = nsCurrent;

                stats.streaks.novaCurrent = nsCurrent;
                stats.streaks.novaLongest = nsLongest;
                stats.streaks.lastNovaLogDate = now;

                // 7-Day Nova Streak Milestone
                if (nsCurrent % 7 === 0) {
                    baseMedals += configV2.ACTIONS_CONFIG.seven_day_nova_streak_bonus.medals;
                    baseNC += configV2.ACTIONS_CONFIG.seven_day_nova_streak_bonus.baseNC;
                    description += ` 7-Day Nova Streak!`;
                }
            }
        }

        // 3. Process Medals with 10 Daily Limit constraint
        let finalMedals = baseMedals;
        if (!bypassLimit) {
            let spaceLeft = configV2.DAILY_MEDAL_LIMIT - (stats.today.medalsEarnedStandard || 0);
            if (spaceLeft <= 0) {
                finalMedals = 0; // Cap reached!
            } else if (finalMedals > spaceLeft) {
                finalMedals = spaceLeft;
            }
            stats.today.medalsEarnedStandard += finalMedals;
        }
        medalsToAward = finalMedals;

        // 4. Process Nova Coins (NC) with Rank Multiplier and Boost limits
        // Normal Streak Boost: max 150%. Nova Streak Boost: max 200%.
        let maxBoost = 1.0;
        const regStreakWeeks = Math.floor((stats.streaks.current || 1) / 7);
        const novaStreakWeeks = Math.floor((stats.streaks.novaCurrent || 0) / 7);

        // Nova Streak boost (20% per week) supersedes Normal Streak boost (10% per week)
        if (novaStreakWeeks > 0) {
            maxBoost = Math.min(2.0, 1.0 + (0.20 * novaStreakWeeks));
        } else if (regStreakWeeks > 0) {
            maxBoost = Math.min(1.5, 1.0 + (0.10 * regStreakWeeks));
        }

        // Apply max daily rank limit * maxBoost
        let finalMaxDailyNC = rankConfig.maxDailyNC * maxBoost;

        let potentialNC = baseNC * rankConfig.ncMultiplier;
        let ncSpaceLeft = finalMaxDailyNC - (stats.today.coinsEarned || 0);

        if (ncSpaceLeft <= 0) {
            ncToAward = 0;
        } else if (potentialNC > ncSpaceLeft) {
            ncToAward = ncSpaceLeft;
        } else {
            ncToAward = potentialNC;
        }

        stats.today.coinsEarned += ncToAward;
        stats.today.categoriesTracked = categoriesTrackedToday;

        // 5. Update User and Level
        const newTotalMedals = (user.medals || 0) + medalsToAward;
        const newLevel = configV2.getLevelFromMedals(newTotalMedals);
        const newRank = configV2.LEVEL_MAP[newLevel]?.rank || user.rank;

        let hasLeveledUp = newLevel > user.level;

        // Save User
        user.medals = newTotalMedals;
        user.level = newLevel;
        user.rank = newRank;
        await user.save();

        // Save Stats
        await stats.save();

        // Award Coins via Transaction Layer
        if (ncToAward > 0) {
            const coinPayload = {
                amount: Math.floor(ncToAward),
                type: 'activity_reward',
                category: type,
                description: description
            };
            // Only include refId/refModel when they are valid (not test stubs)
            if (logId && logId !== 'test_log') {
                coinPayload.refId = logId;
                coinPayload.refModel = logModel;
            }
            await novaCoinsService.awardCoins(userId, coinPayload);
        }

        return {
            medalsEarned: medalsToAward,
            totalMedals: newTotalMedals,
            ncEarned: Math.floor(ncToAward),
            isCategoryActivation: isFirstOfCategory,
            isNovaStreak: didActivateNovaStreak,
            newLevel: newLevel,
            newRank: newRank,
            hasLeveledUp: hasLeveledUp,
            medalsToNextLevel: configV2.LEVEL_MAP[newLevel]?.medalsRequiredTotal - newTotalMedals,
            dailyMedalsStandardRemaining: Math.max(0, configV2.DAILY_MEDAL_LIMIT - stats.today.medalsEarnedStandard)
        };

    } catch (error) {
        console.error('Gamification V2 Error:', error);
        return { error: error.message };
    }
};

export default {
    processActivityV2,
    getNovaCategory
};

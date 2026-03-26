// src/config/gamificationV2.js

export const RANKS_CONFIG = [
    { name: 'Awakener', levels: 3, medalsPerLevel: 15, ncMultiplier: 1.0, maxDailyNC: 1000 },
    { name: 'Explorer', levels: 4, medalsPerLevel: 15, ncMultiplier: 1.0, maxDailyNC: 1000 },
    { name: 'Seeker', levels: 5, medalsPerLevel: 20, ncMultiplier: 1.0, maxDailyNC: 1000 },
    { name: 'Achiever', levels: 7, medalsPerLevel: 20, ncMultiplier: 1.1, maxDailyNC: 1100 },
    { name: 'Zen Master', levels: 8, medalsPerLevel: 25, ncMultiplier: 1.1, maxDailyNC: 1100 },
    { name: 'Life Architect', levels: 9, medalsPerLevel: 25, ncMultiplier: 1.1, maxDailyNC: 1100 },
    { name: 'Sage', levels: 10, medalsPerLevel: 30, ncMultiplier: 1.2, maxDailyNC: 1200 },
    { name: 'Ascended', levels: 14, medalsPerLevel: 30, ncMultiplier: 1.2, maxDailyNC: 1200 },
    { name: 'Grand Zenova', levels: 21, medalsPerLevel: 35, ncMultiplier: 1.25, maxDailyNC: 1250 }
];

export const DAILY_MEDAL_LIMIT = 10;

// Dynamic Generation of the Level Map
export const LEVEL_MAP = {};
let currentLevel = 1;
let cumulativeMedals = 0;

RANKS_CONFIG.forEach(rank => {
    for (let i = 0; i < rank.levels; i++) {
        cumulativeMedals += rank.medalsPerLevel;
        LEVEL_MAP[currentLevel] = {
            rank: rank.name,
            medalsRequiredTotal: cumulativeMedals,
            medalsForNextLevel: rank.medalsPerLevel,
            ncMultiplier: rank.ncMultiplier,
            maxDailyBaseNC: rank.maxDailyNC
        };
        currentLevel++;
    }
});

// Helper for finding Level from Medals
export const getLevelFromMedals = (totalMedals) => {
    let earnedLevel = 1;
    for (let level = 1; level < currentLevel; level++) { // up to 81
        if (totalMedals >= LEVEL_MAP[level].medalsRequiredTotal) {
            earnedLevel = level + 1;
        } else {
            break;
        }
    }
    // Cap at maximum level
    return Math.min(earnedLevel, currentLevel - 1);
};

// Events mapping with Base Medals, Limits, and Nova Coins
export const ACTIONS_CONFIG = {
    // Basic Item tracking
    track_item: {
        medals: 1, // Can scale up to 3 max in service logic
        bypassLimit: false,
        baseNC: 100 // Example base limit, dynamic in service
    },
    // Category tracking (Eat, Move, Thrive)
    category_activation: {
        bonusMedal: 1, // +1 Medal than base
        bypassLimit: false,
        baseNC: 100
    },
    // Triggers when 4 predefined categories are met!
    nova_streak_activation: {
        medals: 1, // "+1 medal beyond daily limits"
        bypassLimit: true,
        baseNC: 300
    },
    daily_quest: {
        medals: 2,
        bypassLimit: false,
        baseNC: 100
    },
    weekly_quest: {
        medals: 5,
        bypassLimit: true,
        baseNC: 500
    },
    monthly_quest: {
        medals: 15,
        bypassLimit: true,
        baseNC: 2000
    },
    daily_regular_streak_bonus: {
        medals: 1,
        bypassLimit: false,
        baseNC: 200
    },
    seven_day_regular_streak_bonus: {
        medals: 3,
        bypassLimit: false,
        baseNC: 500
    },
    daily_nova_streak_bonus: {
        medals: 1,
        bypassLimit: true,
        baseNC: 300
    },
    seven_day_nova_streak_bonus: {
        medals: 7,
        bypassLimit: true,
        baseNC: 1000
    },
    referral: {
        medals: 3,
        bypassLimit: false,
        baseNC: 2000
    }
};

export default {
    RANKS_CONFIG,
    LEVEL_MAP,
    DAILY_MEDAL_LIMIT,
    ACTIONS_CONFIG,
    getLevelFromMedals
};

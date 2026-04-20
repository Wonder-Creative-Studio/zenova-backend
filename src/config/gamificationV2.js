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

// ─── Level Gifts (per spec) ────────────────────────────────────────────────
// giftType: 'tracker_unlock' | 'nova_coins'
// giftValue: number of trackers unlocked OR number of NC awarded
// giftLabel: human-readable description shown in the app
export const LEVEL_GIFTS = {
    1: { giftType: 'tracker_unlock', giftValue: 28, giftLabel: '28 trackers unlocked already' },
    2: { giftType: 'tracker_unlock', giftValue: 3, giftLabel: '3 more trackers unlocked' },
    3: { giftType: 'tracker_unlock', giftValue: 4, giftLabel: '4 more trackers unlocked' },
    4: { giftType: 'tracker_unlock', giftValue: 7, giftLabel: '7 more trackers unlocked' },
    5: { giftType: 'tracker_unlock', giftValue: 2, giftLabel: '2 more trackers unlocked' },
    6: { giftType: 'tracker_unlock', giftValue: 6, giftLabel: '6 more trackers unlocked' },
    7: { giftType: 'tracker_unlock', giftValue: 2, giftLabel: '2 more trackers unlocked' },
    8: { giftType: 'tracker_unlock', giftValue: 1, giftLabel: '1 more tracker unlocked' },
    9: { giftType: 'nova_coins', giftValue: 500, giftLabel: '500 Nova Coins + coupons' },
    10: { giftType: 'nova_coins', giftValue: 600, giftLabel: '600 Nova Coins + coupons' },
    11: { giftType: 'nova_coins', giftValue: 700, giftLabel: '700 Nova Coins + coupons' },
    12: { giftType: 'nova_coins', giftValue: 800, giftLabel: '800 Nova Coins + coupons' },
    // Note: Level 13 is skipped in the spec — jumps from 12 to 14
    14: { giftType: 'nova_coins', giftValue: 900, giftLabel: '900 Nova Coins + coupons' },
    15: { giftType: 'nova_coins', giftValue: 1000, giftLabel: '1000 Nova Coins + coupons' },
    16: { giftType: 'nova_coins', giftValue: 1000, giftLabel: '1000 Nova Coins + coupons' },
    17: { giftType: 'nova_coins', giftValue: 1000, giftLabel: '1000 Nova Coins + coupons' },
    18: { giftType: 'nova_coins', giftValue: 1000, giftLabel: '1000 Nova Coins + coupons' },
    19: { giftType: 'nova_coins', giftValue: 1000, giftLabel: '1000 Nova Coins + coupons' },
    20: { giftType: 'nova_coins', giftValue: 1000, giftLabel: '1000 Nova Coins + coupons' },
    21: { giftType: 'nova_coins', giftValue: 1200, giftLabel: '1200 Nova Coins + coupons' },
    22: { giftType: 'nova_coins', giftValue: 1200, giftLabel: '1200 Nova Coins + coupons' },
    23: { giftType: 'nova_coins', giftValue: 1200, giftLabel: '1200 Nova Coins + coupons' },
    24: { giftType: 'nova_coins', giftValue: 1200, giftLabel: '1200 Nova Coins + coupons' },
    25: { giftType: 'nova_coins', giftValue: 1200, giftLabel: '1200 Nova Coins + coupons' },
    26: { giftType: 'nova_coins', giftValue: 1200, giftLabel: '1200 Nova Coins + coupons' },
    27: { giftType: 'nova_coins', giftValue: 1200, giftLabel: '1200 Nova Coins + coupons' },
    28: { giftType: 'nova_coins', giftValue: 1200, giftLabel: '1200 Nova Coins + coupons' },
    29: { giftType: 'nova_coins', giftValue: 1500, giftLabel: '1500 Nova Coins + coupons' },
    30: { giftType: 'nova_coins', giftValue: 1500, giftLabel: '1500 Nova Coins + coupons' },
    31: { giftType: 'nova_coins', giftValue: 1500, giftLabel: '1500 Nova Coins + coupons' },
    32: { giftType: 'nova_coins', giftValue: 1500, giftLabel: '1500 Nova Coins + coupons' },
    33: { giftType: 'nova_coins', giftValue: 1500, giftLabel: '1500 Nova Coins + coupons' },
    34: { giftType: 'nova_coins', giftValue: 1500, giftLabel: '1500 Nova Coins + coupons' },
    35: { giftType: 'nova_coins', giftValue: 1500, giftLabel: '1500 Nova Coins + coupons' },
    36: { giftType: 'nova_coins', giftValue: 1500, giftLabel: '1500 Nova Coins + coupons' },
    37: { giftType: 'nova_coins', giftValue: 1500, giftLabel: '1500 Nova Coins + coupons' },
    38: { giftType: 'nova_coins', giftValue: 2000, giftLabel: '2000 Nova Coins + coupons' },
    39: { giftType: 'nova_coins', giftValue: 2000, giftLabel: '2000 Nova Coins + coupons' },
    40: { giftType: 'nova_coins', giftValue: 2000, giftLabel: '2000 Nova Coins + coupons' },
    41: { giftType: 'nova_coins', giftValue: 2000, giftLabel: '2000 Nova Coins + coupons' },
    42: { giftType: 'nova_coins', giftValue: 2000, giftLabel: '2000 Nova Coins + coupons' },
    43: { giftType: 'nova_coins', giftValue: 2000, giftLabel: '2000 Nova Coins + coupons' },
    44: { giftType: 'nova_coins', giftValue: 2000, giftLabel: '2000 Nova Coins + coupons' },
    45: { giftType: 'nova_coins', giftValue: 2000, giftLabel: '2000 Nova Coins + coupons' },
    46: { giftType: 'nova_coins', giftValue: 2000, giftLabel: '2000 Nova Coins + coupons' },
    47: { giftType: 'nova_coins', giftValue: 2000, giftLabel: '2000 Nova Coins + coupons' },
    48: { giftType: 'nova_coins', giftValue: 2500, giftLabel: '2500 Nova Coins + coupons' },
    49: { giftType: 'nova_coins', giftValue: 2500, giftLabel: '2500 Nova Coins + coupons' },
    50: { giftType: 'nova_coins', giftValue: 2500, giftLabel: '2500 Nova Coins + coupons' },
    51: { giftType: 'nova_coins', giftValue: 2500, giftLabel: '2500 Nova Coins + coupons' },
    52: { giftType: 'nova_coins', giftValue: 2500, giftLabel: '2500 Nova Coins + coupons' },
    53: { giftType: 'nova_coins', giftValue: 2500, giftLabel: '2500 Nova Coins + coupons' },
    54: { giftType: 'nova_coins', giftValue: 2500, giftLabel: '2500 Nova Coins + coupons' },
    55: { giftType: 'nova_coins', giftValue: 2500, giftLabel: '2500 Nova Coins + coupons' },
    56: { giftType: 'nova_coins', giftValue: 2500, giftLabel: '2500 Nova Coins + coupons' },
    57: { giftType: 'nova_coins', giftValue: 2500, giftLabel: '2500 Nova Coins + coupons' },
    58: { giftType: 'nova_coins', giftValue: 2500, giftLabel: '2500 Nova Coins + coupons' },
    59: { giftType: 'nova_coins', giftValue: 2500, giftLabel: '2500 Nova Coins + coupons' },
    60: { giftType: 'nova_coins', giftValue: 2500, giftLabel: '2500 Nova Coins + coupons' },
    61: { giftType: 'nova_coins', giftValue: 2500, giftLabel: '2500 Nova Coins + coupons' },
    62: { giftType: 'nova_coins', giftValue: 3000, giftLabel: '3000 Nova Coins + coupons' },
    63: { giftType: 'nova_coins', giftValue: 3000, giftLabel: '3000 Nova Coins + coupons' },
    64: { giftType: 'nova_coins', giftValue: 3000, giftLabel: '3000 Nova Coins + coupons' },
    65: { giftType: 'nova_coins', giftValue: 3000, giftLabel: '3000 Nova Coins + coupons' },
    66: { giftType: 'nova_coins', giftValue: 3000, giftLabel: '3000 Nova Coins + coupons' },
    67: { giftType: 'nova_coins', giftValue: 3000, giftLabel: '3000 Nova Coins + coupons' },
    68: { giftType: 'nova_coins', giftValue: 3000, giftLabel: '3000 Nova Coins + coupons' },
    69: { giftType: 'nova_coins', giftValue: 3000, giftLabel: '3000 Nova Coins + coupons' },
    70: { giftType: 'nova_coins', giftValue: 3000, giftLabel: '3000 Nova Coins + coupons' },
    71: { giftType: 'nova_coins', giftValue: 3000, giftLabel: '3000 Nova Coins + coupons' },
    72: { giftType: 'nova_coins', giftValue: 3000, giftLabel: '3000 Nova Coins + coupons' },
    73: { giftType: 'nova_coins', giftValue: 3000, giftLabel: '3000 Nova Coins + coupons' },
    74: { giftType: 'nova_coins', giftValue: 3000, giftLabel: '3000 Nova Coins + coupons' },
    75: { giftType: 'nova_coins', giftValue: 3000, giftLabel: '3000 Nova Coins + coupons' },
    76: { giftType: 'nova_coins', giftValue: 3000, giftLabel: '3000 Nova Coins + coupons' },
    77: { giftType: 'nova_coins', giftValue: 3000, giftLabel: '3000 Nova Coins + coupons' },
    78: { giftType: 'nova_coins', giftValue: 3000, giftLabel: '3000 Nova Coins + coupons' },
    79: { giftType: 'nova_coins', giftValue: 3000, giftLabel: '3000 Nova Coins + coupons' },
    80: { giftType: 'nova_coins', giftValue: 3000, giftLabel: '3000 Nova Coins + coupons' },
    81: { giftType: 'nova_coins', giftValue: 3000, giftLabel: '3000 Nova Coins + coupons' },
    82: { giftType: 'nova_coins', giftValue: 3000, giftLabel: '3000 Nova Coins + coupons' },
    83: { giftType: 'nova_coins', giftValue: 3000, giftLabel: '3000 Nova Coins + coupons' },
};

// ─── Level Map (dynamically generated from RANKS_CONFIG) ──────────────────
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
            maxDailyBaseNC: rank.maxDailyNC,
            gift: LEVEL_GIFTS[currentLevel] || null
        };
        currentLevel++;
    }
});

// ─── Helpers ──────────────────────────────────────────────────────────────
export const getLevelFromMedals = (totalMedals) => {
    let earnedLevel = 1;
    for (let level = 1; level < currentLevel; level++) {
        if (totalMedals >= LEVEL_MAP[level].medalsRequiredTotal) {
            earnedLevel = level + 1;
        } else {
            break;
        }
    }
    return Math.min(earnedLevel, currentLevel - 1);
};

export const getLevelGift = (level) => LEVEL_GIFTS[level] || null;

// ─── Events / Actions Config ──────────────────────────────────────────────
export const ACTIONS_CONFIG = {
    // Basic item tracking — medals scale 1 to 3 max per item
    track_item: {
        medals: 1,
        bypassLimit: false,
        baseNC: 100
    },
    // First item in a new category (Eat / Move / Thrive) → +1 bonus medal
    category_activation: {
        bonusMedal: 1,
        bypassLimit: false,
        baseNC: 100
    },
    // All 3 categories hit in one day → Nova-streak activates
    nova_streak_activation: {
        medals: 1,          // +1 medal beyond daily limits
        bypassLimit: true,
        baseNC: 300
    },
    // Daily quest
    daily_quest: {
        medals: 2,
        bypassLimit: false,
        baseNC: 100
    },
    // Weekly quest
    weekly_quest: {
        medals: 5,
        bypassLimit: true,
        baseNC: 500
    },
    // Monthly quest
    monthly_quest: {
        medals: 15,
        bypassLimit: true,
        baseNC: 2000
    },
    // Regular streak: awarded each day the user tracks anything
    daily_regular_streak_bonus: {
        medals: 1,
        bypassLimit: false,
        baseNC: 200
    },
    // Regular streak 7-day milestone
    seven_day_regular_streak_bonus: {
        medals: 3,
        bypassLimit: false,
        baseNC: 500
    },
    // Nova-streak: awarded when all 3 categories hit (already in nova_streak_activation)
    daily_nova_streak_bonus: {
        medals: 1,
        bypassLimit: true,
        baseNC: 300
    },
    // Nova-streak 7-day milestone
    seven_day_nova_streak_bonus: {
        medals: 7,
        bypassLimit: true,
        baseNC: 1000
    },
    // Referral
    referral: {
        medals: 3,
        bypassLimit: false,
        baseNC: 2000
    }
};

export const QUEST_CONFIG = {
    startCost: 50,    // Nova Coins deducted when user starts today's quests
    skipPenalty: 200, // Nova Coins deducted when user skips today's quests
};

export const STREAK_PAUSE_COST = 200; // Nova Coins to pause a streak for 1 day

export default {
    RANKS_CONFIG,
    LEVEL_MAP,
    LEVEL_GIFTS,
    DAILY_MEDAL_LIMIT,
    ACTIONS_CONFIG,
    QUEST_CONFIG,
    STREAK_PAUSE_COST,
    getLevelFromMedals,
    getLevelGift
};

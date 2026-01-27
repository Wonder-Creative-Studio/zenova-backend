// src/config/gamification.js

// Coin rewards for each activity type
export const COIN_REWARDS = {
    mood: {
        base: 20,
        formula: null,  // Fixed amount
        dailyCap: 20,   // Max coins per day from this activity
        description: 'Daily mood check-in'
    },
    workout: {
        base: 0,
        formula: 'caloriesBurned / 100',  // 1 coin per 100 cal
        dailyCap: 50,
        description: 'Workout activity'
    },
    meal: {
        base: 5,
        formula: null,
        dailyCap: 25,
        description: 'Meal logging'
    },
    meditation: {
        base: 0,
        formula: 'durationMin / 5',  // 1 coin per 5 mins
        dailyCap: 30,
        description: 'Meditation session'
    },
    yoga: {
        base: 0,
        formula: 'durationMin / 5',
        dailyCap: 30,
        description: 'Yoga session'
    },
    sleep: {
        base: 0,
        formula: 'durationMin / 30',  // 1 coin per 30 mins
        dailyCap: 20,
        description: 'Sleep tracking'
    },
    steps: {
        base: 0,
        formula: 'steps / 1000',  // 1 coin per 1000 steps
        dailyCap: 20,
        description: 'Step tracking'
    },
    screen_time: {
        base: 0,
        formula: 'durationMin / 30',
        dailyCap: 10,
        description: 'Screen time tracking'
    },
    bmr: {
        base: 10,
        formula: null,
        dailyCap: 10,
        description: 'BMR calculation'
    },
    menstrual: {
        base: 20,
        formula: null,
        dailyCap: 20,
        description: 'Menstrual tracking'
    },
    habit: {
        base: 1,
        formula: null,  // Only when completed
        dailyCap: 10,
        description: 'Habit completion'
    },
    medicine: {
        base: 1,
        formula: null,
        dailyCap: 5,
        description: 'Medicine reminder'
    },
    reading: {
        base: 0,
        formula: 'durationMin / 10',
        dailyCap: 15,
        description: 'Reading session'
    },
    measurement: {
        base: 5,
        formula: null,
        dailyCap: 10,
        description: 'Body measurement'
    }
};

// Level configuration
export const LEVEL_CONFIG = {
    coinsPerLevel: 200,  // Coins needed per level
    maxLevel: 100,

    // Level milestones with bonuses
    milestones: {
        5: { bonusCoins: 50, badge: 'rising_star' },
        10: { bonusCoins: 100, badge: 'committed' },
        25: { bonusCoins: 250, badge: 'dedicated' },
        50: { bonusCoins: 500, badge: 'master' },
        100: { bonusCoins: 1000, badge: 'legend' }
    }
};

// Streak configuration
export const STREAK_CONFIG = {
    // Bonus coins based on streak length
    bonusMultiplier: (streakDays) => {
        if (streakDays >= 30) return 2.0;  // 100% bonus
        if (streakDays >= 14) return 1.5;  // 50% bonus
        if (streakDays >= 7) return 1.25;  // 25% bonus
        if (streakDays >= 3) return 1.1;   // 10% bonus
        return 1.0;
    },

    // Streak milestones with rewards
    milestones: {
        3: { bonusCoins: 10 },
        7: { bonusCoins: 25, badge: 'week_warrior' },
        14: { bonusCoins: 50, badge: 'two_week_streak' },
        30: { bonusCoins: 100, badge: 'monthly_champion' },
        60: { bonusCoins: 200 },
        90: { bonusCoins: 300, badge: 'quarter_master' },
        180: { bonusCoins: 500 },
        365: { bonusCoins: 1000, badge: 'year_legend' }
    }
};

// Category to stat field mapping
export const CATEGORY_STAT_MAP = {
    mood: { total: 'totals.moodLogs', weekly: 'thisWeek.moodLogs' },
    workout: { total: 'totals.workoutLogs', weekly: 'thisWeek.workoutLogs' },
    meal: { total: 'totals.mealLogs', weekly: 'thisWeek.mealLogs' },
    meditation: { total: 'totals.meditationLogs', weekly: 'thisWeek.meditationLogs' },
    yoga: { total: 'totals.yogaLogs', weekly: 'thisWeek.yogaLogs' },
    sleep: { total: 'totals.sleepLogs', weekly: 'thisWeek.sleepLogs' },
    steps: { total: 'totals.stepLogs', weekly: 'thisWeek.stepLogs' },
    screen_time: { total: 'totals.screenTimeLogs' },
    bmr: { total: 'totals.bmrLogs' },
    menstrual: { total: 'totals.menstrualLogs' },
    habit: { total: 'totals.habitLogs' },
    medicine: { total: 'totals.medicineLogs' },
    reading: { total: 'totals.readingLogs' },
    measurement: { total: 'totals.measurementLogs' }
};

export default {
    COIN_REWARDS,
    LEVEL_CONFIG,
    STREAK_CONFIG,
    CATEGORY_STAT_MAP
};

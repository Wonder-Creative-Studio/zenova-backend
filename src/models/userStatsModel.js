// src/models/userStatsModel.js
import mongoose from 'mongoose';

const userStatsSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true,
        unique: true,
        index: true
    },

    // Lifetime totals
    totals: {
        moodLogs: { type: Number, default: 0 },
        workoutLogs: { type: Number, default: 0 },
        workoutMinutes: { type: Number, default: 0 },
        caloriesBurned: { type: Number, default: 0 },
        mealLogs: { type: Number, default: 0 },
        meditationLogs: { type: Number, default: 0 },
        meditationMinutes: { type: Number, default: 0 },
        yogaLogs: { type: Number, default: 0 },
        yogaMinutes: { type: Number, default: 0 },
        sleepLogs: { type: Number, default: 0 },
        sleepMinutes: { type: Number, default: 0 },
        stepLogs: { type: Number, default: 0 },
        steps: { type: Number, default: 0 },
        screenTimeLogs: { type: Number, default: 0 },
        bmrLogs: { type: Number, default: 0 },
        menstrualLogs: { type: Number, default: 0 },
        habitLogs: { type: Number, default: 0 },
        habitCompletions: { type: Number, default: 0 },
        medicineLogs: { type: Number, default: 0 },
        readingLogs: { type: Number, default: 0 },
        readingMinutes: { type: Number, default: 0 },
        measurementLogs: { type: Number, default: 0 },
        coinsEarned: { type: Number, default: 0 },
        coinsSpent: { type: Number, default: 0 },
    },

    // Streak tracking
    streaks: {
        current: { type: Number, default: 0 },
        longest: { type: Number, default: 0 },
        lastActiveDate: { type: Date }
    },

    // Activity tracking for weekly quests
    thisWeek: {
        weekStart: { type: Date },
        moodLogs: { type: Number, default: 0 },
        workoutLogs: { type: Number, default: 0 },
        mealLogs: { type: Number, default: 0 },
        meditationLogs: { type: Number, default: 0 },
        yogaLogs: { type: Number, default: 0 },
        sleepLogs: { type: Number, default: 0 },
        stepLogs: { type: Number, default: 0 },
    },

    // Daily tracking for caps
    today: {
        date: { type: Date },
        coinsEarned: { type: Number, default: 0 },
        moodCoins: { type: Number, default: 0 },
        workoutCoins: { type: Number, default: 0 },
        mealCoins: { type: Number, default: 0 },
    }

}, { timestamps: true });

// Get or create stats for user
userStatsSchema.statics.getOrCreate = async function (userId) {
    let stats = await this.findOne({ userId });
    if (!stats) {
        stats = await this.create({ userId });
    }
    return stats;
};

// Increment a stat atomically
userStatsSchema.statics.increment = async function (userId, field, amount = 1, session = null) {
    const options = session ? { session } : {};
    const update = { $inc: { [field]: amount } };

    return this.findOneAndUpdate(
        { userId },
        update,
        { new: true, upsert: true, ...options }
    );
};

// Reset weekly stats (call via cron job on Mondays)
userStatsSchema.statics.resetWeeklyStats = async function () {
    const now = new Date();
    return this.updateMany(
        {},
        {
            $set: {
                'thisWeek.weekStart': now,
                'thisWeek.moodLogs': 0,
                'thisWeek.workoutLogs': 0,
                'thisWeek.mealLogs': 0,
                'thisWeek.meditationLogs': 0,
                'thisWeek.yogaLogs': 0,
                'thisWeek.sleepLogs': 0,
                'thisWeek.stepLogs': 0,
            }
        }
    );
};

// Reset daily stats (call via cron job daily)
userStatsSchema.statics.resetDailyStats = async function () {
    const now = new Date();
    return this.updateMany(
        {},
        {
            $set: {
                'today.date': now,
                'today.coinsEarned': 0,
                'today.moodCoins': 0,
                'today.workoutCoins': 0,
                'today.mealCoins': 0,
            }
        }
    );
};

const UserStats = mongoose.model('user_stats', userStatsSchema);
export default UserStats;

// src/models/badgeModel.js
import mongoose from 'mongoose';

const badgeSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    description: { type: String },
    icon: { type: String, required: true },

    category: {
        type: String,
        enum: ['streak', 'milestone', 'consistency', 'special', 'seasonal'],
        required: true
    },

    tier: {
        type: String,
        enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond'],
        default: 'bronze'
    },

    // Condition for unlocking (uses expr-eval syntax)
    // Examples: "totals.workoutLogs >= 10", "streaks.current >= 30"
    condition: { type: String, required: true },

    // Stat field to check (for easier evaluation)
    // e.g., 'totals.workoutLogs', 'streaks.current'
    statField: { type: String },
    targetValue: { type: Number },

    // Bonus coins when unlocked
    bonusCoins: { type: Number, default: 0 },

    // Display order
    sortOrder: { type: Number, default: 0 },

    isActive: { type: Boolean, default: true },

}, { timestamps: true });

badgeSchema.index({ category: 1, tier: 1 });
badgeSchema.index({ isActive: 1 });

// Get all active badges
badgeSchema.statics.getActiveBadges = function () {
    return this.find({ isActive: true }).sort({ sortOrder: 1 });
};

// Get badges by category
badgeSchema.statics.getByCategory = function (category) {
    return this.find({ isActive: true, category }).sort({ sortOrder: 1 });
};

const Badge = mongoose.model('badges', badgeSchema);
export default Badge;

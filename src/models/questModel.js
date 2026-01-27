import mongoose from 'mongoose';
import toJSON from './plugins/toJSONPlugin';

const questSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  condition: {
    type: String,
    required: true
  },
  rewardCoins: { type: Number, default: 0 },
  badge: {
    name: String,
    icon: String,
  },
  category: {
    type: String,
    enum: ['daily', 'weekly', 'milestone', 'special'],
    default: 'milestone'
  },
  resetPeriod: {
    type: String,
    enum: ['none', 'daily', 'weekly'],
    default: 'none'
  },
  expiresAt: { type: Date },
  isActive: { type: Boolean, default: true },
}, {
  timestamps: true,
});

questSchema.index({ isActive: 1, category: 1 });

export default mongoose.model('quests', questSchema);
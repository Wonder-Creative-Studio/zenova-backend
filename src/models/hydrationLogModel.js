import mongoose from 'mongoose';
import toJSON from './plugins/toJSONPlugin';

const hydrationLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true,
    index: true,
  },
  amountMl: {
    type: Number,
    required: true,
    min: 1,
  },
  loggedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  source: {
    type: String,
    enum: ['manual', 'auto'],
    default: 'manual',
  },
}, { timestamps: true });

hydrationLogSchema.index({ userId: 1, loggedAt: -1 });
hydrationLogSchema.plugin(toJSON);

const HydrationLog = mongoose.model('hydration_logs', hydrationLogSchema);
export default HydrationLog;


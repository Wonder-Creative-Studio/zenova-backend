import mongoose from 'mongoose';
import toJSON from './plugins/toJSONPlugin';

const hydrationGoalSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true,
    unique: true,
    index: true,
  },
  goalMl: {
    type: Number,
    required: true,
    min: 1,
    default: 3000,
  },
}, { timestamps: true });

hydrationGoalSchema.plugin(toJSON);

const HydrationGoal = mongoose.model('hydration_goals', hydrationGoalSchema);
export default HydrationGoal;

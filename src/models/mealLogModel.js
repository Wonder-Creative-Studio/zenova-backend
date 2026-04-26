import mongoose from 'mongoose';
import toJSON from './plugins/toJSONPlugin';

const mealLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true,
  },
  food: {
    type: String,
    required: true,
    trim: true,
  },
  foodCatalogId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'foodCatalog',
    index: true,
  },
  quantity: {
    type: Number,
    min: 0,
  },
  unit: {
    type: String,
    trim: true,
  },
  calories: {
    type: Number,
    required: true,
    min: 0,
  },
  protein: {
    type: Number,
    required: true,
    min: 0,
  },
  carbs: {
    type: Number,
    required: true,
    min: 0,
  },
  fats: {
    type: Number,
    required: true,
    min: 0,
  },
  mealTime: {
    type: String,
    enum: ['breakfast', 'lunch', 'dinner', 'snack'],
    required: true,
  },
  loggedAt: {
    type: Date,
    default: Date.now,
  },
  novaCoinsEarned: {
    type: Number,
    default: 5,
  },
}, {
  timestamps: true,
});

mealLogSchema.index({ userId: 1, loggedAt: 1 });
mealLogSchema.plugin(toJSON);

const MealLog = mongoose.model('mealLogs', mealLogSchema);
export default MealLog;
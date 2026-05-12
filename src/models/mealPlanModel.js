import mongoose from 'mongoose';
import toJSON from './plugins/toJSONPlugin';

const mealItemSchema = new mongoose.Schema({
  food: {
    type: String,
    required: true,
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
  isLiked: {
    type: Boolean,
    default: false,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
}, { _id: false });

const mealPlanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true,
  },
  date: {
    type: Date,
    required: true,
    index: true,
  },
  breakfast: mealItemSchema,
  lunch: mealItemSchema,
  dinner: mealItemSchema,
  snack: mealItemSchema,
  totalCalories: {
    type: Number,
    required: true,
  },
  targetCalories: {
    type: Number,
    required: true,
  },
}, {
  timestamps: true,
});

// Ensure one plan per user per day
mealPlanSchema.index({ userId: 1, date: 1 }, { unique: true });

mealPlanSchema.plugin(toJSON);

const MealPlan = mongoose.model('mealPlans', mealPlanSchema);
export default MealPlan;

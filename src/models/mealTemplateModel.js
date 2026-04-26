// src/models/mealTemplateModel.js
import mongoose from 'mongoose';
import toJSON from './plugins/toJSONPlugin';

const mealTemplateItemSchema = new mongoose.Schema({
  foodCatalogId: { type: mongoose.Schema.Types.ObjectId, ref: 'foodCatalog', required: true },
  quantity: { type: Number, required: true, min: 0 },
  unit: { type: String, required: true },
}, { _id: false });

const mealTemplateSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true, index: true },
  name: { type: String, required: true, trim: true },
  mealTime: { type: String, enum: ['breakfast', 'lunch', 'dinner', 'snack'], required: true },
  items: { type: [mealTemplateItemSchema], default: [] },

  totalKcal: { type: Number, default: 0 },
  totalProtein: { type: Number, default: 0 },
  totalCarbs: { type: Number, default: 0 },
  totalFat: { type: Number, default: 0 },
}, { timestamps: true });

mealTemplateSchema.plugin(toJSON);

const MealTemplate = mongoose.model('mealTemplates', mealTemplateSchema);
export default MealTemplate;

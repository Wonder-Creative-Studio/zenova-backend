// src/models/foodCatalogModel.js
import mongoose from 'mongoose';
import toJSON from './plugins/toJSONPlugin';

const servingOptionSchema = new mongoose.Schema({
  unit: { type: String, required: true },
  label: { type: String },
  grams: { type: Number, required: true },
}, { _id: false });

const foodCatalogSchema = new mongoose.Schema({
  source: {
    type: String,
    enum: ['usda', 'openfoodfacts', 'custom', 'ai'],
    default: 'usda',
    index: true,
  },
  externalId: { type: String, index: true },
  name: { type: String, required: true, trim: true, index: true },
  nameHi: { type: String, trim: true },
  brand: { type: String, trim: true },
  imageUrl: { type: String },

  kcalPer100g: { type: Number, default: 0 },
  proteinPer100g: { type: Number, default: 0 },
  carbsPer100g: { type: Number, default: 0 },
  fatPer100g: { type: Number, default: 0 },
  fiberPer100g: { type: Number, default: 0 },

  servingOptions: { type: [servingOptionSchema], default: undefined },

  queryCount: { type: Number, default: 0 },
  lastQueriedAt: { type: Date },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
  metadata: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

foodCatalogSchema.index({ name: 'text' });
foodCatalogSchema.index({ queryCount: -1 });
foodCatalogSchema.index({ source: 1, externalId: 1 }, { unique: true, sparse: true });

foodCatalogSchema.plugin(toJSON);

const FoodCatalog = mongoose.model('foodCatalog', foodCatalogSchema);
export default FoodCatalog;

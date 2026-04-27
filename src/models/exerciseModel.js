// src/models/exerciseModel.js
import mongoose from 'mongoose';
import toJSON from './plugins/toJSONPlugin';

const exerciseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    enum: ['Back', 'Chest', 'Biceps', 'Triceps', 'Shoulder', 'Leg', 'Full Body', 'Core'],
    required: true,
  },
  videoUrl: {
    type: String,
  },
  durationMin: {
    type: Number,
    required: true,
    min: 1,
  },
  targetAreas: [String],
  defaultSets: { type: Number, default: 3 },
  defaultReps: { type: Number, default: 10 },
  defaultWeightKg: { type: Number, default: 0 },
  estimatedBurnPerMin: { type: Number, default: 5 },

  // Wger-sync fields
  externalSource: { type: String, enum: ['wger', 'custom'], default: 'custom', index: true },
  externalId: { type: Number, index: true },
  gifUrl: { type: String },
  instructions: { type: String },
  primaryMuscles: [String],
  secondaryMuscles: [String],
  equipment: [String],
  difficulty: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    default: 'Beginner',
  },
}, { timestamps: true });

exerciseSchema.index({ name: 'text' });
exerciseSchema.index({ externalSource: 1, externalId: 1 }, { unique: true, sparse: true });

exerciseSchema.plugin(toJSON);

const Exercise = mongoose.model('exercises', exerciseSchema);
export default Exercise;

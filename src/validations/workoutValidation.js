// src/validations/workoutValidation.js
import Joi from 'joi';

export const getExerciseLibrary = {
  query: Joi.object().keys({
    category: Joi.string().valid('Back', 'Chest', 'Biceps', 'Triceps', 'Shoulder', 'Leg', 'Full Body', 'Core').optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
  }),
};

export const searchExercises = {
  query: Joi.object().keys({
    q: Joi.string().trim().min(1).max(100).required(),
    limit: Joi.number().integer().min(1).max(50).default(20),
  }),
};

export const getExerciseById = {
  params: Joi.object().keys({
    id: Joi.string().hex().length(24).required(),
  }),
};

export const createWorkoutPlan = {
  body: Joi.object().keys({
    name: Joi.string().trim().min(1).max(200).required(),
    type: Joi.string().valid('AI Recommended', 'Custom').required(),
    exercises: Joi.array().items(
      Joi.object({
        exerciseId: Joi.string().hex().length(24).required(),
        sets: Joi.number().min(1).optional(),
        reps: Joi.number().min(1).optional(),
        weightKg: Joi.number().min(0).optional(),
        durationMin: Joi.number().min(1).optional(),
      })
    ).min(1).required(),
  }),
};

export const logWorkout = {
  body: Joi.object().keys({
    workoutPlanId: Joi.string().hex().length(24).required(),
    exercisesCompleted: Joi.array().items(
      Joi.object({
        exerciseId: Joi.string().hex().length(24).required(),
        sets: Joi.number().min(1).required(),
        reps: Joi.number().min(1).required(),
        weightKg: Joi.number().min(0).optional(),
        durationMin: Joi.number().min(1).required(),
      })
    ).min(1).required(),
  }),
};

export const getWorkoutProgress = {
  query: Joi.object().keys({
    period: Joi.string().valid('today', 'weekly', 'monthly').optional(),
  }),
};

export const createExercise = {
  body: Joi.object().keys({
    name: Joi.string().trim().min(2).max(100).required(),
    category: Joi.string().valid('Back', 'Chest', 'Biceps', 'Triceps', 'Shoulder', 'Leg', 'Full Body', 'Core').required(),
    durationMin: Joi.number().min(1).max(60).required(),
    targetAreas: Joi.array().items(Joi.string()).min(1).required(),
    videoUrl: Joi.string().uri().required(),
    defaultSets: Joi.number().min(1).max(10).optional().default(3),
    defaultReps: Joi.number().min(1).max(100).optional().default(10),
    estimatedBurnPerMin: Joi.number().min(1).max(20).optional().default(5),
  }),
};

export default {
  getExerciseLibrary,
  searchExercises,
  getExerciseById,
  createWorkoutPlan,
  logWorkout,
  getWorkoutProgress,
  createExercise
};
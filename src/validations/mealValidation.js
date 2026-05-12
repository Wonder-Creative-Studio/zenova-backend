// src/validations/mealValidation.js
import Joi from 'joi';

export const generateMealPlan = {
  body: Joi.object().keys({
    date: Joi.date().optional(),
  }),
};

export const logMeal = {
  body: Joi.object().keys({
    // Catalog-shape fields (preferred; nutrition resolved server-side)
    foodCatalogId: Joi.string().hex().length(24).optional(),
    quantity: Joi.number().min(0).optional(),
    unit: Joi.string().optional(),

    // Free-text fields (required only when foodCatalogId is absent)
    food: Joi.string().trim().min(1).max(200).when('foodCatalogId', {
      is: Joi.exist(),
      then: Joi.optional(),
      otherwise: Joi.required(),
    }),
    calories: Joi.number().min(0).max(10000).when('foodCatalogId', {
      is: Joi.exist(),
      then: Joi.optional(),
      otherwise: Joi.required(),
    }),
    protein: Joi.number().min(0).max(1000).when('foodCatalogId', {
      is: Joi.exist(),
      then: Joi.optional(),
      otherwise: Joi.required(),
    }),
    carbs: Joi.number().min(0).max(1000).when('foodCatalogId', {
      is: Joi.exist(),
      then: Joi.optional(),
      otherwise: Joi.required(),
    }),
    fats: Joi.number().min(0).max(1000).when('foodCatalogId', {
      is: Joi.exist(),
      then: Joi.optional(),
      otherwise: Joi.required(),
    }),
    mealTime: Joi.string().valid('breakfast', 'lunch', 'dinner', 'snack').required(),
  }),
};

export const generateGroceryList = {
  body: Joi.object().keys({
    planId: Joi.string().hex().length(24).optional(), // if not provided, use today's plan
  }),
};

export const getMealLogs = {
  query: Joi.object().keys({
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
    date: Joi.alternatives(Joi.date(), Joi.string().valid('today')).optional(),
    mealTime: Joi.string().valid('breakfast', 'lunch', 'dinner', 'snack').optional(),
  }),
};

export const getNutritionSummary = {
  query: Joi.object().keys({
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
  }),
};

export const getMealPlan = {
  query: Joi.object().keys({
    date: Joi.date().optional(),
    view: Joi.string().valid('daily', 'weekly').optional(),
  }),
};

export const getWeeklyMealPlan = {
  query: Joi.object().keys({
    date: Joi.date().optional(),
  }),
};

const mealItemSchema = Joi.object().keys({
  food: Joi.string().trim().min(1).max(200).required(),
  calories: Joi.number().min(0).max(10000).required(),
  protein: Joi.number().min(0).max(1000).required(),
  carbs: Joi.number().min(0).max(1000).required(),
  fats: Joi.number().min(0).max(1000).required(),
});

export const updateMealPlan = {
  body: Joi.object().keys({
    date: Joi.date().required(),
    breakfast: mealItemSchema.optional(),
    lunch: mealItemSchema.optional(),
    dinner: mealItemSchema.optional(),
    snack: mealItemSchema.optional(),
    totalCalories: Joi.number().min(0).optional(),
    targetCalories: Joi.number().min(0).optional(),
  }),
};

export const regenerateMealPlanByMealTime = {
  body: Joi.object().keys({
    date: Joi.date().required(),
    mealTime: Joi.string().valid('breakfast', 'lunch', 'dinner', 'snack').required(),
  }),
};

export const mealLogIdParam = {
  params: Joi.object().keys({
    logId: Joi.string().hex().length(24).required(),
  }),
};

export const setMealLikeStatus = {
  params: Joi.object().keys({
    logId: Joi.string().hex().length(24).required(),
  }),
  body: Joi.object().keys({
    isLiked: Joi.boolean().optional(),
  }),
};

export const mealPlanItemParam = {
  params: Joi.object().keys({
    planId: Joi.string().hex().length(24).required(),
    mealTime: Joi.string().valid('breakfast', 'lunch', 'dinner', 'snack').required(),
  }),
};

export const setMealPlanItemLikeStatus = {
  params: Joi.object().keys({
    planId: Joi.string().hex().length(24).required(),
    mealTime: Joi.string().valid('breakfast', 'lunch', 'dinner', 'snack').required(),
  }),
  body: Joi.object().keys({
    isLiked: Joi.boolean().optional(),
  }),
};

export default {
  generateMealPlan,
  logMeal,
  generateGroceryList,
  getMealLogs,
  getNutritionSummary,
  getMealPlan,
  getWeeklyMealPlan,
  updateMealPlan,
  regenerateMealPlanByMealTime,
  mealLogIdParam,
  setMealLikeStatus,
  mealPlanItemParam,
  setMealPlanItemLikeStatus,
};

// src/validations/foodValidation.js
import Joi from 'joi';

const objectId = Joi.string().hex().length(24);

export const search = {
  query: Joi.object().keys({
    q: Joi.string().trim().min(1).max(100).required(),
    limit: Joi.number().integer().min(1).max(50).default(10),
  }),
};

export const getById = {
  params: Joi.object().keys({
    id: objectId.required(),
  }),
};

export const didYouAlsoHave = {
  query: Joi.object().keys({
    mealTime: Joi.string().valid('breakfast', 'lunch', 'dinner', 'snack').required(),
    limit: Joi.number().integer().min(1).max(20).default(5),
  }),
};

export const savedMeals = {
  query: Joi.object().keys({
    mealTime: Joi.string().valid('breakfast', 'lunch', 'dinner', 'snack').optional(),
  }),
};

const servingOptionSchema = Joi.object().keys({
  unit: Joi.string().required(),
  label: Joi.string().optional(),
  grams: Joi.number().min(0).required(),
});

export const createCustom = {
  body: Joi.object().keys({
    name: Joi.string().trim().min(1).max(200).required(),
    brand: Joi.string().trim().max(100).optional(),
    imageUrl: Joi.string().uri().optional(),
    kcalPer100g: Joi.number().min(0).required(),
    proteinPer100g: Joi.number().min(0).default(0),
    carbsPer100g: Joi.number().min(0).default(0),
    fatPer100g: Joi.number().min(0).default(0),
    fiberPer100g: Joi.number().min(0).default(0),
    servingOptions: Joi.array().items(servingOptionSchema).optional(),
  }),
};

export const saveAsMeal = {
  body: Joi.object().keys({
    name: Joi.string().trim().min(1).max(100).required(),
    mealTime: Joi.string().valid('breakfast', 'lunch', 'dinner', 'snack').required(),
    items: Joi.array().items(
      Joi.object().keys({
        foodCatalogId: objectId.required(),
        quantity: Joi.number().min(0).required(),
        unit: Joi.string().required(),
      })
    ).min(1).required(),
  }),
};

export const logTemplate = {
  body: Joi.object().keys({
    templateId: objectId.required(),
  }),
};

export default {
  search,
  getById,
  didYouAlsoHave,
  savedMeals,
  createCustom,
  saveAsMeal,
  logTemplate,
};

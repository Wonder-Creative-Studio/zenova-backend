import Joi from 'joi';

export const logHydration = {
  body: Joi.object().keys({
    amountMl: Joi.number().integer().min(1).max(10000).required(),
    loggedAt: Joi.string().isoDate().optional(),
    source: Joi.string().valid('manual', 'auto').optional(),
  }),
};

export const getHydration = {
  query: Joi.object().keys({
    timezone: Joi.string().optional(),
    period: Joi.string().valid('today', 'weekly', 'monthly').optional(),
  }),
};

export const updateGoal = {
  body: Joi.object().keys({
    goalMl: Joi.number().integer().min(1).max(10000).required(),
  }),
};

export default {
  logHydration,
  getHydration,
  updateGoal,
};


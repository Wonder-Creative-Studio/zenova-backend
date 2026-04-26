// src/validations/v1/profileValidation.js
import Joi from 'joi';

const profileBody = Joi.object().keys({
	primaryGoal: Joi.string().max(200).allow('').optional(),
	activityLevel: Joi.string()
		.valid('sedentary', 'light', 'moderate', 'active', 'very_active', '')
		.optional(),
	dietaryTags: Joi.array().items(Joi.string().max(40)).max(15).optional(),
	allergies: Joi.string().max(500).allow('').optional(),
	supportWindows: Joi.array()
		.items(Joi.string().valid('mornings', 'midday', 'evenings', 'late_nights', 'weekends'))
		.max(5)
		.optional(),
	firstHabit: Joi.string().max(120).allow('').optional(),
	freeTextContext: Joi.string().max(2000).allow('').optional(),
});

export const upsertProfile = {
	body: profileBody,
};

export default { upsertProfile };

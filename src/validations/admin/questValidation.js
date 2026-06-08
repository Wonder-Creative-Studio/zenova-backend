// src/validations/admin/questValidation.js
import Joi from 'joi';

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

const badge = Joi.object().keys({
	name: Joi.string().max(80).optional(),
	icon: Joi.string().max(200).optional(),
});

// category -> the only resetPeriod that's coherent with it
const EXPECTED_RESET_PERIOD = {
	daily: 'daily',
	weekly: 'weekly',
	monthly: 'monthly',
	milestone: 'none',
	special: 'none',
};

const assertCoherentPeriod = (value, helpers) => {
	const { category, resetPeriod } = value;
	if (category && resetPeriod && EXPECTED_RESET_PERIOD[category] !== resetPeriod) {
		return helpers.error('any.invalid', {
			message: `resetPeriod "${resetPeriod}" is incoherent with category "${category}" (expected "${EXPECTED_RESET_PERIOD[category]}")`,
		});
	}
	return value;
};

export const create = {
	body: Joi.object()
		.keys({
			title: Joi.string().min(2).max(120).required(),
			description: Joi.string().min(2).max(600).required(),
			condition: Joi.string().min(2).max(300).required(),
			rewardCoins: Joi.number().integer().min(0).max(100000).optional(),
			rewardMedals: Joi.number().integer().min(0).max(1000).optional(),
			badge: badge.optional(),
			category: Joi.string().valid('daily', 'weekly', 'monthly', 'milestone', 'special').optional(),
			resetPeriod: Joi.string().valid('none', 'daily', 'weekly', 'monthly').optional(),
			expiresAt: Joi.date().optional(),
			isActive: Joi.boolean().optional(),
		})
		.custom(assertCoherentPeriod, 'category/resetPeriod coherence'),
};

export const update = {
	params: Joi.object().keys({ questId: objectId.required() }),
	body: Joi.object()
		.keys({
			title: Joi.string().min(2).max(120).optional(),
			description: Joi.string().min(2).max(600).optional(),
			condition: Joi.string().min(2).max(300).optional(),
			rewardCoins: Joi.number().integer().min(0).max(100000).optional(),
			rewardMedals: Joi.number().integer().min(0).max(1000).optional(),
			badge: badge.optional(),
			category: Joi.string().valid('daily', 'weekly', 'monthly', 'milestone', 'special').optional(),
			resetPeriod: Joi.string().valid('none', 'daily', 'weekly', 'monthly').optional(),
			expiresAt: Joi.date().optional(),
			isActive: Joi.boolean().optional(),
		})
		.custom(assertCoherentPeriod, 'category/resetPeriod coherence'),
};

export const EXPECTED_RESET_PERIOD_MAP = EXPECTED_RESET_PERIOD;

export const toggle = {
	params: Joi.object().keys({ questId: objectId.required() }),
	body: Joi.object().keys({ isActive: Joi.boolean().required() }),
};

export const byId = {
	params: Joi.object().keys({ questId: objectId.required() }),
};

export default { create, update, toggle, byId };

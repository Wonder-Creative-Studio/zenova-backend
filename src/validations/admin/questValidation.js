// src/validations/admin/questValidation.js
import Joi from 'joi';

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

const badge = Joi.object().keys({
	name: Joi.string().max(80).optional(),
	icon: Joi.string().max(200).optional(),
});

export const create = {
	body: Joi.object().keys({
		title: Joi.string().min(2).max(120).required(),
		description: Joi.string().min(2).max(600).required(),
		condition: Joi.string().min(2).max(300).required(),
		rewardCoins: Joi.number().integer().min(0).max(100000).optional(),
		badge: badge.optional(),
		category: Joi.string().valid('daily', 'weekly', 'milestone', 'special').optional(),
		resetPeriod: Joi.string().valid('none', 'daily', 'weekly').optional(),
		expiresAt: Joi.date().optional(),
		isActive: Joi.boolean().optional(),
	}),
};

export const update = {
	params: Joi.object().keys({ questId: objectId.required() }),
	body: Joi.object().keys({
		title: Joi.string().min(2).max(120).optional(),
		description: Joi.string().min(2).max(600).optional(),
		condition: Joi.string().min(2).max(300).optional(),
		rewardCoins: Joi.number().integer().min(0).max(100000).optional(),
		badge: badge.optional(),
		category: Joi.string().valid('daily', 'weekly', 'milestone', 'special').optional(),
		resetPeriod: Joi.string().valid('none', 'daily', 'weekly').optional(),
		expiresAt: Joi.date().optional(),
		isActive: Joi.boolean().optional(),
	}),
};

export const toggle = {
	params: Joi.object().keys({ questId: objectId.required() }),
	body: Joi.object().keys({ isActive: Joi.boolean().required() }),
};

export const byId = {
	params: Joi.object().keys({ questId: objectId.required() }),
};

export default { create, update, toggle, byId };

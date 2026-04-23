// src/validations/admin/gamificationValidation.js
import Joi from 'joi';

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

export const adjust = {
	body: Joi.object().keys({
		userId: objectId.required(),
		amount: Joi.number().integer().min(-100000).max(100000).required(),
		reason: Joi.string().min(3).max(300).required(),
	}),
};

export const transactions = {
	query: Joi.object().keys({
		page: Joi.number().integer().min(1).optional(),
		limit: Joi.number().integer().min(1).max(200).optional(),
		userId: objectId.optional(),
		type: Joi.string().max(60).optional(),
		category: Joi.string().max(60).optional(),
		since: Joi.string().isoDate().optional(),
	}),
};

export default { adjust, transactions };

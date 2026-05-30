// src/validations/admin/trainerGreetingValidation.js
import Joi from 'joi';

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

export const create = {
	body: Joi.object().keys({
		agent: Joi.string().min(2).max(50).lowercase().required(),
		displayName: Joi.string().min(2).max(16).required(),
		cardMessage: Joi.string().min(2).max(16).required(),
		isActive: Joi.boolean().optional(),
	}),
};

export const update = {
	params: Joi.object().keys({
		id: objectId.required(),
	}),
	body: Joi.object().keys({
		agent: Joi.string().min(2).max(50).lowercase().optional(),
		displayName: Joi.string().min(2).max(16).optional(),
		cardMessage: Joi.string().min(2).max(16).optional(),
		isActive: Joi.boolean().optional(),
	}),
};

export const getById = {
	params: Joi.object().keys({
		id: objectId.required(),
	}),
};

export default { create, update, getById };

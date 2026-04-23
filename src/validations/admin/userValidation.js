// src/validations/admin/userValidation.js
import Joi from 'joi';

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

export const list = {
	query: Joi.object().keys({
		page: Joi.number().integer().min(1).optional(),
		limit: Joi.number().integer().min(1).max(100).optional(),
		search: Joi.string().max(120).optional(),
		role: Joi.string().max(80).optional(),
		isOnboarded: Joi.boolean().optional(),
		isBanned: Joi.boolean().optional(),
		isVerified: Joi.boolean().optional(),
		sortBy: Joi.string()
			.valid('createdAt', 'lastActiveAt', 'fullName', 'email', 'novaCoins', 'level')
			.optional(),
		order: Joi.string().valid('asc', 'desc').optional(),
	}),
};

export const getOne = {
	params: Joi.object().keys({ userId: objectId.required() }),
};

export const update = {
	params: Joi.object().keys({ userId: objectId.required() }),
	body: Joi.object().keys({
		fullName: Joi.string().max(120).optional(),
		email: Joi.string().email().max(160).optional(),
		phone: Joi.string().max(40).optional(),
		gender: Joi.string().max(40).optional(),
		dob: Joi.date().optional(),
		isVerified: Joi.boolean().optional(),
		avatar: Joi.string().max(255).optional(),
		languages: Joi.array().items(Joi.string().max(40)).optional(),
	}),
};

export const ban = {
	params: Joi.object().keys({ userId: objectId.required() }),
	body: Joi.object().keys({
		reason: Joi.string().max(500).optional(),
	}),
};

export const unban = {
	params: Joi.object().keys({ userId: objectId.required() }),
};

export const activity = {
	params: Joi.object().keys({ userId: objectId.required() }),
	query: Joi.object().keys({
		days: Joi.number().integer().min(1).max(180).optional(),
		limit: Joi.number().integer().min(1).max(200).optional(),
	}),
};

export default { list, getOne, update, ban, unban, activity };

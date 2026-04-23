// src/validations/admin/notificationValidation.js
import Joi from 'joi';

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

const target = Joi.object().keys({
	mode: Joi.string().valid('user', 'role', 'all').required(),
	userIds: Joi.array().items(objectId).max(1000).optional(),
	role: Joi.string().max(60).optional(),
});

export const send = {
	body: Joi.object().keys({
		title: Joi.string().min(1).max(120).required(),
		body: Joi.string().min(1).max(1000).required(),
		category: Joi.string()
			.valid('Hydration', 'Meditation', 'Steps', 'Meal', 'Sleep', 'Mood', 'Menstrual', 'Screen Time')
			.optional(),
		action: Joi.string().valid('track_now', 'remind_later', 'view_detail').optional(),
		target: target.required(),
		data: Joi.object().optional(),
	}),
};

export const list = {
	query: Joi.object().keys({
		page: Joi.number().integer().min(1).optional(),
		limit: Joi.number().integer().min(1).max(100).optional(),
		userId: objectId.optional(),
		status: Joi.string().valid('scheduled', 'sent', 'read', 'snoozed', 'dismissed').optional(),
		category: Joi.string()
			.valid('Hydration', 'Meditation', 'Steps', 'Meal', 'Sleep', 'Mood', 'Menstrual', 'Screen Time')
			.optional(),
	}),
};

export default { send, list };

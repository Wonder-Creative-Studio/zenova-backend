// src/validations/v1/aiChatValidation.js
import Joi from 'joi';

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

export const sendMessage = {
	body: Joi.object().keys({
		agent: Joi.string().valid('calia', 'noura', 'aeron').default('calia'),
		thread_id: Joi.alternatives().try(objectId, Joi.valid(null)).optional(),
		message: Joi.string().trim().min(1).max(4000).required(),
		client_msg_id: Joi.string().max(64).optional().allow('', null),
	}),
	query: Joi.object().keys({
		nostream: Joi.string().valid('1').optional(),
	}),
};

export const listThreads = {
	query: Joi.object().keys({
		agent: Joi.string().valid('calia', 'noura', 'aeron').optional(),
		limit: Joi.number().integer().min(1).max(100).optional(),
		cursor: Joi.string().isoDate().optional(),
	}),
};

export const listMessages = {
	params: Joi.object().keys({
		threadId: objectId.required(),
	}),
	query: Joi.object().keys({
		limit: Joi.number().integer().min(1).max(200).optional(),
		cursor: Joi.string().isoDate().optional(),
	}),
};

export const deleteThread = {
	params: Joi.object().keys({
		threadId: objectId.required(),
	}),
};

export const greeting = {
	query: Joi.object().keys({
		agent: Joi.string().valid('calia', 'noura', 'aeron').default('calia'),
	}),
};

export default {
	sendMessage,
	listThreads,
	listMessages,
	deleteThread,
	greeting,
};

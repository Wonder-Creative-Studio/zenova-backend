// src/services/admin/trainerGreetingAdminService.js
import TrainerGreeting from '~/models/trainerGreetingModel';
import APIError from '~/utils/apiError';
import httpStatus from 'http-status';

export const list = async (query = {}) => {
	const filter = {};
	if (query.isActive !== undefined) {
		filter.isActive = query.isActive === 'true' || query.isActive === true;
	}

	const items = await TrainerGreeting.find(filter).sort({ createdAt: -1 }).lean();
	return {
		items: items.map((item) => ({
			id: item._id,
			agent: item.agent,
			display_name: item.displayName,
			card_message: item.cardMessage,
			card_message_length: item.cardMessage ? item.cardMessage.length : 0,
			display_name_length: item.displayName ? item.displayName.length : 0,
			weekly_card_messages: item.weeklyCardMessages || [],
			weekly_card_messages_lengths: (item.weeklyCardMessages || []).map(m => m ? m.length : 0),
			is_active: item.isActive,
			created_at: item.createdAt,
			updated_at: item.updatedAt,
		})),
	};
};

export const create = async (body) => {
	// Enforce limit of 16 trainer greetings (characters)
	const count = await TrainerGreeting.countDocuments();
	if (count >= 16) {
		throw new APIError('Cannot add more than 16 trainer greetings.', httpStatus.BAD_REQUEST);
	}

	if (body.displayName && body.displayName.length > 18) {
		throw new APIError('Display name cannot be longer than 18 characters.', httpStatus.BAD_REQUEST);
	}
	if (body.cardMessage && body.cardMessage.length > 18) {
		throw new APIError('Card message cannot be longer than 18 characters.', httpStatus.BAD_REQUEST);
	}
	if (Array.isArray(body.weeklyCardMessages) && body.weeklyCardMessages.length > 0) {
		if (body.weeklyCardMessages.length !== 7) {
			throw new APIError('Weekly messages must contain exactly 7 days.', httpStatus.BAD_REQUEST);
		}
		for (const msg of body.weeklyCardMessages) {
			if (msg && msg.length > 18) {
				throw new APIError('Weekly card messages cannot be longer than 18 characters.', httpStatus.BAD_REQUEST);
			}
		}
	}

	// Check if an entry for this agent already exists
	const existing = await TrainerGreeting.findOne({ agent: body.agent });
	if (existing) {
		throw new APIError(`Trainer greeting configuration for agent '${body.agent}' already exists.`, httpStatus.BAD_REQUEST);
	}

	const item = await TrainerGreeting.create({
		agent: body.agent,
		displayName: body.displayName,
		cardMessage: body.cardMessage,
		weeklyCardMessages: body.weeklyCardMessages || [],
		isActive: body.isActive !== undefined ? body.isActive : true,
	});
	const obj = item.toObject();
	obj.card_message_length = obj.cardMessage ? obj.cardMessage.length : 0;
	obj.display_name_length = obj.displayName ? obj.displayName.length : 0;
	obj.weekly_card_messages = obj.weeklyCardMessages || [];
	obj.weekly_card_messages_lengths = (obj.weeklyCardMessages || []).map(m => m ? m.length : 0);
	return obj;
};

export const update = async (id, body) => {
	const patch = {};
	const allow = ['agent', 'displayName', 'cardMessage', 'weeklyCardMessages', 'isActive'];
	for (const k of allow) {
		if (body[k] !== undefined) {
			patch[k] = body[k];
		}
	}

	if (patch.displayName && patch.displayName.length > 18) {
		throw new APIError('Display name cannot be longer than 18 characters.', httpStatus.BAD_REQUEST);
	}
	if (patch.cardMessage && patch.cardMessage.length > 18) {
		throw new APIError('Card message cannot be longer than 18 characters.', httpStatus.BAD_REQUEST);
	}
	if (Array.isArray(patch.weeklyCardMessages) && patch.weeklyCardMessages.length > 0) {
		if (patch.weeklyCardMessages.length !== 7) {
			throw new APIError('Weekly messages must contain exactly 7 days.', httpStatus.BAD_REQUEST);
		}
		for (const msg of patch.weeklyCardMessages) {
			if (msg && msg.length > 18) {
				throw new APIError('Weekly card messages cannot be longer than 18 characters.', httpStatus.BAD_REQUEST);
			}
		}
	}

	// If agent is changing, verify uniqueness
	if (patch.agent) {
		const existing = await TrainerGreeting.findOne({ agent: patch.agent, _id: { $ne: id } });
		if (existing) {
			throw new APIError(`Trainer greeting configuration for agent '${patch.agent}' already exists.`, httpStatus.BAD_REQUEST);
		}
	}

	const updated = await TrainerGreeting.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean();
	if (!updated) {
		throw new APIError('Trainer greeting configuration not found', httpStatus.NOT_FOUND);
	}
	updated.card_message_length = updated.cardMessage ? updated.cardMessage.length : 0;
	updated.display_name_length = updated.displayName ? updated.displayName.length : 0;
	updated.weekly_card_messages = updated.weeklyCardMessages || [];
	updated.weekly_card_messages_lengths = (updated.weeklyCardMessages || []).map(m => m ? m.length : 0);
	return updated;
};

export default { list, create, update };

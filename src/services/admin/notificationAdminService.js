// src/services/admin/notificationAdminService.js
// Admin send + history + stats for push notifications.
// Wraps the existing fcmService for FCM delivery.
import Notification from '~/models/notificationModel';
import User from '~/models/userModel';
import Role from '~/models/roleModel';
import { sendPushNotification } from '~/services/fcmService';
import logger from '~/config/logger';
import APIError from '~/utils/apiError';
import httpStatus from 'http-status';

const DEFAULT_CATEGORY = 'Meal';

/**
 * Resolve the set of target users based on the broadcast spec.
 * spec: { mode: 'user' | 'role' | 'all', userIds?, role? }
 */
const resolveRecipients = async (spec) => {
	const mode = spec?.mode || 'user';
	if (mode === 'user') {
		if (!Array.isArray(spec.userIds) || spec.userIds.length === 0) {
			throw new APIError('userIds is required in user mode', httpStatus.BAD_REQUEST);
		}
		return User.find({ _id: { $in: spec.userIds } }).select('_id fullName fcmTokens').lean();
	}
	if (mode === 'role') {
		if (!spec.role) throw new APIError('role is required in role mode', httpStatus.BAD_REQUEST);
		const role = await Role.findOne({ name: spec.role });
		if (!role) throw new APIError('Role not found', httpStatus.NOT_FOUND);
		return User.find({ roles: role._id }).select('_id fullName fcmTokens').lean();
	}
	if (mode === 'all') {
		return User.find({ isBanned: { $ne: true } }).select('_id fullName fcmTokens').lean();
	}
	throw new APIError(`Unknown broadcast mode: ${mode}`, httpStatus.BAD_REQUEST);
};

export const sendNotification = async ({ title, body, category = DEFAULT_CATEGORY, action = 'view_detail', target, data = {} }) => {
	if (!title || !body) throw new APIError('title and body are required', httpStatus.BAD_REQUEST);

	const recipients = await resolveRecipients(target);
	if (!recipients.length) {
		return { sent: 0, skipped: 0, failed: 0, records: [] };
	}

	let sent = 0;
	let skipped = 0;
	let failed = 0;
	const records = [];

	for (const user of recipients) {
		try {
			const record = await Notification.create({
				userId: user._id,
				title,
				body,
				category,
				scheduledAt: new Date(),
				sentAt: new Date(),
				status: 'sent',
				action,
			});
			records.push(record._id);

			const tokens = user.fcmTokens || [];
			if (!tokens.length) {
				skipped += 1;
				continue;
			}
			for (const tok of tokens) {
				const ok = await sendPushNotification(tok, title, body, {
					...data,
					notificationId: String(record._id),
				});
				if (ok) sent += 1;
				else failed += 1;
			}
		} catch (err) {
			failed += 1;
			logger.warn(`notificationAdmin: delivery failed for ${user._id}: ${err.message}`);
		}
	}

	return { sent, skipped, failed, records };
};

export const listNotifications = async (query = {}) => {
	const page = Math.max(parseInt(query.page, 10) || 1, 1);
	const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
	const filter = {};
	if (query.userId) filter.userId = query.userId;
	if (query.status) filter.status = query.status;
	if (query.category) filter.category = query.category;

	const [items, total] = await Promise.all([
		Notification.find(filter)
			.sort({ scheduledAt: -1 })
			.skip((page - 1) * limit)
			.limit(limit)
			.lean(),
		Notification.countDocuments(filter),
	]);

	return {
		page,
		limit,
		total,
		total_pages: Math.ceil(total / limit),
		items: items.map((n) => ({
			id: n._id,
			user_id: n.userId,
			title: n.title,
			body: n.body,
			category: n.category,
			status: n.status,
			scheduled_at: n.scheduledAt,
			sent_at: n.sentAt,
			created_at: n.createdAt,
		})),
	};
};

export const stats = async () => {
	const [total, sent, read, snoozed, dismissed, scheduled] = await Promise.all([
		Notification.estimatedDocumentCount(),
		Notification.countDocuments({ status: 'sent' }),
		Notification.countDocuments({ status: 'read' }),
		Notification.countDocuments({ status: 'snoozed' }),
		Notification.countDocuments({ status: 'dismissed' }),
		Notification.countDocuments({ status: 'scheduled' }),
	]);
	return { total, sent, read, snoozed, dismissed, scheduled };
};

export default { sendNotification, listNotifications, stats };

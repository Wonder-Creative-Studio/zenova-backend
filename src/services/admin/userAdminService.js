// src/services/admin/userAdminService.js
import User from '~/models/userModel';
import Role from '~/models/roleModel';
import UserProfile from '~/models/userProfileModel';
import MealLog from '~/models/mealLogModel';
import WorkoutLog from '~/models/workoutLogModel';
import SleepLog from '~/models/sleepLogModel';
import MoodLog from '~/models/moodLogModel';
import MeditationLog from '~/models/meditationLogModel';
import YogaLog from '~/models/yogaLogModel';
import StepLog from '~/models/stepLogModel';
import NovaTransaction from '~/models/novaTransactionModel';
import APIError from '~/utils/apiError';
import httpStatus from 'http-status';

const SORTABLE = ['createdAt', 'lastActiveAt', 'fullName', 'email', 'novaCoins', 'level'];

export const listUsers = async (query = {}) => {
	const page = Math.max(parseInt(query.page, 10) || 1, 1);
	const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
	const sortBy = SORTABLE.includes(query.sortBy) ? query.sortBy : 'createdAt';
	const order = String(query.order).toLowerCase() === 'asc' ? 1 : -1;

	const filter = {};
	if (query.search) {
		const rx = new RegExp(String(query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
		filter.$or = [{ fullName: rx }, { userName: rx }, { email: rx }, { phone: rx }];
	}
	if (query.isOnboarded !== undefined) filter.isOnboarded = query.isOnboarded === 'true' || query.isOnboarded === true;
	if (query.isBanned !== undefined) filter.isBanned = query.isBanned === 'true' || query.isBanned === true;
	if (query.isVerified !== undefined) filter.isVerified = query.isVerified === 'true' || query.isVerified === true;

	if (query.role) {
		const role = await Role.findOne({ name: query.role });
		if (role) filter.roles = role._id;
	}

	const [items, total] = await Promise.all([
		User.find(filter)
			.select('-password')
			.populate('roles', 'name')
			.sort({ [sortBy]: order })
			.skip((page - 1) * limit)
			.limit(limit)
			.lean(),
		User.countDocuments(filter),
	]);

	return {
		page,
		limit,
		total,
		total_pages: Math.ceil(total / limit),
		users: items.map((u) => ({
			id: u._id,
			full_name: u.fullName,
			user_name: u.userName,
			email: u.email || null,
			phone: u.phone || null,
			gender: u.gender || null,
			roles: (u.roles || []).map((r) => r.name),
			is_onboarded: !!u.isOnboarded,
			is_banned: !!u.isBanned,
			is_verified: !!u.isVerified,
			nova_coins: u.novaCoins || 0,
			medals: u.medals || 0,
			rank: u.rank || 'Awakener',
			level: u.level || 1,
			streak_days: u.streakDays || 0,
			last_active_at: u.lastActiveAt || null,
			created_at: u.createdAt,
		})),
	};
};

export const getUser = async (userId) => {
	const u = await User.findById(userId).select('-password').populate('roles', 'name').lean();
	if (!u) throw new APIError('User not found', httpStatus.NOT_FOUND);

	const profile = await UserProfile.findOne({ userId }).lean();

	return {
		id: u._id,
		full_name: u.fullName,
		user_name: u.userName,
		email: u.email,
		phone: u.phone,
		gender: u.gender,
		dob: u.dob,
		height: u.height,
		weight: u.weight,
		diet_type: u.dietType,
		lifestyle: u.lifestyle,
		languages: u.languages,
		avatar: u.avatar,
		is_onboarded: !!u.isOnboarded,
		is_banned: !!u.isBanned,
		banned_at: u.bannedAt || null,
		banned_reason: u.bannedReason || null,
		is_verified: !!u.isVerified,
		roles: (u.roles || []).map((r) => ({ id: r._id, name: r.name })),
		gamification: {
			nova_coins: u.novaCoins || 0,
			medals: u.medals || 0,
			rank: u.rank || 'Awakener',
			level: u.level || 1,
			streak_days: u.streakDays || 0,
			last_streak_date: u.lastStreakDate || null,
		},
		ai_preferences: u.aiPreferences || {},
		ai_profile: profile
			? {
					primary_goal: profile.primaryGoal,
					activity_level: profile.activityLevel,
					dietary_tags: profile.dietaryTags,
					allergies: profile.allergies,
					support_windows: profile.supportWindows,
					first_habit: profile.firstHabit,
					free_text_context: profile.freeTextContext,
					updated_at: profile.updatedAt,
				}
			: null,
		created_at: u.createdAt,
		last_active_at: u.lastActiveAt,
	};
};

export const updateUser = async (userId, body) => {
	const allowed = ['fullName', 'email', 'phone', 'gender', 'dob', 'isVerified', 'avatar', 'languages'];
	const patch = {};
	for (const k of allowed) if (body[k] !== undefined) patch[k] = body[k];
	if (!Object.keys(patch).length) throw new APIError('No valid fields to update', httpStatus.BAD_REQUEST);

	const updated = await User.findByIdAndUpdate(userId, { $set: patch }, { new: true })
		.select('-password')
		.lean();
	if (!updated) throw new APIError('User not found', httpStatus.NOT_FOUND);
	return updated;
};

export const setBan = async (userId, { isBanned, reason }) => {
	const patch = {
		isBanned: !!isBanned,
		bannedAt: isBanned ? new Date() : null,
		bannedReason: isBanned ? reason || 'banned by admin' : null,
	};
	const updated = await User.findByIdAndUpdate(userId, { $set: patch }, { new: true })
		.select('_id isBanned bannedAt bannedReason fullName email')
		.lean();
	if (!updated) throw new APIError('User not found', httpStatus.NOT_FOUND);
	return {
		id: updated._id,
		full_name: updated.fullName,
		email: updated.email,
		is_banned: !!updated.isBanned,
		banned_at: updated.bannedAt,
		banned_reason: updated.bannedReason,
	};
};

export const userActivityTimeline = async (userId, { days = 14, limit = 50 } = {}) => {
	const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
	const pickEach = async (Model, kind) => {
		try {
			const rows = await Model.find({ userId, createdAt: { $gte: since } })
				.select('_id createdAt')
				.sort({ createdAt: -1 })
				.limit(limit)
				.lean();
			return rows.map((r) => ({ id: r._id, kind, created_at: r.createdAt }));
		} catch {
			return [];
		}
	};
	const lists = await Promise.all([
		pickEach(MealLog, 'meal'),
		pickEach(WorkoutLog, 'workout'),
		pickEach(SleepLog, 'sleep'),
		pickEach(MoodLog, 'mood'),
		pickEach(MeditationLog, 'meditation'),
		pickEach(YogaLog, 'yoga'),
		pickEach(StepLog, 'steps'),
	]);
	return lists.flat().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, limit);
};

export const userStats = async (userId) => {
	const u = await User.findById(userId).select(
		'novaCoins medals rank level streakDays lastStreakDate questsCompleted'
	).lean();
	if (!u) throw new APIError('User not found', httpStatus.NOT_FOUND);

	const recentTx = await NovaTransaction.find({ userId })
		.sort({ createdAt: -1 })
		.limit(10)
		.select('amount balanceAfter type source createdAt')
		.lean();

	return {
		nova_coins: u.novaCoins || 0,
		medals: u.medals || 0,
		rank: u.rank || 'Awakener',
		level: u.level || 1,
		streak_days: u.streakDays || 0,
		last_streak_date: u.lastStreakDate,
		quests_completed: (u.questsCompleted || []).length,
		recent_transactions: recentTx.map((t) => ({
			amount: t.amount,
			balance_after: t.balanceAfter,
			type: t.type,
			source: t.source?.category || null,
			description: t.source?.description || null,
			created_at: t.createdAt,
		})),
	};
};

export default {
	listUsers,
	getUser,
	updateUser,
	setBan,
	userActivityTimeline,
	userStats,
};

// src/services/admin/dashboardService.js
// Read-only aggregations for the admin home screen.
import User from '~/models/userModel';
import NovaTransaction from '~/models/novaTransactionModel';
import MealLog from '~/models/mealLogModel';
import WorkoutLog from '~/models/workoutLogModel';
import SleepLog from '~/models/sleepLogModel';
import MoodLog from '~/models/moodLogModel';
import MeditationLog from '~/models/meditationLogModel';
import YogaLog from '~/models/yogaLogModel';
import StepLog from '~/models/stepLogModel';
import ChatMessage from '~/models/chatMessageModel';
import SafetyEvent from '~/models/safetyEventModel';

const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (n) => new Date(Date.now() - n * DAY_MS);
const startOfToday = () => {
	const d = new Date();
	d.setHours(0, 0, 0, 0);
	return d;
};

const safeCount = async (p) => {
	try {
		return await p;
	} catch {
		return 0;
	}
};

export const overview = async () => {
	const today = startOfToday();
	const d7 = daysAgo(7);
	const d30 = daysAgo(30);

	const [
		totalUsers,
		newToday,
		newWeek,
		newMonth,
		activeWeek,
		activeToday,
		onboardedCount,
		bannedCount,
		novaCirc,
		crisisWeek,
		chatMsgToday,
	] = await Promise.all([
		safeCount(User.estimatedDocumentCount()),
		safeCount(User.countDocuments({ createdAt: { $gte: today } })),
		safeCount(User.countDocuments({ createdAt: { $gte: d7 } })),
		safeCount(User.countDocuments({ createdAt: { $gte: d30 } })),
		safeCount(User.countDocuments({ lastActiveAt: { $gte: d7 } })),
		safeCount(User.countDocuments({ lastActiveAt: { $gte: today } })),
		safeCount(User.countDocuments({ isOnboarded: true })),
		safeCount(User.countDocuments({ isBanned: true })),
		User.aggregate([{ $group: { _id: null, total: { $sum: '$novaCoins' } } }]).then(
			(r) => r?.[0]?.total || 0
		).catch(() => 0),
		safeCount(SafetyEvent.countDocuments({ category: { $ne: 'safe' }, createdAt: { $gte: d7 } })),
		safeCount(ChatMessage.countDocuments({ createdAt: { $gte: today } })),
	]);

	return {
		users: {
			total: totalUsers,
			onboarded: onboardedCount,
			banned: bannedCount,
			new_today: newToday,
			new_this_week: newWeek,
			new_this_month: newMonth,
			active_today: activeToday,
			active_last_7d: activeWeek,
		},
		gamification: {
			nova_coins_in_circulation: novaCirc,
		},
		ai: {
			chat_messages_today: chatMsgToday,
			crisis_events_last_7d: crisisWeek,
		},
	};
};

export const userGrowth = async ({ period = '30d' } = {}) => {
	const map = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
	const days = map[period] || 30;
	const start = daysAgo(days);

	const rows = await User.aggregate([
		{ $match: { createdAt: { $gte: start } } },
		{
			$group: {
				_id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
				count: { $sum: 1 },
			},
		},
		{ $sort: { _id: 1 } },
	]);

	return { period, series: rows.map((r) => ({ date: r._id, count: r.count })) };
};

export const activitySummary = async ({ days = 7 } = {}) => {
	const since = daysAgo(days);
	const tasks = [
		['meals', MealLog],
		['workouts', WorkoutLog],
		['sleep', SleepLog],
		['mood', MoodLog],
		['meditation', MeditationLog],
		['yoga', YogaLog],
		['steps', StepLog],
	];
	const entries = await Promise.all(
		tasks.map(async ([key, Model]) => [
			key,
			await safeCount(Model.countDocuments({ createdAt: { $gte: since } })),
		])
	);
	const breakdown = Object.fromEntries(entries);
	const total = Object.values(breakdown).reduce((s, n) => s + n, 0);
	return { days, total, breakdown };
};

export const topFeatures = async ({ days = 30 } = {}) => {
	const { breakdown } = await activitySummary({ days });
	return Object.entries(breakdown)
		.sort((a, b) => b[1] - a[1])
		.map(([feature, count]) => ({ feature, count }));
};

export const novaCoinsFlow = async ({ days = 7 } = {}) => {
	const since = daysAgo(days);
	const rows = await NovaTransaction.aggregate([
		{ $match: { createdAt: { $gte: since } } },
		{
			$group: {
				_id: { date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } },
				earned: { $sum: { $cond: [{ $gt: ['$amount', 0] }, '$amount', 0] } },
				spent: { $sum: { $cond: [{ $lt: ['$amount', 0] }, '$amount', 0] } },
			},
		},
		{ $sort: { '_id.date': 1 } },
	]);
	return {
		days,
		series: rows.map((r) => ({ date: r._id.date, earned: r.earned, spent: Math.abs(r.spent) })),
	};
};

export default { overview, userGrowth, activitySummary, topFeatures, novaCoinsFlow };

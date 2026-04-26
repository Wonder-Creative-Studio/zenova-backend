// src/services/ai/trackerContextService.js
// Builds the "Recent tracker snapshot" markdown block for the system prompt.
// Cached in Redis for 1h per user. Invalidate explicitly when new logs arrive.
import redis from '~/utils/redisClient';
import User from '~/models/userModel';
import UserProfile from '~/models/userProfileModel';
import MealLog from '~/models/mealLogModel';
import SleepLog from '~/models/sleepLogModel';
import MoodLog from '~/models/moodLogModel';
import WorkoutLog from '~/models/workoutLogModel';
import MeditationLog from '~/models/meditationLogModel';
import logger from '~/config/logger';

const CACHE_TTL_SECONDS = 60 * 60; // 1h
const cacheKey = (userId) => `ai:context:${userId}`;

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

const avg = (arr, getter) => {
	if (!arr.length) return 0;
	return arr.reduce((s, x) => s + (getter(x) || 0), 0) / arr.length;
};

const safe = async (p) => {
	try {
		return await p;
	} catch (err) {
		logger.warn(`trackerContext: query failed: ${err.message}`);
		return null;
	}
};

const buildMarkdown = ({ user, profile, meals, workouts, sleep, mood, meditation }) => {
	const lines = ['## Recent tracker snapshot'];

	if (meals?.length) {
		const avgCal = Math.round(avg(meals, (m) => m.calories));
		lines.push(`- Meals (last 7d): ${meals.length} logs; avg ~${avgCal} kcal/day.`);
	} else {
		lines.push('- Meals (last 7d): no meals logged.');
	}

	if (workouts?.length) {
		const last = workouts[0];
		const lastWhen = last?.loggedAt || last?.createdAt;
		lines.push(
			`- Workouts (last 14d): ${workouts.length} session(s). Last workout: ${lastWhen ? new Date(lastWhen).toDateString() : 'n/a'}.`
		);
	} else {
		lines.push('- Workouts (last 14d): no workouts logged.');
	}

	if (sleep?.length) {
		const avgMin = Math.round(avg(sleep, (s) => s.durationMin || 0));
		const hrs = Math.round((avgMin / 60) * 10) / 10;
		lines.push(`- Sleep (last 7d): avg ${hrs}h.`);
	} else {
		lines.push('- Sleep (last 7d): no sleep data.');
	}

	if (mood?.length) {
		const avgScore = Math.round(avg(mood, (m) => m.score || m.moodScore || 0) * 10) / 10;
		lines.push(`- Mood (last 14d): avg ${avgScore}/10 across ${mood.length} logs.`);
	} else {
		lines.push('- Mood (last 14d): no mood logs.');
	}

	if (meditation?.length) {
		lines.push(`- Meditation (last 14d): ${meditation.length} session(s).`);
	} else {
		lines.push('- Meditation (last 14d): none logged.');
	}

	// Gamification
	lines.push(
		`- Streak: ${user?.streakDays ?? 0} day(s). Rank: ${user?.rank ?? 'Awakener'} (Level ${user?.level ?? 1}). Nova Coins: ${user?.novaCoins ?? 0}.`
	);

	if (profile?.primaryGoal) {
		lines.push(`- Primary goal: "${profile.primaryGoal}".`);
	}

	return lines.join('\n');
};

const buildProfileBlock = (user, profile) => {
	const lines = [];
	lines.push(`Name: ${user?.fullName || 'friend'}`);
	if (user?.gender || user?.dob) {
		const age = user?.dob ? new Date().getFullYear() - new Date(user.dob).getFullYear() : 'n/a';
		lines.push(`Age: ${age} | Gender: ${user?.gender || 'n/a'}`);
	}
	if (profile) {
		lines.push('');
		lines.push('## From onboarding');
		if (profile.primaryGoal) lines.push(`Primary goal: ${profile.primaryGoal}`);
		if (profile.activityLevel) lines.push(`Activity level: ${profile.activityLevel}`);
		if (profile.dietaryTags?.length) lines.push(`Dietary: ${profile.dietaryTags.join(', ')}`);
		if (profile.allergies) lines.push(`Allergies: ${profile.allergies}`);
		if (profile.supportWindows?.length)
			lines.push(`Support windows: ${profile.supportWindows.join(', ')}`);
		if (profile.firstHabit) lines.push(`First habit: ${profile.firstHabit}`);
		if (profile.freeTextContext) lines.push(`Other context: ${profile.freeTextContext}`);
	}
	return lines.join('\n');
};

/**
 * Returns the full "User Context" block (profile + onboarding + tracker + gamification).
 * Uses Redis cache for 1h.
 */
export const getUserContextBlock = async (userId, { force = false } = {}) => {
	const key = cacheKey(userId);
	if (!force) {
		try {
			const cached = await redis.get(key);
			if (cached) return cached;
		} catch (err) {
			logger.warn(`trackerContext: redis read failed: ${err.message}`);
		}
	}

	const [user, profile, meals, workouts, sleep, mood, meditation] = await Promise.all([
		safe(User.findById(userId).lean()),
		safe(UserProfile.findOne({ userId }).lean()),
		safe(MealLog.find({ userId, loggedAt: { $gte: daysAgo(7) } }).sort({ loggedAt: -1 }).lean()),
		safe(WorkoutLog.find({ userId, loggedAt: { $gte: daysAgo(14) } }).sort({ loggedAt: -1 }).lean()),
		safe(SleepLog.find({ userId, loggedAt: { $gte: daysAgo(7) } }).lean()),
		safe(MoodLog.find({ userId, loggedAt: { $gte: daysAgo(14) } }).lean()),
		safe(MeditationLog.find({ userId, loggedAt: { $gte: daysAgo(14) } }).lean()),
	]);

	const tracker = buildMarkdown({
		user,
		profile,
		meals: meals || [],
		workouts: workouts || [],
		sleep: sleep || [],
		mood: mood || [],
		meditation: meditation || [],
	});

	const profileBlock = buildProfileBlock(user, profile);
	const block = `${profileBlock}\n\n${tracker}`;

	try {
		await redis.setex(key, CACHE_TTL_SECONDS, block);
	} catch (err) {
		logger.warn(`trackerContext: redis write failed: ${err.message}`);
	}
	return block;
};

export const invalidateUserContext = async (userId) => {
	try {
		await redis.del(cacheKey(userId));
	} catch (err) {
		logger.warn(`trackerContext: redis del failed: ${err.message}`);
	}
};

export default { getUserContextBlock, invalidateUserContext };

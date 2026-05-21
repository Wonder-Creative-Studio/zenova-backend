import SleepLog from '~/models/sleepLogModel';
import MealLog from '~/models/mealLogModel';
import StepLog from '~/models/stepLogModel';
import WorkoutLog from '~/models/workoutLogModel';
import MoodLog from '~/models/moodLogModel';
import User from '~/models/userModel';
import HydrationLog from '~/models/hydrationLogModel';
import HydrationGoal from '~/models/hydrationGoalModel';
import { DEFAULT_TIMEZONE, getLocalDayBounds, getZonedHour } from '~/utils/timezone';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const getTimeScore = (date = new Date(), timezone = DEFAULT_TIMEZONE) => {
  const hour = getZonedHour(date, timezone);
  if (hour >= 5 && hour <= 7) return 8.5;
  if (hour >= 8 && hour <= 10) return 9;
  if (hour >= 11 && hour <= 13) return 8;
  if (hour >= 14 && hour <= 16) return 7;
  if (hour >= 17 && hour <= 19) return 6.5;
  if (hour >= 20 && hour <= 22) return 5.5;
  if (hour === 23 || hour <= 1) return 4;
  return 3;
};

const getSleepDurationScore = (hours) => {
  if (hours < 4) return 2;
  if (hours < 5) return 4;
  if (hours < 6) return 6;
  if (hours < 7) return 8;
  if (hours <= 8.5) return 10;
  if (hours <= 9.5) return 8;
  return 6;
};

const getSleepTimingScore = (sleptAt, timezone) => {
  const hour = getZonedHour(sleptAt, timezone);
  if (hour < 22) return 9;
  if (hour <= 23) return 10;
  if (hour === 0) return 7;
  if (hour === 1) return 5;
  return 3;
};

const getMoodScore = (mood = '') => {
  const key = mood.toLowerCase();
  if (key.includes('very pleasant') || key === 'great') return 10;
  if (key.includes('pleasant') || key === 'good') return 8;
  if (key.includes('neutral') || key === 'okay') return 6;
  if (key.includes('unpleasant') || key === 'low') return 4;
  if (key.includes('stressed')) return 3;
  return 6;
};

const getMealScore = (count) => {
  if (count >= 3) return 10;
  if (count === 2) return 8;
  if (count === 1) return 6;
  return null;
};

const getWorkoutScore = (workout) => {
  if (!workout) return null;
  const durationMin = (workout.exercisesCompleted || []).reduce((sum, item) => sum + (item.durationMin || 0), 0);
  if (durationMin >= 20) return 10;
  if (durationMin >= 10) return 7;
  return 5;
};

const buildSignal = (key, label, score, weight, source = {}) => ({
  key,
  label,
  score: Math.round(clamp(score, 1, 10) * 10) / 10,
  weight,
  weightedScore: Math.round(clamp(score, 1, 10) * weight * 10) / 10,
  source,
});

export const calculateAura = async (userId, options = {}) => {
  const timezone = options.timezone || DEFAULT_TIMEZONE;
  const now = options.now || new Date();
  const { dateKey, start, end } = getLocalDayBounds(now, timezone);
  const timeScore = getTimeScore(now, timezone);

  const [user, sleep, mealCount, steps, workout, mood, hydrationGoal, hydrationLogs] = await Promise.all([
    User.findById(userId).select('stepGoal').lean(),
    SleepLog.findOne({ userId, wokeUpAt: { $gte: start, $lt: end } }).sort({ wokeUpAt: -1 }).lean(),
    MealLog.countDocuments({ userId, loggedAt: { $gte: start, $lt: end } }),
    StepLog.find({ userId, loggedAt: { $gte: start, $lt: end } }).lean(),
    WorkoutLog.findOne({ userId, loggedAt: { $gte: start, $lt: end } }).sort({ loggedAt: -1 }).lean(),
    MoodLog.findOne({ userId, loggedAt: { $gte: start, $lt: end } }).sort({ loggedAt: -1 }).lean(),
    HydrationGoal.findOne({ userId }).lean(),
    HydrationLog.find({ userId, loggedAt: { $gte: start, $lt: end } }).lean(),
  ]);

  const signals = [];
  const missingSignals = [];

  if (sleep) {
    const durationHr = (sleep.durationMin || 0) / 60;
    const durationScore = getSleepDurationScore(durationHr);
    const timingScore = getSleepTimingScore(sleep.sleptAt, timezone);
    signals.push(buildSignal('sleep', 'Sleep', (0.7 * durationScore) + (0.3 * timingScore), 35, {
      durationHr: Math.round(durationHr * 10) / 10,
      durationScore,
      timingScore,
      sleptAt: sleep.sleptAt,
      wokeUpAt: sleep.wokeUpAt,
    }));
  } else {
    missingSignals.push('sleep');
  }

  const mealScore = getMealScore(mealCount);
  if (mealScore !== null) {
    signals.push(buildSignal('nutrition', 'Nutrition', mealScore, 20, {
      mealsLogged: mealCount,
      qualityModifier: 0,
    }));
  } else {
    missingSignals.push('nutrition');
  }

  const stepGoal = user?.stepGoal || 8000;
  const totalSteps = steps.reduce((sum, item) => sum + (item.steps || 0), 0);
  const stepsScore = totalSteps > 0 ? Math.min(10, (totalSteps / stepGoal) * 10) : null;
  const workoutScore = getWorkoutScore(workout);
  const movementScore = Math.max(stepsScore || 0, workoutScore || 0);
  if (movementScore > 0) {
    signals.push(buildSignal('movement', 'Movement', movementScore, 20, {
      totalSteps,
      stepGoal,
      stepsScore,
      workoutScore,
    }));
  } else {
    missingSignals.push('movement');
  }

  if (mood) {
    signals.push(buildSignal('mood', 'Mood', getMoodScore(mood.mood), 15, {
      mood: mood.mood,
    }));
  } else {
    missingSignals.push('mood');
  }

  const waterGoalMl = hydrationGoal?.goalMl || 3000;
  const waterIntakeMl = hydrationLogs.reduce((sum, item) => sum + (item.amountMl || 0), 0);
  if (waterIntakeMl > 0) {
    signals.push(buildSignal('hydration', 'Hydration', Math.min(10, (waterIntakeMl / waterGoalMl) * 10), 10, {
      waterIntakeMl,
      waterGoalMl,
    }));
  } else {
    missingSignals.push('hydration');
  }

  const totalWeight = signals.reduce((sum, signal) => sum + signal.weight, 0);
  const lifestyleScore = totalWeight > 0
    ? signals.reduce((sum, signal) => sum + (signal.score * signal.weight), 0) / totalWeight
    : null;
  const calculatedScore = lifestyleScore !== null
    ? (0.3 * timeScore) + (0.7 * lifestyleScore)
    : (0.6 * timeScore) + (0.4 * 6.5);
  const rawScore = clamp(calculatedScore, 5, 10);

  return {
    date: dateKey,
    timezone,
    score: Math.round(rawScore * 10) / 10,
    rawScore,
    timeScore,
    lifestyleScore: lifestyleScore !== null ? Math.round(lifestyleScore * 100) / 100 : null,
    hasLifestyleData: signals.length > 0,
    availableSignals: signals.map(signal => signal.key),
    missingSignals,
    signals,
    formula: lifestyleScore !== null ? 'main' : 'fallback',
    bounds: { min: 5, max: 10 },
  };
};

export default {
  calculateAura,
};


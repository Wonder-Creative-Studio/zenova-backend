// src/controllers/workoutController.js
import Exercise from '~/models/exerciseModel';
import WorkoutPlan from '~/models/workoutPlanModel';
import WorkoutLog from '~/models/workoutLogModel';
import User from '~/models/userModel';
import httpStatus from 'http-status';
import APIError from '~/utils/apiError';
import gamificationService from '~/services/gamificationService';

// Helper: Calculate calories burned for an exercise
const calculateExerciseCalories = (durationMin, estimatedBurnPerMin, weightKg = 70) => {
  return Math.round(durationMin * estimatedBurnPerMin * (weightKg / 70));
};

export const getExerciseLibrary = async (req, res) => {
  try {
    const { category } = req.query;

    let query = {};
    if (category) {
      query.category = category;
    }

    const exercises = await Exercise.find(query).sort({ name: 1 });

    return res.json({
      success: true,
      data: { exercises },
      message: 'Exercise library fetched successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data: {},
      message: err.message || 'Failed to fetch exercise library',
    });
  }
};

export const createWorkoutPlan = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, type, exercises } = req.body;

    if (!name || !type || !exercises || exercises.length === 0) {
      return res.status(400).json({
        success: false,
        data: {},
        message: 'Name, type, and at least one exercise are required',
      });
    }

    const exerciseIds = exercises.map(e => e.exerciseId);
    const validExercises = await Exercise.find({ _id: { $in: exerciseIds } });
    if (validExercises.length !== exerciseIds.length) {
      return res.status(400).json({
        success: false,
        data: {},
        message: 'One or more exercises are invalid',
      });
    }

    let totalDurationMin = 0;
    let totalCaloriesBurned = 0;

    const workoutExercises = exercises.map(exercise => {
      const foundExercise = validExercises.find(e => e._id.toString() === exercise.exerciseId);
      const durationMin = exercise.durationMin || foundExercise.durationMin;
      const estimatedBurnPerMin = foundExercise.estimatedBurnPerMin;
      const caloriesBurned = calculateExerciseCalories(durationMin, estimatedBurnPerMin, 70);

      totalDurationMin += durationMin;
      totalCaloriesBurned += caloriesBurned;

      return {
        exerciseId: exercise.exerciseId,
        sets: exercise.sets || foundExercise.defaultSets,
        reps: exercise.reps || foundExercise.defaultReps,
        weightKg: exercise.weightKg || foundExercise.defaultWeightKg,
        durationMin,
      };
    });

    const workoutPlan = new WorkoutPlan({
      userId,
      name,
      type,
      exercises: workoutExercises,
      totalDurationMin,
      totalCaloriesBurned,
    });

    const savedPlan = await workoutPlan.save();

    return res.json({
      success: true,
      data: { savedPlan },
      message: 'Workout plan created successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data: {},
      message: err.message || 'Failed to create workout plan',
    });
  }
};

export const logWorkout = async (req, res) => {
  try {
    const userId = req.user.id;
    const { workoutPlanId, exercisesCompleted } = req.body;

    if (!workoutPlanId || !exercisesCompleted || exercisesCompleted.length === 0) {
      return res.status(400).json({
        success: false,
        data: {},
        message: 'Workout plan ID and at least one exercise completed are required',
      });
    }

    const workoutPlan = await WorkoutPlan.findById(workoutPlanId);
    if (!workoutPlan || workoutPlan.userId.toString() !== userId) {
      return res.status(404).json({
        success: false,
        data: {},
        message: 'Workout plan not found or access denied',
      });
    }

    const exerciseIds = exercisesCompleted.map(e => e.exerciseId);
    const validExercises = await Exercise.find({ _id: { $in: exerciseIds } });
    if (validExercises.length !== exerciseIds.length) {
      return res.status(400).json({
        success: false,
        data: {},
        message: 'One or more exercises are invalid',
      });
    }

    let totalCaloriesBurned = 0;
    let totalDurationMin = 0;

    const completedExercises = exercisesCompleted.map(exercise => {
      const foundExercise = validExercises.find(e => e._id.toString() === exercise.exerciseId);
      const durationMin = exercise.durationMin;
      const estimatedBurnPerMin = foundExercise.estimatedBurnPerMin;
      const caloriesBurned = calculateExerciseCalories(durationMin, estimatedBurnPerMin, 70);

      totalCaloriesBurned += caloriesBurned;
      totalDurationMin += durationMin;

      return {
        exerciseId: exercise.exerciseId,
        sets: exercise.sets,
        reps: exercise.reps,
        weightKg: exercise.weightKg,
        durationMin,
        caloriesBurned,
      };
    });

    const workoutLog = new WorkoutLog({
      userId,
      workoutPlanId,
      exercisesCompleted: completedExercises,
      totalCaloriesBurned,
      source: 'manual',
    });

    const savedLog = await workoutLog.save();

    // Process gamification
    const gamificationResult = await gamificationService.processActivity(userId, {
      type: 'workout',
      logId: savedLog._id,
      logModel: 'workoutLogs',
      data: {
        caloriesBurned: totalCaloriesBurned,
        durationMin: totalDurationMin
      }
    });

    return res.json({
      success: true,
      data: {
        savedLog,
        novaCoinsEarned: gamificationResult.coinsEarned,
        bonusCoins: gamificationResult.bonusCoins,
        totalCoins: gamificationResult.totalCoins,
        streak: gamificationResult.streak,
        level: gamificationResult.level,
        questsCompleted: gamificationResult.questsCompleted,
        badgesUnlocked: gamificationResult.badgesUnlocked
      },
      message: 'Workout logged successfully',
    });
  } catch (err) {
    console.error('Workout log error:', err);
    return res.status(400).json({
      success: false,
      data: {},
      message: err.message || 'Failed to log workout',
    });
  }
};

export const getWorkoutProgress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { period } = req.query; // 'today', 'weekly', 'monthly'

    let start, end;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (period === 'today') {
      start = today;
      end = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    } else if (period === 'weekly') {
      start = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      end = today;
    } else if (period === 'monthly') {
      start = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      end = today;
    } else {
      // Default to weekly
      start = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      end = today;
    }

    const logs = await WorkoutLog.find({
      userId,
      loggedAt: { $gte: start, $lte: end },
    }).sort({ loggedAt: 1 });

    // Format for chart (daily values)
    const dailyData = {};
    logs.forEach(log => {
      const dateStr = log.loggedAt.toISOString().split('T')[0];
      dailyData[dateStr] = log.totalCaloriesBurned;
    });

    // Get latest log
    const latestLog = logs[logs.length - 1];
    const currentCalories = latestLog ? latestLog.totalCaloriesBurned : 0;

    return res.json({
      success: true,
      data: {
        currentCalories,
        dailyData,
        period: period || 'weekly',
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      },
      message: 'Workout progress fetched successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data: {},
      message: err.message || 'Failed to fetch workout progress',
    });
  }
};

export const createExercise = async (req, res) => {
  try {
    const {
      name,
      category,
      durationMin,
      targetAreas,
      videoUrl,
      defaultSets,
      defaultReps,
      estimatedBurnPerMin
    } = req.body;

    // Create exercise
    const exercise = new Exercise({
      name,
      category,
      durationMin,
      targetAreas,
      videoUrl,
      defaultSets,
      defaultReps,
      estimatedBurnPerMin,
    });

    const savedExercise = await exercise.save();

    return res.status(201).json({
      success: true,
      data: { savedExercise },
      message: 'Exercise created successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data: {},
      message: err.message || 'Failed to create exercise',
    });
  }
};

export const getWorkoutPlan = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get latest plan (you may want to filter by active status later)
    const plan = await WorkoutPlan.findOne({ userId }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: { plan } || null,
      message: 'Workout plan fetched successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data: {},
      message: err.message || 'Failed to fetch workout plan',
    });
  }
};

// ✅ Get single day's workout log
export const getWorkoutLog = async (req, res) => {
  try {
    const userId = req.user.id;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        data: {},
        message: 'Date is required (YYYY-MM-DD)',
      });
    }

    const logDate = new Date(date);
    const log = await WorkoutLog.findOne({
      userId,
      loggedAt: {
        $gte: logDate,
        $lt: new Date(logDate.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    return res.json({
      success: true,
      data: { log } || null,
      message: 'Workout log fetched successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data: {},
      message: err.message || 'Failed to fetch workout log',
    });
  }
};

// ✅ Get workout logs (history)
export const getWorkoutLogs = async (req, res) => {
  try {
    const userId = req.user.id;
    const { range = 'weekly' } = req.query;

    let start, end;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (range === 'weekly') {
      start = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      end = today;
    } else if (range === 'monthly') {
      start = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      end = today;
    } else {
      start = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      end = today;
    }

    const logs = await WorkoutLog.find({
      userId,
      loggedAt: { $gte: start, $lte: end },
    }).sort({ loggedAt: -1 });

    return res.json({
      success: true,
      data: {
        logs,
        range,
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      },
      message: 'Workout logs fetched successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data: {},
      message: err.message || 'Failed to fetch workout logs',
    });
  }
};

// ✅ Get workout streak
export const getWorkoutStreak = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's streak from profile (you already track this in streakService)
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        data: {},
        message: 'User not found',
      });
    }

    return res.json({
      success: true,
      data: {
        currentStreak: user.streakDays || 0,
        lastStreakDate: user.lastStreakDate,
      },
      message: 'Workout streak fetched successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data: {},
      message: err.message || 'Failed to fetch workout streak',
    });
  }
};


export default {
  getExerciseLibrary,
  createWorkoutPlan,
  logWorkout,
  getWorkoutProgress,
  createExercise,
  getWorkoutPlan,
  getWorkoutLog,
  getWorkoutLogs,
  getWorkoutStreak,
};
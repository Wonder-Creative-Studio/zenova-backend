// src/services/mealService.js
import mongoose from 'mongoose';
import MealPlan from '~/models/mealPlanModel';
import MealLog from '~/models/mealLogModel';
import GroceryList from '~/models/groceryListModel';
import User from '~/models/userModel';
import APIError from '~/utils/apiError';
import httpStatus from 'http-status';
import streakService from '~/services/streakService';
import questService from '~/services/questService';
import aiService from '~/services/mealAiService';
import redisClient from '~/utils/redisClient';
import { parseFoodsToGroceryItems } from '~/utils/foodUtils';

const CACHE_TTL = 60 * 5; // 5 minutes for example

export async function generateMealPlan({ userId, date, useAI = false }) {
  const targetDate = date ? new Date(date) : new Date();
  const normalizedDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());

  const existing = await MealPlan.findOne({ userId, date: normalizedDate });
  if (existing) return existing;

  const user = await User.findById(userId);
  if (!user) throw new APIError('User not found', httpStatus.NOT_FOUND);

  // compute base target calories (moved to service/hardening)
  const targetCalories = calculateTargetCalories(user);

  let planData;
  if (useAI) {
    // call AI service (OpenRouter) to create a plan
    const aiResponse = await aiService.generateMealPlan({
      userProfile: { lifestyle: user.lifestyle, wellnessGoal: user.wellnessGoal, age: user.age, weight: user.weight },
      targetCalories,
    });
    planData = transformAIResponseToPlan(aiResponse, targetCalories);
  } else {
    planData = generateSimplePlan(targetCalories);
  }

  const mealPlan = new MealPlan({
    userId,
    date: normalizedDate,
    ...planData,
  });

  const saved = await mealPlan.save();
  // cache today's plan
  await redisClient.setex(`mealplan:${userId}:${normalizedDate.toISOString().slice(0,10)}`, CACHE_TTL, JSON.stringify(saved));
  return saved;
}

export async function logMeal({ userId, payload }) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const user = await User.findById(userId).session(session);
    if (!user) throw new APIError('User not found', httpStatus.NOT_FOUND);

    const mealLog = new MealLog({
      userId,
      food: payload.food,
      calories: payload.calories,
      protein: payload.protein,
      carbs: payload.carbs,
      fats: payload.fats,
      mealTime: payload.mealTime,
      loggedAt: payload.loggedAt ? new Date(payload.loggedAt) : new Date(),
      novaCoinsEarned: payload.novaCoinsEarned ?? 5,
    });

    const savedLog = await mealLog.save({ session });

    // update streak
    const streakDays = await streakService.updateStreak(userId, { session });
    user.streakDays = streakDays;
    user.novaCoins = (user.novaCoins || 0) + (mealLog.novaCoinsEarned || 0);
    await user.save({ session });

    // Check quests (service handles its own transactions if required)
    await questService.checkQuestCompletion(userId, {
      streakDays,
      mealLogs: 1,
      totalNovaCoins: user.novaCoins,
    }, { session });

    await session.commitTransaction();
    session.endSession();

    // clear relevant caches
    await redisClient.del(`nutrition:${userId}:last7`); // example

    return savedLog;
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}

export async function generateGroceryList({ userId, planId }) {
  let mealPlan;
  if (planId) {
    mealPlan = await MealPlan.findById(planId);
    if (!mealPlan || mealPlan.userId.toString() !== userId) {
      throw new APIError('Meal plan not found', httpStatus.NOT_FOUND);
    }
  } else {
    const today = new Date();
    const dateKey = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    mealPlan = await MealPlan.findOne({ userId, date: dateKey });
    if (!mealPlan) throw new APIError('No meal plan found for today. Generate one first.', httpStatus.NOT_FOUND);
  }

  const existingList = await GroceryList.findOne({ generatedFromPlan: mealPlan._id });
  if (existingList) return existingList;

  const allFoods = [mealPlan.breakfast.food, mealPlan.lunch.food, mealPlan.dinner.food, mealPlan.snack.food].filter(Boolean);
  const parsedItems = parseFoodsToGroceryItems(allFoods);

  const groceryList = new GroceryList({
    userId,
    items: parsedItems,
    generatedFromPlan: mealPlan._id,
  });

  const saved = await groceryList.save();
  return saved;
}

export async function getMealLogs({ userId, startDate, endDate, page = 1, limit = 20 }) {
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  const skip = (Number(page) - 1) * Number(limit);

  const logs = await MealLog.find({
    userId,
    loggedAt: { $gte: start, $lte: end },
  }).sort({ loggedAt: -1 }).skip(skip).limit(Number(limit));

  const total = await MealLog.countDocuments({
    userId,
    loggedAt: { $gte: start, $lte: end },
  });

  return { items: logs, meta: { total, page: Number(page), limit: Number(limit) } };
}

export async function getNutritionSummary({ userId, startDate, endDate }) {
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  // Try cache first
  const cacheKey = `nutrition:${userId}:${start.toISOString().slice(0,10)}:${end.toISOString().slice(0,10)}`;
  const cached = await redisClient.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const logs = await MealLog.find({
    userId,
    loggedAt: { $gte: start, $lte: end },
  });

  const totalCalories = logs.reduce((sum, log) => sum + (log.calories || 0), 0);
  const protein = logs.reduce((sum, log) => sum + (log.protein || 0), 0);
  const carbs = logs.reduce((sum, log) => sum + (log.carbs || 0), 0);
  const fats = logs.reduce((sum, log) => sum + (log.fats || 0), 0);
  const daysLogged = new Set(logs.map(log => new Date(log.loggedAt).toDateString())).size;

  const summary = {
    totalCalories,
    avgCaloriesPerDay: daysLogged ? Math.round(totalCalories / daysLogged) : 0,
    protein,
    carbs,
    fats,
    daysLogged,
  };

  await redisClient.setex(cacheKey, CACHE_TTL, JSON.stringify(summary));
  return summary;
}

/* ---------- helpers (moved here for clarity) ---------- */
function calculateTargetCalories(user) {
  let base = 2000;
  if (user.lifestyle === 'very_active') base = 2500;
  else if (user.lifestyle === 'moderately_active') base = 2200;
  else if (user.lifestyle === 'lightly_active') base = 2000;
  else if (user.lifestyle === 'not_very_active') base = 1800;
  if (user.wellnessGoal === 'weight_loss') return base - 300;
  if (user.wellnessGoal === 'muscle_gain') return base + 300;
  return base;
}

function generateSimplePlan(targetCalories) {
  const breakfast = { food: "Oats + Banana", calories: 320, protein: 6, carbs: 48, fats: 5 };
  const lunch = { food: "Quinoa Salad", calories: 220, protein: 5, carbs: 40, fats: 4 };
  const dinner = { food: "Brown Rice + Veggies", calories: 220, protein: 5, carbs: 40, fats: 4 };
  const snack = { food: "Almonds (10 pcs)", calories: 70, protein: 3, carbs: 2, fats: 6 };
  const total = breakfast.calories + lunch.calories + dinner.calories + snack.calories;
  return { breakfast, lunch, dinner, snack, totalCalories: total, targetCalories };
}

function transformAIResponseToPlan(aiResponse, targetCalories) {
  // aiResponse expected to be an array/object with meals. This function MUST be adapted to the exact AI payload.
  // Provide a fallback to simplePlan if AI returns unexpected structure.
  try {
    if (!aiResponse || !aiResponse.meals) return generateSimplePlan(targetCalories);
    const { meals } = aiResponse;
    // Example mapping: meals = [{ name: 'Breakfast', items: 'Oats + Banana', calories: 320, protein:6, carbs:48, fats:5 }, ...]
    const mapMeal = (m) => ({ food: m.items || m.name, calories: m.calories || 0, protein: m.protein || 0, carbs: m.carbs || 0, fats: m.fats || 0 });
    const breakfast = mapMeal(meals.find(m => /breakfast/i.test(m.name)) || meals[0] || {});
    const lunch = mapMeal(meals.find(m => /lunch/i.test(m.name)) || meals[1] || {});
    const dinner = mapMeal(meals.find(m => /dinner/i.test(m.name)) || meals[2] || {});
    const snack = mapMeal(meals.find(m => /snack/i.test(m.name)) || meals[3] || { name: 'Snack', items: 'Almonds', calories: 70, protein: 3, carbs: 2, fats: 6 });
    const total = breakfast.calories + lunch.calories + dinner.calories + snack.calories;
    return { breakfast, lunch, dinner, snack, totalCalories: total, targetCalories };
  } catch (err) {
    return generateSimplePlan(targetCalories);
  }
}

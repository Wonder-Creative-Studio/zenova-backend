// src/controllers/mealController.js
import MealPlan from '~/models/mealPlanModel';
import MealLog from '~/models/mealLogModel';
import GroceryList from '~/models/groceryListModel';
import User from '~/models/userModel';
import FoodCatalog from '~/models/foodCatalogModel';
import httpStatus from 'http-status';
import APIError from '~/utils/apiError';
import gamificationServiceV2 from '~/services/gamificationServiceV2';

// Helper: Calculate target calories based on user profile
const calculateTargetCalories = (user) => {
  let base = 2000;
  if (user.lifestyle === 'very_active') base = 2500;
  else if (user.lifestyle === 'sedentary') base = 1800;

  // Adjust for weight goal (simplified)
  if (user.wellnessGoal === 'weight_loss') return base - 300;
  if (user.wellnessGoal === 'muscle_gain') return base + 300;
  return base;
};

// Helper: Generate a simple meal plan (MVP)
const generateSimplePlan = (targetCalories) => {
  const breakfast = { food: "Oats + Banana", calories: 320, protein: 6, carbs: 48, fats: 5 };
  const lunch = { food: "Quinoa Salad", calories: 220, protein: 5, carbs: 40, fats: 4 };
  const dinner = { food: "Brown Rice + Veggies", calories: 220, protein: 5, carbs: 40, fats: 4 };
  const snack = { food: "Almonds (10 pcs)", calories: 70, protein: 3, carbs: 2, fats: 6 };

  const total = breakfast.calories + lunch.calories + dinner.calories + snack.calories;

  return { breakfast, lunch, dinner, snack, totalCalories: total, targetCalories };
};

const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const normalizePlanDate = (value = new Date()) => {
  const inputDate = new Date(value);
  const year = inputDate.getFullYear();
  const month = String(inputDate.getMonth() + 1).padStart(2, '0');
  const day = String(inputDate.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  return new Date(`${dateStr}T00:00:00.000Z`);
};

const toIsoDate = (value) => normalizePlanDate(value).toISOString().split('T')[0];

const isSameDate = (a, b) => normalizePlanDate(a).getTime() === normalizePlanDate(b).getTime();

const getWeekBounds = (value = new Date()) => {
  const normalized = normalizePlanDate(value);
  const mondayOffset = (normalized.getUTCDay() + 6) % 7;
  const weekStart = new Date(normalized);
  weekStart.setUTCDate(normalized.getUTCDate() - mondayOffset);

  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);

  return { weekStart, weekEnd };
};

const getMealVariants = () => ({
  breakfast: [
    { food: 'Oats + Banana', calories: 320, protein: 6, carbs: 48, fats: 5 },
    { food: 'Greek Yogurt + Berries', calories: 280, protein: 18, carbs: 26, fats: 8 },
    { food: 'Paneer Toast + Apple', calories: 340, protein: 15, carbs: 34, fats: 12 },
  ],
  lunch: [
    { food: 'Quinoa Salad', calories: 220, protein: 5, carbs: 40, fats: 4 },
    { food: 'Grilled Tofu Bowl', calories: 360, protein: 22, carbs: 35, fats: 10 },
    { food: 'Dal Rice Bowl', calories: 390, protein: 16, carbs: 54, fats: 9 },
  ],
  dinner: [
    { food: 'Brown Rice + Veggies', calories: 220, protein: 5, carbs: 40, fats: 4 },
    { food: 'Soup + Stir Fry Veggies', calories: 300, protein: 12, carbs: 28, fats: 11 },
    { food: 'Khichdi + Curd', calories: 340, protein: 14, carbs: 45, fats: 9 },
  ],
  snack: [
    { food: 'Almonds (10 pcs)', calories: 70, protein: 3, carbs: 2, fats: 6 },
    { food: 'Fruit Bowl', calories: 110, protein: 2, carbs: 25, fats: 1 },
    { food: 'Protein Smoothie', calories: 180, protein: 15, carbs: 20, fats: 4 },
  ],
});

const recalculateMealPlanTotals = (mealPlan) => {
  const entries = ['breakfast', 'lunch', 'dinner', 'snack']
    .map((mealTime) => mealPlan[mealTime])
    .filter(Boolean);

  mealPlan.totalCalories = entries.reduce((sum, item) => sum + (item.calories || 0), 0);
  return mealPlan;
};

const getNextMealVariant = (mealTime, currentFood) => {
  const variants = getMealVariants()[mealTime] || [];
  if (!variants.length) {
    throw new APIError('Unsupported meal time', httpStatus.BAD_REQUEST);
  }

  const currentIndex = variants.findIndex((item) => item.food === currentFood);
  const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % variants.length : 0;
  return variants[nextIndex];
};

const buildPlanForDate = async (userId, dateInput) => {
  const date = normalizePlanDate(dateInput);
  const existingPlan = await MealPlan.findOne({ userId, date });
  if (existingPlan) {
    return { plan: existingPlan, generatedNow: false };
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new APIError('User not found', httpStatus.NOT_FOUND);
  }

  const targetCalories = calculateTargetCalories(user);
  const mealPlan = new MealPlan({
    userId,
    date,
    ...generateSimplePlan(targetCalories),
  });

  const savedPlan = await mealPlan.save();
  return { plan: savedPlan, generatedNow: true };
};

const buildWeeklySummary = (plans) => {
  const summary = {
    totalCalories: 0,
    targetCalories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
  };

  plans.forEach((plan) => {
    if (!plan) return;

    summary.totalCalories += plan.totalCalories || 0;
    summary.targetCalories += plan.targetCalories || 0;

    ['breakfast', 'lunch', 'dinner', 'snack'].forEach((mealTime) => {
      const meal = plan[mealTime];
      if (!meal) return;
      summary.protein += meal.protein || 0;
      summary.carbs += meal.carbs || 0;
      summary.fats += meal.fats || 0;
    });
  });

  return summary;
};

export const generateMealPlan = async (req, res) => {
  try {
    const userId = req.user.id;
    const { plan, generatedNow } = await buildPlanForDate(userId, req.body.date || new Date());

    if (!generatedNow) {
      return res.json({
        success: true,
        data: plan,
        message: 'Meal plan already exists for this date',
      });
    }

    return res.json({
      success: true,
      data: plan,
      message: 'Meal plan generated successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data: {},
      message: err.message || 'Failed to generate meal plan',
    });
  }
};

export const logMeal = async (req, res) => {
  try {
    const userId = req.user.id;
    const { foodCatalogId, quantity, unit, mealTime } = req.body;
    let { food, calories, protein, carbs, fats } = req.body;

    // Catalog-shape: resolve nutrition server-side
    if (foodCatalogId) {
      const catalog = await FoodCatalog.findById(foodCatalogId);
      if (!catalog) {
        return res.status(404).json({
          success: false,
          data: {},
          message: 'Food catalog item not found',
        });
      }

      const opts = catalog.servingOptions || [];
      const opt = opts.find(o => o.unit === unit) || opts[0] || { grams: 1 };
      const grams = (opt.grams || 1) * (quantity || 0);
      const factor = grams / 100;

      food = catalog.name;
      calories = Math.round((catalog.kcalPer100g || 0) * factor);
      protein = Math.round((catalog.proteinPer100g || 0) * factor * 10) / 10;
      carbs = Math.round((catalog.carbsPer100g || 0) * factor * 10) / 10;
      fats = Math.round((catalog.fatPer100g || 0) * factor * 10) / 10;

      // Bump catalog query stats so frequently-tracked stays accurate
      await FoodCatalog.updateOne(
        { _id: foodCatalogId },
        { $inc: { queryCount: 1 }, $set: { lastQueriedAt: new Date() } }
      );
    }

    const mealLog = new MealLog({
      userId,
      food,
      foodCatalogId: foodCatalogId || undefined,
      quantity: quantity ?? undefined,
      unit: unit || undefined,
      calories,
      protein,
      carbs,
      fats,
      mealTime,
      loggedAt: new Date(),
      novaCoinsEarned: 5,
    });

    const savedLog = await mealLog.save();

    // Process gamification via V2 (handles coins, streaks, category activation, quests)
    const gamificationResult = await gamificationServiceV2.processActivityV2(userId, {
      type: 'meal',
      logId: savedLog._id,
      logModel: 'mealLogs',
      data: { calories, protein, carbs, fats }
    });

    return res.json({
      success: true,
      data: {
        savedLog,
        ...gamificationServiceV2.formatGamificationResponse(gamificationResult)
      },
      message: 'Meal logged successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data: {},
      message: err.message || 'Failed to log meal',
    });
  }
};

// ✅ NEW: Auto-generate grocery list from meal plan
export const generateGroceryList = async (req, res) => {
  try {
    const userId = req.user.id;
    const { planId } = req.body;

    let mealPlan;
    if (planId) {
      mealPlan = await MealPlan.findById(planId);
      if (!mealPlan || mealPlan.userId.toString() !== userId) {
        return res.status(404).json({
          success: false,
          data: {},
          message: 'Meal plan not found',
        });
      }
    } else {
      // Use today's plan
      const today = new Date();
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      mealPlan = await MealPlan.findOne({ userId, date });
      if (!mealPlan) {
        return res.status(200).json({
          success: false,
          data: {},
          message: 'No meal plan found for today. Generate one first.',
        });
      }
    }

    // Map meal items to grocery items (simplified)
    const allFoods = [
      mealPlan.breakfast.food,
      mealPlan.lunch.food,
      mealPlan.dinner.food,
      mealPlan.snack.food,
    ];

    // Basic parsing: "Oats + Banana" → ["Oats", "Banana"]
    const groceryItems = [];
    const unitMap = {
      'Oats': { unit: 'g', qty: 50 },
      'Banana': { unit: 'pcs', qty: 1 },
      'Quinoa': { unit: 'g', qty: 60 },
      'Salad': { unit: 'g', qty: 100 },
      'Brown Rice': { unit: 'g', qty: 60 },
      'Veggies': { unit: 'g', qty: 150 },
      'Almonds': { unit: 'pcs', qty: 10 },
    };

    allFoods.forEach(food => {
      // Simple split by " + "
      const items = food.split(' + ').map(item => item.trim());
      items.forEach(item => {
        const baseItem = item.split(' ')[0]; // "Oats" from "Oats + Banana"
        const config = unitMap[baseItem] || { unit: 'pcs', qty: 1 };
        groceryItems.push({
          name: item,
          quantity: config.qty,
          unit: config.unit,
        });
      });
    });

    // Remove duplicates (simplified)
    const uniqueItems = [];
    const seen = new Set();
    groceryItems.forEach(item => {
      if (!seen.has(item.name)) {
        seen.add(item.name);
        uniqueItems.push(item);
      }
    });

    // Check if list already exists for this plan
    let groceryList = await GroceryList.findOne({ generatedFromPlan: mealPlan._id });
    if (groceryList) {
      return res.json({
        success: true,
        data: groceryList,
        message: 'Grocery list already exists',
      });
    }

    groceryList = new GroceryList({
      userId,
      items: uniqueItems,
      generatedFromPlan: mealPlan._id,
    });

    const savedList = await groceryList.save();

    return res.json({
      success: true,
      data: savedList,
      message: 'Grocery list generated successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data: {},
      message: err.message || 'Failed to generate grocery list',
    });
  }
};

// Get meal logs (history)
export const getMealLogs = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, date, mealTime } = req.query;

    let start, end;
    if (date) {
      const day = date === 'today' ? new Date() : new Date(date);
      start = new Date(day.getFullYear(), day.getMonth(), day.getDate());
      end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    } else {
      start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      end = endDate ? new Date(endDate) : new Date();
    }

    const filter = { userId, loggedAt: { $gte: start, $lt: end } };
    if (mealTime) filter.mealTime = mealTime;

    const logs = await MealLog.find(filter).sort({ loggedAt: -1 });

    return res.json({
      success: true,
      data: logs,
      message: 'Meal logs fetched successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data: {},
      message: err.message || 'Failed to fetch meal logs',
    });
  }
};

export const getMealPlan = async (req, res) => {
  try {
    if (req.query.view === 'weekly') {
      return getWeeklyMealPlan(req, res);
    }

    const userId = req.user.id;
    const date = normalizePlanDate(req.query.date || new Date());
    const mealPlan = await MealPlan.findOne({ userId, date });
    return res.json({
      success: true,
      data: mealPlan,
      message: 'Meal plan fetched successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data: {},
      message: err.message || 'Failed to fetch meal plan',
    });
  }
};

export const getWeeklyMealPlan = async (req, res) => {
  try {
    const userId = req.user.id;
    const selectedDate = normalizePlanDate(req.query.date || new Date());
    const { weekStart, weekEnd } = getWeekBounds(selectedDate);
    const today = normalizePlanDate(new Date());
    const days = [];
    const plans = [];

    for (let index = 0; index < 7; index += 1) {
      const currentDate = new Date(weekStart);
      currentDate.setUTCDate(weekStart.getUTCDate() + index);

      const { plan, generatedNow } = await buildPlanForDate(userId, currentDate);
      plans.push(plan);
      days.push({
        dayKey: DAY_KEYS[index],
        dayLabel: DAY_LABELS[index],
        date: toIsoDate(currentDate),
        isToday: isSameDate(currentDate, today),
        generatedNow,
        plan,
      });
    }

    const previousWeekDate = new Date(weekStart);
    previousWeekDate.setUTCDate(weekStart.getUTCDate() - 7);

    const nextWeekDate = new Date(weekStart);
    nextWeekDate.setUTCDate(weekStart.getUTCDate() + 7);

    return res.json({
      success: true,
      data: {
        mode: 'weekly',
        selectedDate: toIsoDate(selectedDate),
        weekStart: toIsoDate(weekStart),
        weekEnd: toIsoDate(weekEnd),
        navigation: {
          previousWeekDate: toIsoDate(previousWeekDate),
          nextWeekDate: toIsoDate(nextWeekDate),
        },
        days,
        summary: buildWeeklySummary(plans),
      },
      message: 'Weekly meal plan fetched successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data: {},
      message: err.message || 'Failed to fetch weekly meal plan',
    });
  }
};

// Get nutrition summary (already partially built — enhance it)
export const getNutritionSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);

    const logs = await MealLog.find({
      userId,
      loggedAt: { $gte: start, $lte: end },
    });

    const totalCalories = logs.reduce((sum, log) => sum + log.calories, 0);
    const protein = logs.reduce((sum, log) => sum + log.protein, 0);
    const carbs = logs.reduce((sum, log) => sum + log.carbs, 0);
    const fats = logs.reduce((sum, log) => sum + log.fats, 0);
    const daysLogged = new Set(logs.map(log => new Date(log.loggedAt).toDateString())).size;

    const summary = {
      totalCalories,
      avgCaloriesPerDay: logs.length ? Math.round(totalCalories / daysLogged) : 0,
      protein,
      carbs,
      fats,
      daysLogged,
    };

    return res.json({
      success: true,
      data: summary,
      message: 'Nutrition summary fetched successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data: {},
      message: err.message || 'Failed to fetch nutrition summary',
    });
  }
};

export const updateMealPlan = async (req, res) => {
  try {
    const userId = req.user.id;
    const { date, breakfast, lunch, dinner, snack, totalCalories, targetCalories } = req.body;

    // Normalize date (same as generateMealPlan)
    const inputDate = new Date(date);
    const year = inputDate.getFullYear();
    const month = String(inputDate.getMonth() + 1).padStart(2, '0');
    const day = String(inputDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const normalizedDate = new Date(dateStr + 'T00:00:00.000Z');

    // Build update object with only provided fields
    const updateFields = {};
    if (breakfast) updateFields.breakfast = breakfast;
    if (lunch) updateFields.lunch = lunch;
    if (dinner) updateFields.dinner = dinner;
    if (snack) updateFields.snack = snack;
    if (totalCalories !== undefined) updateFields.totalCalories = totalCalories;
    if (targetCalories !== undefined) updateFields.targetCalories = targetCalories;

    console.log('Updating meal plan for date:', normalizedDate, 'Fields:', updateFields);

    const updatedMealPlan = await MealPlan.findOneAndUpdate(
      { userId, date: normalizedDate },
      { $set: updateFields },
      { new: true }
    );

    if (!updatedMealPlan) {
      return res.status(404).json({
        success: false,
        data: {},
        message: 'Meal plan not found for this date',
      });
    }

    return res.json({
      success: true,
      data: updatedMealPlan,
      message: 'Meal plan updated successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data: {},
      message: err.message || 'Failed to update meal plan',
    });
  }
};

export const regenerateMealPlanByMealTime = async (req, res) => {
  try {
    const userId = req.user.id;
    const { date, mealTime } = req.body;

    const inputDate = new Date(date);
    const year = inputDate.getFullYear();
    const month = String(inputDate.getMonth() + 1).padStart(2, '0');
    const day = String(inputDate.getDate()).padStart(2, '0');
    const normalizedDate = new Date(`${year}-${month}-${day}T00:00:00.000Z`);

    const mealPlan = await MealPlan.findOne({ userId, date: normalizedDate });
    if (!mealPlan) {
      return res.status(404).json({
        success: false,
        data: {},
        message: 'Meal plan not found for this date',
      });
    }

    mealPlan[mealTime] = getNextMealVariant(mealTime, mealPlan[mealTime]?.food);
    recalculateMealPlanTotals(mealPlan);
    await mealPlan.save();

    return res.json({
      success: true,
      data: mealPlan,
      message: `${mealTime} regenerated successfully`,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data: {},
      message: err.message || 'Failed to regenerate meal plan',
    });
  }
};

export const deleteMealLog = async (req, res) => {
  try {
    const userId = req.user.id;
    const { logId } = req.params;

    const deletedLog = await MealLog.findOneAndDelete({ _id: logId, userId });
    if (!deletedLog) {
      return res.status(404).json({
        success: false,
        data: {},
        message: 'Meal log not found',
      });
    }

    return res.json({
      success: true,
      data: deletedLog,
      message: 'Meal log deleted successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data: {},
      message: err.message || 'Failed to delete meal log',
    });
  }
};

export const setMealLikeStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { logId } = req.params;
    const requestedValue = req.body?.isLiked;

    const mealLog = await MealLog.findOne({ _id: logId, userId });
    if (!mealLog) {
      return res.status(404).json({
        success: false,
        data: {},
        message: 'Meal log not found',
      });
    }

    mealLog.isLiked = typeof requestedValue === 'boolean' ? requestedValue : !mealLog.isLiked;
    await mealLog.save();

    return res.json({
      success: true,
      data: mealLog,
      message: `Meal log ${mealLog.isLiked ? 'liked' : 'unliked'} successfully`,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data: {},
      message: err.message || 'Failed to update meal like status',
    });
  }
};


export default {
  generateMealPlan,
  logMeal,
  generateGroceryList,
  getMealLogs,
  getNutritionSummary,
  getMealPlan,
  getWeeklyMealPlan,
  updateMealPlan,
  regenerateMealPlanByMealTime,
  deleteMealLog,
  setMealLikeStatus

};

// src/controllers/mealController.js
// import httpStatus from 'http-status';
// import * as mealService from '~/services/mealService';


// export const generateMealPlan = async (req, res, next) => {
//     try {
//       const userId = req.user.id;
//       const { date, useAI } = req.body; // useAI: boolean -> whether to call AI generator
//       const plan = await mealService.generateMealPlan({ userId, date, useAI });
//       return res.json({
//         success: true,
//         data: plan,
//         message: 'Meal plan generated successfully',
//       });
//     } catch (err) {
//       next(err);
//     }
//   };


// export const logMeal = async(req, res, next) => {
//     try {
//       const userId = req.user.id;
//       const payload = req.body;
//       const savedLog = await mealService.logMeal({ userId, payload });
//       return res.json({
//         success: true,
//         data: savedLog,
//         message: 'Meal logged successfully',
//       });
//     } catch (err) {
//       next(err);
//     }
//   };

// export const generateGroceryList = async (req, res, next) => {
//     try {
//       const userId = req.user.id;
//       const { planId } = req.body;
//       const list = await mealService.generateGroceryList({ userId, planId });
//       return res.json({
//         success: true,
//         data: list,
//         message: 'Grocery list generated successfully',
//       });
//     } catch (err) {
//       next(err);
//     }
//   };

// export const getMealLogs = async(req, res, next) => {
//     try {
//       const userId = req.user.id;
//       const { startDate, endDate, page, limit } = req.query;
//       const logs = await mealService.getMealLogs({ userId, startDate, endDate, page, limit });
//       return res.json({
//         success: true,
//         data: logs,
//         message: 'Meal logs fetched successfully',
//       });
//     } catch (err) {
//       next(err);
//     }
//   };

// export const getNutritionSummary = async (req, res, next) => {
//     try {
//       const userId = req.user.id;
//       const { startDate, endDate } = req.query;
//       const summary = await mealService.getNutritionSummary({ userId, startDate, endDate });
//       return res.json({
//         success: true,
//         data: summary,
//         message: 'Nutrition summary fetched successfully',
//       });
//     } catch (err) {
//       next(err);
//     }
//   };

// export default {
//   generateMealPlan,
//   logMeal,
//   generateGroceryList,
//   getMealLogs,
//   getNutritionSummary,
// };

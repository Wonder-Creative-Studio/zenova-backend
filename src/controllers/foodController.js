// src/controllers/foodController.js
import fs from 'fs';
import mongoose from 'mongoose';
import FoodCatalog from '~/models/foodCatalogModel';
import MealTemplate from '~/models/mealTemplateModel';
import MealLog from '~/models/mealLogModel';
import UserStats from '~/models/userStatsModel';
import usdaService from '~/services/usdaService';
import { chatComplete, resolveModel } from '~/services/ai/openaiClient';
import logger from '~/config/logger';
import config from '~/config/config';

const SNAP_DAILY_LIMIT = 5;

const ok = (res, data = {}, message = 'OK') =>
  res.json({ success: true, data, message });

const fail = (res, status = 400, message = 'Failed') =>
  res.status(status).json({ success: false, data: {}, message });

const startOfDay = (d = new Date()) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const getServingForUnit = (food, unit) => {
  const opts = food.servingOptions || [];
  return opts.find(o => o.unit === unit) || opts[0] || { unit: 'g', grams: 1 };
};

const computeNutrition = (food, quantity, unit) => {
  const opt = getServingForUnit(food, unit);
  const grams = (opt.grams || 1) * (quantity || 0);
  const factor = grams / 100;
  return {
    grams,
    calories: Math.round((food.kcalPer100g || 0) * factor),
    protein: Math.round((food.proteinPer100g || 0) * factor * 10) / 10,
    carbs: Math.round((food.carbsPer100g || 0) * factor * 10) / 10,
    fats: Math.round((food.fatPer100g || 0) * factor * 10) / 10,
  };
};

// GET /api/food/search?q=apple&limit=10
export const search = async (req, res) => {
  try {
    const { q, limit } = req.query;
    const userLimit = limit || 10;

    // 1. Local text search first
    let local = await FoodCatalog.find(
      { $text: { $search: q } },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' }, queryCount: -1 })
      .limit(userLimit);

    // Fallback: local does not have a text-index hit (cold catalog) → name regex
    if (local.length === 0) {
      local = await FoodCatalog.find({ name: { $regex: q, $options: 'i' } })
        .sort({ queryCount: -1 })
        .limit(userLimit);
    }

    let merged = [...local];
    let limitedConnectivity = false;

    // 2. If sparse, top up from USDA
    if (merged.length < 5) {
      const remoteFoods = await usdaService.searchFoods(q, userLimit);
      if (!config.USDA_API_KEY) limitedConnectivity = true;

      if (remoteFoods.length) {
        const upserts = await Promise.all(
          remoteFoods.map(food =>
            FoodCatalog.findOneAndUpdate(
              { source: 'usda', externalId: food.externalId },
              { $setOnInsert: food },
              { upsert: true, new: true, setDefaultsOnInsert: true }
            )
          )
        );

        // Merge, dedupe by _id
        const seen = new Set(merged.map(d => String(d._id)));
        for (const u of upserts) {
          if (!seen.has(String(u._id))) {
            merged.push(u);
            seen.add(String(u._id));
          }
        }
      }
    }

    // Bump query count + lastQueriedAt for everything we returned
    if (merged.length) {
      const ids = merged.map(d => d._id);
      await FoodCatalog.updateMany(
        { _id: { $in: ids } },
        { $inc: { queryCount: 1 }, $set: { lastQueriedAt: new Date() } }
      );
    }

    return ok(res, { foods: merged.slice(0, userLimit), limitedConnectivity }, 'Foods fetched');
  } catch (err) {
    logger.error(`food.search error: ${err.message}`);
    return fail(res, 400, err.message);
  }
};

// GET /api/food/:id
export const getById = async (req, res) => {
  try {
    const food = await FoodCatalog.findById(req.params.id);
    if (!food) return fail(res, 404, 'Food not found');
    await FoodCatalog.updateOne(
      { _id: food._id },
      { $inc: { queryCount: 1 }, $set: { lastQueriedAt: new Date() } }
    );
    return ok(res, food, 'Food fetched');
  } catch (err) {
    return fail(res, 400, err.message);
  }
};

// GET /api/food/frequently-tracked?limit=10
export const getFrequentlyTracked = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const limit = parseInt(req.query.limit, 10) || 10;
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const top = await MealLog.aggregate([
      { $match: { userId, foodCatalogId: { $ne: null }, loggedAt: { $gte: since } } },
      { $group: { _id: '$foodCatalogId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
      { $lookup: { from: 'foodcatalogs', localField: '_id', foreignField: '_id', as: 'food' } },
      { $unwind: '$food' },
      { $replaceRoot: { newRoot: { $mergeObjects: ['$food', { logCount: '$count' }] } } },
    ]);

    return ok(res, { foods: top }, 'Frequently tracked foods');
  } catch (err) {
    logger.error(`food.getFrequentlyTracked error: ${err.message}`);
    return fail(res, 400, err.message);
  }
};

// GET /api/food/did-you-also-have?mealTime=breakfast&limit=5
export const getDidYouAlsoHave = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const { mealTime, limit } = req.query;
    const todayStart = startOfDay();

    const top = await MealLog.aggregate([
      {
        $match: {
          userId,
          mealTime,
          foodCatalogId: { $ne: null },
          loggedAt: { $lt: todayStart },
        },
      },
      { $group: { _id: '$foodCatalogId', count: { $sum: 1 } } },
      { $match: { count: { $gt: 2 } } },
      { $sort: { count: -1 } },
      { $limit: limit || 5 },
      { $lookup: { from: 'foodcatalogs', localField: '_id', foreignField: '_id', as: 'food' } },
      { $unwind: '$food' },
      { $replaceRoot: { newRoot: { $mergeObjects: ['$food', { logCount: '$count' }] } } },
    ]);

    return ok(res, { foods: top }, 'Did-you-also-have suggestions');
  } catch (err) {
    return fail(res, 400, err.message);
  }
};

// POST /api/food/custom
export const createCustom = async (req, res) => {
  try {
    const userId = req.user.id;
    const food = await FoodCatalog.create({
      ...req.body,
      source: 'custom',
      createdBy: userId,
    });
    return ok(res, food, 'Custom food created');
  } catch (err) {
    return fail(res, 400, err.message);
  }
};

// POST /api/food/save-as-meal
export const saveAsMeal = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, mealTime, items } = req.body;

    const ids = items.map(i => i.foodCatalogId);
    const foods = await FoodCatalog.find({ _id: { $in: ids } });
    const foodById = new Map(foods.map(f => [String(f._id), f]));

    let totalKcal = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0;
    for (const item of items) {
      const food = foodById.get(String(item.foodCatalogId));
      if (!food) continue;
      const n = computeNutrition(food, item.quantity, item.unit);
      totalKcal += n.calories;
      totalProtein += n.protein;
      totalCarbs += n.carbs;
      totalFat += n.fats;
    }

    const template = await MealTemplate.create({
      userId,
      name,
      mealTime,
      items,
      totalKcal,
      totalProtein,
      totalCarbs,
      totalFat,
    });

    return ok(res, template, 'Meal template saved');
  } catch (err) {
    return fail(res, 400, err.message);
  }
};

// GET /api/food/saved-meals?mealTime=breakfast
export const getSavedMeals = async (req, res) => {
  try {
    const userId = req.user.id;
    const filter = { userId };
    if (req.query.mealTime) filter.mealTime = req.query.mealTime;

    const templates = await MealTemplate.find(filter)
      .populate('items.foodCatalogId')
      .sort({ updatedAt: -1 });

    return ok(res, { templates }, 'Saved meals');
  } catch (err) {
    return fail(res, 400, err.message);
  }
};

// POST /api/food/log-template { templateId }
export const logTemplate = async (req, res) => {
  try {
    const userId = req.user.id;
    const template = await MealTemplate.findOne({ _id: req.body.templateId, userId });
    if (!template) return fail(res, 404, 'Template not found');

    const ids = template.items.map(i => i.foodCatalogId);
    const foods = await FoodCatalog.find({ _id: { $in: ids } });
    const foodById = new Map(foods.map(f => [String(f._id), f]));

    const logs = [];
    for (const item of template.items) {
      const food = foodById.get(String(item.foodCatalogId));
      if (!food) continue;
      const n = computeNutrition(food, item.quantity, item.unit);
      logs.push({
        userId,
        food: food.name,
        foodCatalogId: food._id,
        quantity: item.quantity,
        unit: item.unit,
        calories: n.calories,
        protein: n.protein,
        carbs: n.carbs,
        fats: n.fats,
        mealTime: template.mealTime,
        loggedAt: new Date(),
        novaCoinsEarned: 5,
      });
    }

    const created = await MealLog.insertMany(logs);
    return ok(res, { logs: created }, 'Template logged');
  } catch (err) {
    return fail(res, 400, err.message);
  }
};

const SNAP_PROMPT = `You are a food recognition assistant. Look at the image and identify each distinct food item visible.
For each item, estimate a reasonable portion in grams and the typical nutrition (kcal/protein/carbs/fat) for that portion.
Reply ONLY with valid JSON in this exact shape:
{ "items": [ { "name": "boiled egg", "quantity": 100, "unit": "g", "estimatedKcal": 155, "estimatedProtein": 13, "estimatedCarbs": 1.1, "estimatedFat": 11 } ] }
If no food is visible, return { "items": [] }. Use lowercase common food names.`;

// POST /api/food/snap (multipart, field name "image")
export const snapMeal = async (req, res) => {
  try {
    if (!req.file) return fail(res, 400, 'Image file is required (field name "image")');

    const userId = req.user.id;

    // Daily rate-limit
    const stats = await UserStats.getOrCreate(userId);
    const today = startOfDay();
    const statsDay = stats.today?.date ? startOfDay(stats.today.date) : null;
    const sameDay = statsDay && statsDay.getTime() === today.getTime();
    const usedToday = sameDay ? (stats.today.snapMealCount || 0) : 0;

    if (usedToday >= SNAP_DAILY_LIMIT) {
      return fail(res, 429, `Daily snap limit reached (${SNAP_DAILY_LIMIT}/day)`);
    }

    // Read uploaded image and convert to base64 data URL
    const buffer = fs.readFileSync(req.file.path);
    const mime = req.file.mimetype || 'image/jpeg';
    const dataUrl = `data:${mime};base64,${buffer.toString('base64')}`;

    let parsed;
    try {
      const completion = await chatComplete({
        model: resolveModel('main'),
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: SNAP_PROMPT },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
        temperature: 0.2,
        maxTokens: 600,
        responseFormat: { type: 'json_object' },
      });
      parsed = JSON.parse(completion.content || '{"items":[]}');
    } catch (err) {
      logger.warn(`food.snap LLM failed: ${err.message}`);
      // Best-effort cleanup of upload
      try { fs.unlinkSync(req.file.path); } catch (_) {}
      return ok(res, { detectedFoods: [], error: 'snap_failed' }, 'Try again or search manually');
    }

    // Best-effort cleanup of upload
    try { fs.unlinkSync(req.file.path); } catch (_) {}

    // Match each detected item against catalog
    const detectedFoods = [];
    for (const item of parsed.items || []) {
      let match = await FoodCatalog.findOne({ $text: { $search: item.name } })
        .sort({ score: { $meta: 'textScore' } });

      if (!match) {
        match = await FoodCatalog.findOne({ name: { $regex: item.name, $options: 'i' } });
      }

      // Try USDA fallback if still missing
      if (!match) {
        const remote = await usdaService.searchFoods(item.name, 1);
        if (remote.length) {
          match = await FoodCatalog.findOneAndUpdate(
            { source: 'usda', externalId: remote[0].externalId },
            { $setOnInsert: remote[0] },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
        }
      }

      if (match) {
        const n = computeNutrition(match, item.quantity || 100, item.unit || 'g');
        detectedFoods.push({
          name: match.name,
          matchedCatalogId: match._id,
          estimatedQuantity: item.quantity || 100,
          unit: item.unit || 'g',
          kcal: n.calories,
          protein: n.protein,
          carbs: n.carbs,
          fat: n.fats,
        });
      } else {
        detectedFoods.push({
          name: item.name,
          matchedCatalogId: null,
          estimatedQuantity: item.quantity || 100,
          unit: item.unit || 'g',
          kcal: item.estimatedKcal || 0,
          protein: item.estimatedProtein || 0,
          carbs: item.estimatedCarbs || 0,
          fat: item.estimatedFat || 0,
        });
      }
    }

    // Bump daily counter
    await UserStats.updateOne(
      { userId },
      sameDay
        ? { $inc: { 'today.snapMealCount': 1 } }
        : { $set: { 'today.date': today, 'today.snapMealCount': 1 } }
    );

    return ok(res, { detectedFoods, remainingToday: SNAP_DAILY_LIMIT - usedToday - 1 }, 'Snap analyzed');
  } catch (err) {
    logger.error(`food.snap error: ${err.message}`);
    return fail(res, 400, err.message);
  }
};

export default {
  search,
  getById,
  getFrequentlyTracked,
  getDidYouAlsoHave,
  createCustom,
  saveAsMeal,
  getSavedMeals,
  logTemplate,
  snapMeal,
};

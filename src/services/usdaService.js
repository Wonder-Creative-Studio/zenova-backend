// src/services/usdaService.js
// Wraps USDA FoodData Central API.
// Docs: https://fdc.nal.usda.gov/api-guide.html
import axios from 'axios';
import config from '~/config/config';
import logger from '~/config/logger';
import redis from '~/utils/redisClient';

const USDA_BASE = 'https://api.nal.usda.gov/fdc/v1';
const SEARCH_TTL = 6 * 60 * 60;       // 6h
const FOOD_TTL = 7 * 24 * 60 * 60;    // 7d

// USDA nutrient IDs
const NUTRIENT_KCAL = 1008;
const NUTRIENT_PROTEIN = 1003;
const NUTRIENT_CARBS = 1005;
const NUTRIENT_FAT = 1004;
const NUTRIENT_FIBER = 1079;

const findNutrient = (nutrients = [], id) => {
  const match = nutrients.find(n => (n.nutrientId || n.nutrient?.id) === id);
  if (!match) return 0;
  return match.value ?? match.amount ?? 0;
};

const defaultServingOptions = () => ([
  { unit: 'g', label: '1 g', grams: 1 },
  { unit: '100g', label: '100 g', grams: 100 },
]);

// Normalize a USDA food entry to our foodCatalog shape
export const normalizeFood = (raw) => {
  const nutrients = raw.foodNutrients || [];
  return {
    source: 'usda',
    externalId: String(raw.fdcId),
    name: raw.description || raw.lowercaseDescription || 'Unknown food',
    brand: raw.brandName || raw.brandOwner || undefined,
    kcalPer100g: findNutrient(nutrients, NUTRIENT_KCAL),
    proteinPer100g: findNutrient(nutrients, NUTRIENT_PROTEIN),
    carbsPer100g: findNutrient(nutrients, NUTRIENT_CARBS),
    fatPer100g: findNutrient(nutrients, NUTRIENT_FAT),
    fiberPer100g: findNutrient(nutrients, NUTRIENT_FIBER),
    servingOptions: defaultServingOptions(),
    metadata: { fdcId: raw.fdcId, dataType: raw.dataType },
  };
};

const isConfigured = () => !!config.USDA_API_KEY;

export const searchFoods = async (query, limit = 10) => {
  if (!query) return [];
  if (!isConfigured()) {
    logger.warn('usdaService: USDA_API_KEY not set, skipping remote search');
    return [];
  }

  const cacheKey = `usda:search:${query.toLowerCase()}:${limit}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (err) {
    logger.warn(`usdaService: redis read failed: ${err.message}`);
  }

  try {
    const res = await axios.get(`${USDA_BASE}/foods/search`, {
      params: { query, pageSize: limit, api_key: config.USDA_API_KEY },
      timeout: 8_000,
    });
    const foods = (res.data?.foods || []).map(normalizeFood);

    try {
      await redis.setex(cacheKey, SEARCH_TTL, JSON.stringify(foods));
    } catch (err) {
      logger.warn(`usdaService: redis write failed: ${err.message}`);
    }

    return foods;
  } catch (err) {
    logger.warn(`usdaService.searchFoods("${query}") failed: ${err.message}`);
    return [];
  }
};

export const getFoodById = async (fdcId) => {
  if (!fdcId) return null;
  if (!isConfigured()) return null;

  const cacheKey = `usda:food:${fdcId}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (err) {
    logger.warn(`usdaService: redis read failed: ${err.message}`);
  }

  try {
    const res = await axios.get(`${USDA_BASE}/food/${fdcId}`, {
      params: { api_key: config.USDA_API_KEY },
      timeout: 8_000,
    });
    const normalized = normalizeFood(res.data);

    try {
      await redis.setex(cacheKey, FOOD_TTL, JSON.stringify(normalized));
    } catch (err) {
      logger.warn(`usdaService: redis write failed: ${err.message}`);
    }

    return normalized;
  } catch (err) {
    logger.warn(`usdaService.getFoodById(${fdcId}) failed: ${err.message}`);
    return null;
  }
};

export default { searchFoods, getFoodById, normalizeFood };

// src/services/wgerService.js
// Wger Workout Manager free public API (no key needed).
// Docs: https://wger.de/api/v2/
import axios from 'axios';
import logger from '~/config/logger';
import redis from '~/utils/redisClient';
import Exercise from '~/models/exerciseModel';

const WGER_BASE = 'https://wger.de/api/v2';
const LANG_EN = 2;
const PAGE_SIZE = 100;

const ALL_TTL = 24 * 60 * 60;          // 24h
const SINGLE_TTL = 7 * 24 * 60 * 60;   // 7d
const CATEGORY_TTL = 30 * 24 * 60 * 60; // 30d

// Map Wger category names → our category enum
const CATEGORY_MAP = {
  'Back': 'Back',
  'Chest': 'Chest',
  'Arms': 'Biceps',
  'Biceps': 'Biceps',
  'Triceps': 'Triceps',
  'Shoulders': 'Shoulder',
  'Legs': 'Leg',
  'Calves': 'Leg',
  'Abs': 'Core',
  'Cardio': 'Full Body',
};

const mapCategory = (wgerCat) => CATEGORY_MAP[wgerCat] || 'Full Body';

// Strip basic HTML tags from Wger description
const stripHtml = (s = '') => s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const firstImageUrl = (images = []) => {
  const main = images.find(i => i.is_main) || images[0];
  return main?.image || null;
};

// Normalize a Wger exerciseinfo entry to our Exercise shape
export const normalizeExercise = (raw) => {
  const translation = (raw.translations || []).find(t => t.language === LANG_EN) || raw.translations?.[0];
  const name = translation?.name || raw.name || `Exercise ${raw.id}`;
  const description = stripHtml(translation?.description || raw.description || '');

  const wgerCategory = raw.category?.name;
  const category = mapCategory(wgerCategory);

  const primaryMuscles = (raw.muscles || []).map(m => m.name_en || m.name).filter(Boolean);
  const secondaryMuscles = (raw.muscles_secondary || []).map(m => m.name_en || m.name).filter(Boolean);
  const equipment = (raw.equipment || []).map(e => e.name).filter(Boolean);

  return {
    name,
    category,
    durationMin: 5,
    targetAreas: primaryMuscles,
    instructions: description,
    primaryMuscles,
    secondaryMuscles,
    equipment,
    gifUrl: firstImageUrl(raw.images || []),
    externalSource: 'wger',
    externalId: raw.id,
    difficulty: 'Beginner',
    estimatedBurnPerMin: 5,
  };
};

const fetchPage = async (offset = 0, attempt = 1) => {
  try {
    const res = await axios.get(`${WGER_BASE}/exerciseinfo/`, {
      params: { language: LANG_EN, limit: PAGE_SIZE, offset },
      timeout: 60_000,
    });
    return res.data;
  } catch (err) {
    if (attempt < 3) {
      logger.warn(`wgerService: page offset=${offset} attempt ${attempt} failed (${err.message}), retrying...`);
      await new Promise(r => setTimeout(r, 2000 * attempt));
      return fetchPage(offset, attempt + 1);
    }
    throw err;
  }
};

export const fetchAllExercises = async () => {
  const cacheKey = 'wger:exercises:all';
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (err) {
    logger.warn(`wgerService: redis read failed: ${err.message}`);
  }

  const all = [];
  let offset = 0;
  // Cap at 50 pages (5000 exercises) as a safety net
  for (let i = 0; i < 50; i++) {
    const page = await fetchPage(offset);
    const results = page.results || [];
    all.push(...results);
    if (!page.next || results.length === 0) break;
    offset += PAGE_SIZE;
  }

  const normalized = all.map(normalizeExercise);

  try {
    await redis.setex(cacheKey, ALL_TTL, JSON.stringify(normalized));
  } catch (err) {
    logger.warn(`wgerService: redis write failed: ${err.message}`);
  }

  return normalized;
};

export const fetchExerciseById = async (id) => {
  const cacheKey = `wger:exercise:${id}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (err) {
    logger.warn(`wgerService: redis read failed: ${err.message}`);
  }

  try {
    const res = await axios.get(`${WGER_BASE}/exerciseinfo/${id}/`, { timeout: 10_000 });
    const normalized = normalizeExercise(res.data);
    try {
      await redis.setex(cacheKey, SINGLE_TTL, JSON.stringify(normalized));
    } catch (err) {
      logger.warn(`wgerService: redis write failed: ${err.message}`);
    }
    return normalized;
  } catch (err) {
    logger.warn(`wgerService.fetchExerciseById(${id}) failed: ${err.message}`);
    return null;
  }
};

export const fetchCategories = async () => {
  const cacheKey = 'wger:categories';
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (err) {
    logger.warn(`wgerService: redis read failed: ${err.message}`);
  }

  try {
    const res = await axios.get(`${WGER_BASE}/exercisecategory/`, { timeout: 10_000 });
    const cats = res.data?.results || [];
    try {
      await redis.setex(cacheKey, CATEGORY_TTL, JSON.stringify(cats));
    } catch (err) {
      logger.warn(`wgerService: redis write failed: ${err.message}`);
    }
    return cats;
  } catch (err) {
    logger.warn(`wgerService.fetchCategories failed: ${err.message}`);
    return [];
  }
};

// Bulk upsert into Exercise model. Returns { newCount, updatedCount, total }
export const syncToDatabase = async () => {
  const exercises = await fetchAllExercises();

  let newCount = 0;
  let updatedCount = 0;

  for (const ex of exercises) {
    const result = await Exercise.findOneAndUpdate(
      { externalSource: 'wger', externalId: ex.externalId },
      { $set: ex },
      { upsert: true, new: false, setDefaultsOnInsert: true }
    );
    if (result) updatedCount++;
    else newCount++;
  }

  return { newCount, updatedCount, total: exercises.length };
};

export default {
  normalizeExercise,
  fetchAllExercises,
  fetchExerciseById,
  fetchCategories,
  syncToDatabase,
};

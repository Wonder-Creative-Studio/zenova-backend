// validations/onboardingValidation.js
import Joi from 'joi';

export const saveProfile = {
  body: Joi.object().keys({
    name: Joi.string().trim().min(2).max(100).required(),
    dob: Joi.date().required(),
    height: Joi.number().min(50).max(300).required(), // cm
    weight: Joi.number().min(20).max(300).required(), // kg
    gender: Joi.string().valid('male', 'female', 'other').required(),
    dietType: Joi.string().valid('non-veg', 'veg', 'vegan', 'vegetarian', 'balanced', 'eggetarian', 'custom', 'Vegetarian', 'Balanced', 'Eggetarian', 'Custom').required(),
    lifestyle: Joi.string().valid('very_active', 'active', 'sedentary').required(),
    medicalCondition: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())).optional(),
    selectedAI: Joi.string().optional(),
    locationName: Joi.string().max(200).allow('').optional(),
    latitude: Joi.number().optional(),
    longitude: Joi.number().optional(),
    lat: Joi.number().optional(),
    lng: Joi.number().optional(),
    long: Joi.number().optional(),
    location: Joi.object({
      type: Joi.string().valid('Point').default('Point'),
      coordinates: Joi.array().items(Joi.number()).length(2).optional(),
    }).optional(), 

    languages: Joi.array().items(Joi.string()).optional(),
    syncAppleHealth: Joi.boolean().optional(),
    autoTrackCategories: Joi.array().items(Joi.string()).optional(),
    aiTrainer: Joi.object({
      gender: Joi.string().valid('male', 'female').optional(),
      tonality: Joi.string().valid('energetic', 'calm', 'insightful').optional(),
    }).optional(),
    aiNutritionist: Joi.object({
      gender: Joi.string().valid('male', 'female').optional(),
      tonality: Joi.string().valid('energetic', 'calm', 'insightful').optional(),
    }).optional(),
    aiLifestyleCoach: Joi.object({
      gender: Joi.string().valid('male', 'female').optional(),
      tonality: Joi.string().valid('energetic', 'calm', 'insightful').optional(),
    }).optional(),
    currentMood: Joi.string().valid('tired', 'neutral', 'calm', 'energized').optional(),
    lifestyleState: Joi.string().valid('chaotic', 'trying_to_get_back', 'on_off', 'balanced').optional(),
    barriers: Joi.array().items(Joi.string()).optional(),
  }),
};

export default {
  saveProfile,
};

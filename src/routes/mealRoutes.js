// src/routes/mealRoutes.js
import { Router } from 'express';
import catchAsync from '~/utils/catchAsync';
import validate from '~/middlewares/validate';
import authenticate from '~/middlewares/authenticate';
import mealValidation from '~/validations/mealValidation';
import mealController from '~/controllers/mealController';

const router = Router();

router.post('/plan', authenticate(), validate(mealValidation.generateMealPlan), catchAsync(mealController.generateMealPlan));
router.post('/log', authenticate(), validate(mealValidation.logMeal), catchAsync(mealController.logMeal));
router.post('/grocery-list', authenticate(), validate(mealValidation.generateGroceryList), catchAsync(mealController.generateGroceryList));
router.get('/logs', authenticate(), validate(mealValidation.getMealLogs), catchAsync(mealController.getMealLogs));
router.get('/summary', authenticate(), validate(mealValidation.getNutritionSummary), catchAsync(mealController.getNutritionSummary));
router.get('/get-meal-plan', authenticate(), catchAsync(mealController.getMealPlan));
router.put('/update-meal-plan', authenticate(), validate(mealValidation.updateMealPlan), catchAsync(mealController.updateMealPlan));

export default router;
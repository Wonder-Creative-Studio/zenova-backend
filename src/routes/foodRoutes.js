// src/routes/foodRoutes.js
import { Router } from 'express';
import catchAsync from '~/utils/catchAsync';
import validate from '~/middlewares/validate';
import authenticate from '~/middlewares/authenticate';
import uploadImage from '~/middlewares/uploadImage';
import foodValidation from '~/validations/foodValidation';
import foodController from '~/controllers/foodController';

const router = Router();

// Static paths first; dynamic :id last (Express order)
router.get('/search', authenticate(), validate(foodValidation.search), catchAsync(foodController.search));
router.get('/frequently-tracked', authenticate(), catchAsync(foodController.getFrequentlyTracked));
router.get('/did-you-also-have', authenticate(), validate(foodValidation.didYouAlsoHave), catchAsync(foodController.getDidYouAlsoHave));
router.get('/saved-meals', authenticate(), validate(foodValidation.savedMeals), catchAsync(foodController.getSavedMeals));

router.post('/custom', authenticate(), validate(foodValidation.createCustom), catchAsync(foodController.createCustom));
router.post('/save-as-meal', authenticate(), validate(foodValidation.saveAsMeal), catchAsync(foodController.saveAsMeal));
router.post('/log-template', authenticate(), validate(foodValidation.logTemplate), catchAsync(foodController.logTemplate));
router.post('/snap', authenticate(), uploadImage, catchAsync(foodController.snapMeal));

router.get('/:id', authenticate(), validate(foodValidation.getById), catchAsync(foodController.getById));

export default router;

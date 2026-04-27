import { Router } from 'express';
import catchAsync from '~/utils/catchAsync';
import validate from '~/middlewares/validate';
import authenticate from '~/middlewares/authenticate';
import workoutValidation from '~/validations/workoutValidation';
import workoutController from '~/controllers/workoutController';

const router = Router();

router.get('/exercises', authenticate(), validate(workoutValidation.getExerciseLibrary), catchAsync(workoutController.getExerciseLibrary));
router.post('/exercises', authenticate(), validate(workoutValidation.createExercise), catchAsync(workoutController.createExercise));
router.get('/exercises/categories', authenticate(), catchAsync(workoutController.getExerciseCategories));
router.get('/exercises/search', authenticate(), validate(workoutValidation.searchExercises), catchAsync(workoutController.searchExercises));
router.get('/exercises/:id', authenticate(), validate(workoutValidation.getExerciseById), catchAsync(workoutController.getExerciseById));
router.post('/plan', authenticate(), validate(workoutValidation.createWorkoutPlan), catchAsync(workoutController.createWorkoutPlan));
router.post('/log', authenticate(), validate(workoutValidation.logWorkout), catchAsync(workoutController.logWorkout));
router.get('/progress', authenticate(), validate(workoutValidation.getWorkoutProgress), catchAsync(workoutController.getWorkoutProgress));

router.get('/plan', authenticate(), catchAsync(workoutController.getWorkoutPlan));
router.get('/log', authenticate(),  catchAsync(workoutController.getWorkoutLog));
router.get('/logs', authenticate(), catchAsync(workoutController.getWorkoutLogs));
router.get('/streak', authenticate(), catchAsync(workoutController.getWorkoutStreak));

export default router;
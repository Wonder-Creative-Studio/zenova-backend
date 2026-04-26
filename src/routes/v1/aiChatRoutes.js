// src/routes/v1/aiChatRoutes.js
import { Router } from 'express';
import catchAsync from '~/utils/catchAsync';
import validate from '~/middlewares/validate';
import authenticate from '~/middlewares/authenticate';
import chatLimiter from '~/middlewares/rateLimit';
import aiChatController from '~/controllers/v1/aiChatController';
import aiChatValidation from '~/validations/v1/aiChatValidation';

const router = Router();

// Send message (SSE by default, JSON with ?nostream=1)
router.post(
	'/message',
	authenticate(),
	chatLimiter,
	validate(aiChatValidation.sendMessage),
	catchAsync(aiChatController.sendMessage)
);

// Greeting text for a new thread
router.get(
	'/greeting',
	authenticate(),
	validate(aiChatValidation.greeting),
	catchAsync(aiChatController.greeting)
);

// List threads
router.get(
	'/threads',
	authenticate(),
	validate(aiChatValidation.listThreads),
	catchAsync(aiChatController.listThreads)
);

// Messages in a thread
router.get(
	'/threads/:threadId/messages',
	authenticate(),
	validate(aiChatValidation.listMessages),
	catchAsync(aiChatController.listMessages)
);

// Clear a thread
router.delete(
	'/threads/:threadId',
	authenticate(),
	validate(aiChatValidation.deleteThread),
	catchAsync(aiChatController.deleteThread)
);

export default router;

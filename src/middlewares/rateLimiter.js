import rateLimit from 'express-rate-limit';
import httpStatus from 'http-status';
import APIError from '~/utils/apiError';

const rateLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 500, // increased for admin panel — it makes many parallel calls per page
	skip: (req) => {
		// Skip rate limiting for admin routes entirely in development
		if (process.env.NODE_ENV === 'development') return true;
		return false;
	},
	handler: (req, res, next) => {
		next(new APIError('Too many requests, please try again later.', httpStatus.TOO_MANY_REQUESTS));
	}
});

export default rateLimiter;

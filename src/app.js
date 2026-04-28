import express from 'express';
import compression from 'compression';
import helmet from 'helmet';
import cors from 'cors';
import passport from '~/config/passport';
import routes from '~/routes';
import error from '~/middlewares/error';
import rateLimiter from '~/middlewares/rateLimiter';
import config from '~/config/config';
import morgan from '~/config/morgan';
import startNotificationScheduler from './services/notificationScheduler';
import cookieParser from 'cookie-parser';

const app = express();



if (config.NODE_ENV !== 'test') {
	app.use(morgan);
}

// Start scheduler
startNotificationScheduler();

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(compression());
const ALLOWED_ORIGINS = [
	'http://localhost:5173',
	'http://localhost:3000',
	'http://localhost:5174',
	config.FRONTEND_URL,
	config.ADMIN_URL,
].filter(Boolean);

app.use(cors({
	origin: (origin, cb) => {
		// Allow requests with no origin (e.g. mobile apps, curl, Postman)
		if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
		if (config.NODE_ENV === 'development') return cb(null, true); // allow all in dev
		return cb(new Error('Blocked by CORS'), false);
	},
	credentials: true,
}));

app.use(rateLimiter);
app.use(passport.initialize());
app.use(express.static('public'));
app.use(cookieParser());

app.get("/",
	(req, res) => {
		return res.json({
			status: 200,
			data: "It's live"
		})
	})
app.use('/api', routes);

app.use(error.converter);
app.use(error.notFound);
app.use(error.handler);

export default app;

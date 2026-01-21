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
app.use(cors());

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

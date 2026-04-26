import mongoose from 'mongoose';
import config from '~/config/config';
import app from './app';
import initialData from './config/initialData';
import logger from './config/logger';

let server;



mongoose.Promise = global.Promise;


const db = mongoose.connection;

db.on('connecting', () => {
	logger.info('🚀 Connecting to MongoDB...');
});

db.on('error', (err) => {
	logger.error(`MongoDB connection error: ${err}`);
	mongoose.disconnect();
});

db.on('connected', () => {
	logger.info('🚀 Connected to MongoDB!');
});

db.once('open', () => {
	logger.info('🚀 MongoDB connection opened!');
});

db.on('reconnected', () => {
	logger.info('🚀 MongoDB reconnected!');
});

const connect = async () => {
	try {
		await mongoose.connect(config.DATABASE_URI, config.DATABASE_OPTIONS);
		logger.info('🚀 Connected to MongoDB end!');
		await initialData();
		logger.info('🚀 Initial MongoDB!');

		const port = config.PORT || 5000;
		server = app.listen(port, '0.0.0.0', () => {
			logger.info(`🚀 Server running on port ${port}`);
			logger.info('██████╗░░░██╗██╗███████╗');
			logger.info('██╔══██╗░██╔╝██║╚════██║');
			logger.info('██║░░██║██╔╝░██║░░███╔═╝');
			logger.info('██║░░██║███████║██╔══╝░░');
			logger.info('██████╔╝╚════██║███████╗');
			logger.info('╚═════╝░░░░░░╚═╝╚══════╝');
		});
	} catch (err) {
		logger.error(`MongoDB connection error: ${err}`);
	}
};

connect();


const exitHandler = () => {
	if (server) {
		server.close(() => {
			logger.warn('Server closed');
			process.exit(1);
		});
	} else {
		process.exit(1);
	}
};

const unexpectedErrorHandler = (err) => {
	logger.error(err);
	exitHandler();
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);

process.on('SIGTERM', () => {
	logger.info('SIGTERM received');
	if (server) {
		server.close();
	}
	mongoose.disconnect();
});

process.on('SIGINT', () => {
	logger.info('SIGINT received (Ctrl+C)');
	if (server) {
		server.close(() => {
			logger.info('Server closed');
			mongoose.disconnect().then(() => {
				logger.info('MongoDB disconnected');
				process.exit(0);
			});
		});
	} else {
		process.exit(0);
	}
});

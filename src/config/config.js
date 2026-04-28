import dotenv from 'dotenv';
import Joi from 'joi';

dotenv.config();

const envValidate = Joi.object()
	.keys({
		NODE_ENV: Joi.string().valid('production', 'development', 'test').required(),
		APP_NAME: Joi.string().allow('').empty('').default('App Name'),
		HOST: Joi.string().allow('').empty('').default('0.0.0.0'),
		PORT: Joi.number().allow('').empty('').default(666),

		DATABASE_URI: Joi.string().required(),

		JWT_ACCESS_TOKEN_SECRET_PRIVATE: Joi.string().required(),
		JWT_ACCESS_TOKEN_SECRET_PUBLIC: Joi.string().required(),
		JWT_ACCESS_TOKEN_EXPIRATION_DAYS: Joi.number().allow('').empty('').default(240),

		REFRESH_TOKEN_EXPIRATION_DAYS: Joi.number().allow('').empty('').default(1),
		VERIFY_EMAIL_TOKEN_EXPIRATION_MINUTES: Joi.number().allow('').empty('').default(60),
		RESET_PASSWORD_TOKEN_EXPIRATION_MINUTES: Joi.number().allow('').empty('').default(30),

		SMTP_HOST: Joi.string().allow('').empty(''),
		SMTP_PORT: Joi.number().allow('').empty(''),
		SMTP_USERNAME: Joi.string().allow('').empty(''),
		SMTP_PASSWORD: Joi.string().allow('').empty(''),
		EMAIL_FROM: Joi.string().allow('').empty(''),

		FRONTEND_URL: Joi.string().allow('').empty('').default('http://localhost:777'),
		ADMIN_URL: Joi.string().allow('').empty(''),
		IMAGE_URL: Joi.string().allow('').empty('').default('http://localhost:666/images'),

		USDA_API_KEY: Joi.string().allow('').empty('')
	})
	.unknown();

const { value: env, error } = envValidate.prefs({ errors: { label: 'key' } }).validate(process.env);

if (error) {
	throw new Error(`Config env error: ${error.message}`);
}

export default {
    FCM_PROJECT_ID: process.env.FCM_PROJECT_ID, 
	FCM_CLIENT_EMAIL: process.env.FCM_CLIENT_EMAIL,
	FCM_PRIVATE_KEY: process.env.FCM_PRIVATE_KEY,
	FCM_SERVER_KEY: process.env.FCM_SERVER_KEY,
	OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY, 
	ELEVENLABS_API_KEY:process.env.ELEVENLABS_API_KEY,
	NODE_ENV: env.NODE_ENV,
	APP_NAME: env.APP_NAME,
	HOST: env.HOST,
	PORT: env.PORT,

	DATABASE_URI: env.DATABASE_URI,
	DATABASE_OPTIONS: {
		useNewUrlParser: true,
		useUnifiedTopology: true,
		retryWrites: true,
		w: 'majority'
	},

	JWT_ACCESS_TOKEN_SECRET_PRIVATE: Buffer.from(env.JWT_ACCESS_TOKEN_SECRET_PRIVATE, 'base64').toString('utf8'),
	JWT_ACCESS_TOKEN_SECRET_PUBLIC: Buffer.from(env.JWT_ACCESS_TOKEN_SECRET_PUBLIC, 'base64').toString('utf8'),
	JWT_ACCESS_TOKEN_EXPIRATION_DAYS: env.JWT_ACCESS_TOKEN_EXPIRATION_DAYS,

	REFRESH_TOKEN_EXPIRATION_DAYS: env.REFRESH_TOKEN_EXPIRATION_DAYS,
	VERIFY_EMAIL_TOKEN_EXPIRATION_MINUTES: env.VERIFY_EMAIL_TOKEN_EXPIRATION_MINUTES,
	RESET_PASSWORD_TOKEN_EXPIRATION_MINUTES: env.RESET_PASSWORD_TOKEN_EXPIRATION_MINUTES,

	SMTP_HOST: env.SMTP_HOST,
	SMTP_PORT: env.SMTP_PORT,
	SMTP_USERNAME: env.SMTP_USERNAME,
	SMTP_PASSWORD: env.SMTP_PASSWORD,
	EMAIL_FROM: env.EMAIL_FROM,

	FRONTEND_URL: env.FRONTEND_URL,
	ADMIN_URL: env.ADMIN_URL,

	IMAGE_URL: env.IMAGE_URL,

	USDA_API_KEY: env.USDA_API_KEY,

	TOKEN_TYPES: {
		REFRESH: 'refresh',
		VERIFY_EMAIL: 'verifyEmail',
		RESET_PASSWORD: 'resetPassword'
	}
};

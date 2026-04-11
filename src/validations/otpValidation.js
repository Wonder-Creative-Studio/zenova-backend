import Joi from 'joi';

export const sendOtp = {
  body: Joi.object().keys({
    email: Joi.string().email().optional(),
    phone: Joi.string().pattern(/^[0-9]{10,15}$/).optional(),
    type: Joi.string().valid('LOGIN', 'RESET_PASSWORD', 'EMAIL_VERIFICATION').required(),
  })
    .custom((value, helpers) => {
      if (!value.email && !value.phone) {
        return helpers.error('any.custom', 'Email or phone is required');
      }
      return value;
    }),
};

export const verifyOtp = {
  body: Joi.object().keys({
    email: Joi.string().email().optional(),
    phone: Joi.string().pattern(/^[0-9]{10,15}$/).optional(),
    otp: Joi.string().length(6).required(),
    type: Joi.string().valid('LOGIN', 'RESET_PASSWORD', 'EMAIL_VERIFICATION').required(),
    fcmTokens: Joi.any().optional(),
  })
    .custom((value, helpers) => {
      if (!value.email && !value.phone) {
        return helpers.error('any.custom', 'Email or phone is required');
      }
      return value;
    }),
}; 

export default {
  sendOtp,
  verifyOtp
}
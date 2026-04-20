import Joi from 'joi';

// signup with fullName, email or phone, password, confirmPassword, and roles
export const signup = {
  body: Joi.object().keys({
    fullName: Joi.string().trim().min(2).max(66).required(),
    userName: Joi.string().alphanum().min(4).max(66).required(),
    email: Joi.string().email().optional(),       // email optional
    phone: Joi.string().pattern(/^[0-9]{10,15}$/).optional(), // phone optional
    password: Joi.string().trim().min(6).max(100).required(),
    confirmPassword: Joi.any()
      .valid(Joi.ref('password'))
      .required()
      .messages({ 'any.only': 'Confirm password does not match password' }),
    roles: Joi.array()
      .items(Joi.string().hex().length(24))
      .required() // pass role IDs (student/tutor) from frontend
  })
    // at least one of email or phone
    .custom((value, helpers) => {
      if (!value.email && !value.phone) {
        return helpers.error('any.custom', 'Either email or phone is required');
      }
      return value;
    }, 'email or phone requirement')
};

export const signin = {
  body: Joi.object().keys({
    // allow login via username or email or phone
    userName: Joi.string().optional(),
    email: Joi.string().email().optional(),
    phone: Joi.string().optional(),
    password: Joi.string().required(),
    fcmTokens: Joi.any().optional()
  })
    .custom((value, helpers) => {
      if (!value.userName && !value.email && !value.phone) {
        return helpers.error('any.custom', 'Provide username, email or phone to sign in');
      }
      return value;
    }, 'at least one identifier')
};

export const signout = {
  body: Joi.object().keys({
    refreshToken: Joi.string().optional()
  })
};

export const refreshTokens = {
  body: Joi.object().keys({
    refreshToken: Joi.string().required()
  })
};

export const forgotPassword = {
  body: Joi.object().keys({
    email: Joi.string().email().required()
  })
};

export const resetPassword = {
  query: Joi.object().keys({
    token: Joi.string().required()
  }),
  body: Joi.object().keys({
    password: Joi.string().trim().min(6).max(100).required()
  })
};

export const verifyEmail = {
  query: Joi.object().keys({
    token: Joi.string().required()
  })
};

export const updateMe = {
  body: Joi.object().keys({
    fullName: Joi.string().trim().min(2).max(66),
    userName: Joi.string().alphanum().min(4).max(66),
    email: Joi.string().email(),
    phone: Joi.string().pattern(/^[0-9]{10,15}$/),
    password: Joi.string().trim().min(6).max(100),
    avatar: Joi.string().max(666),
    dob: Joi.date().iso().max('now').optional(),
    height: Joi.number().min(50).max(300).optional(),       // cm
    weight: Joi.number().min(10).max(500).optional(),       // kg
    gender: Joi.string().valid('male', 'female', 'other').optional(),
    lifestyle: Joi.string()
      .valid('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active')
      .optional(),
    medicalCondition: Joi.string().max(200).allow('').optional(),
    locationName: Joi.string().max(200).allow('').optional(),
  })
};

export const googleSignIn = {
  body: Joi.object().keys({
    idToken: Joi.string().required(),
    fcmTokens: Joi.any().optional()
  }),
};

export const appleSignIn = {
  body: Joi.object().keys({
    identityToken: Joi.string().required(),
    fcmTokens: Joi.any().optional()
  }),
};

export const getMe = {
  query: Joi.object().keys({
    fcmToken: Joi.string().optional()
  })
};

export default {
  signup,
  signin,
  updateMe,
  signout,
  refreshTokens,
  verifyEmail,
  forgotPassword,
  resetPassword,
  googleSignIn,
  appleSignIn,
  getMe
};

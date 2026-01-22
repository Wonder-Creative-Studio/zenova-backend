// middlewares/validate.js
import Joi from 'joi';

/**
 * Middleware to validate request data using Joi
 * Expects schema = { body?: Joi.object, query?: Joi.object, params?: Joi.object }
 */
const validate = (schema) => (req, res, next) => {
  const validSchema = { ...schema };
  const data = {};

  if (validSchema.body) data.body = req.body;
  if (validSchema.query) data.query = req.query;
  if (validSchema.params) data.params = req.params;

  const result = Joi.object(validSchema).validate(data, {
    abortEarly: false, // report all errors
    allowUnknown: true,
    stripUnknown: true,
  });

  if (result.error) {
    // Return first error message in your standard format
    const message = result.error.details[0].message.replace(/["]/g, '');
    return res.status(400).json({
      success: false,
      data: {},
      message: message,
    });
  }

  // Attach validated data back to req
  if (validSchema.body) req.body = result.value.body;
  if (validSchema.query) req.query = result.value.query;
  if (validSchema.params) req.params = result.value.params;

  return next();
};

export default validate;
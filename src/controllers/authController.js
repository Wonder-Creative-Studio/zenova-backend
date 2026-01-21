import APIError from '~/utils/apiError';
import tokenService from '~/services/tokenService';
import emailService from '~/services/emailService';
import User from '~/models/userModel';
import config from '~/config/config';
import httpStatus from 'http-status';
import Token from '~/models/tokenModel';
import Role from '~/models/roleModel';
import googleService from '~/services/googleService';
import appleService from '~/services/appleService';

export const signup = async (req, res) => {
  try {
    const { fullName, userName, email, phone, password, confirmPassword, role } = req.body;

    // required fields
    if (!fullName || !password || !confirmPassword || !userName) {
      return res.status(400).json({
        success: false,
        data: {},
        message: 'fullName, userName, password and confirmPassword are required',
      });
    }

    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        data: {},
        message: 'Either email or phone is required',
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        data: {},
        message: 'Passwords do not match',
      });
    }

    // check role input
    const allowedRoles = ['instructor', 'User'];
    const inputRole = (role || 'User').trim(); // default student
    if (!allowedRoles.includes(inputRole)) {
      return res.status(400).json({
        success: false,
        data: {},
        message: 'Role must be instructor or user',
      });
    }

    // fetch role doc
    const roleDoc = await Role.getRoleByName(inputRole);
    if (!roleDoc) {
      return res.status(400).json({
        success: false,
        data: {},
        message: `Role ${inputRole} not found`,
      });
    }

    // create user
    const newUser = {
      fullName,
      userName,
      email: email || undefined,
      phone: phone || undefined,
      password,
      roles: [roleDoc.id],
    };

    const user = await User.createUser(newUser);
    const tokens = await tokenService.generateAuthTokens(user);

    return res.status(201).json({
      success: true,
      data: { user, tokens },
      message: 'Your account registered successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data: {},
      message: err.message || 'Validation error',
    });
  }
};



export const signin = async (req, res) => {
  try {
    const { email, phone, password } = req.body;

    if ((!email && !phone) || !password) {
      return res.status(400).json({
        success: false,
        data: {},
        message: 'Email or phone and password are required',
      });
    }

    // find user by email or phone
    let user;
    if (email) {
      user = await User.findOne({ email }).populate('roles', 'name');
    } else if (phone) {
      user = await User.findOne({ phone }).populate('roles', 'name');
    }


    if (!user) {
      return res.status(400).json({
        success: false,
        data: {},
        message: 'Incorrect email/phone or password',
      });
    }

    // verify password
    const isMatch = await user.isPasswordMatch(password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        data: {},
        message: 'Incorrect email/phone or password',
      });
    }

    // generate tokens
    const tokens = await tokenService.generateAuthTokens(user);
    console.log(tokens);

    user = user.toObject();
    user.roles = user.roles?.[0]?.name || 'User';

    const options = {
      httpOnly: false,
      secure: false,
      maxAge: 24 * 60 * 60 * 1000


    }

    return res
      .cookie("accessToken", tokens.accessToken.token, options)
      .cookie("refreshToken", tokens.refreshToken.token, options)
      .json({
        success: true,
        data: { user, tokens },
        message: 'Login successful',
      });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data: {},
      message: err.message || 'Something went wrong',
    });
  }
};

export const current = async (req, res) => {
  const user = await User.getUserById(req.user.id);
  if (!user) {
    throw new APIError('User not found', httpStatus.NOT_FOUND);
  }
  return res.json({
    success: true,
    data: {
      fullName: user.fullName,
      userName: user.userName,
      avatarUrl: user.avatarUrl
    },
    message: 'fetched successful'
  });
};

export const getMe = async (req, res) => {
  const user = await User.getUserByIdWithRoles(req.user.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      data: {},
      message: 'User not found'
    });
  }
  return res.json({
    success: true,
    data: user,
    message: 'Fetched successfully'
  });
};

export const updateMe = async (req, res) => {
  const user = await User.updateUserById(req.user.id, req.body);
  return res.json({
    success: true,
    data: user,
    message: 'Update successful'
  });
};

export const signout = async (req, res) => {
  try {
    await Token.revokeToken(req.body.refreshToken, config.TOKEN_TYPES.REFRESH);
    return res.json({
      success: true,
      data: {},
      message: 'Signout successful'
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data: {},
      message: err.message || 'Signout failed'
    });
  }
};

export const refreshTokens = async (req, res) => {
  try {
    const refreshTokenDoc = await tokenService.verifyToken(
      req.body.refreshToken,
      config.TOKEN_TYPES.REFRESH
    );
    const user = await User.getUserById(refreshTokenDoc.user);
    if (!user) {
      return res.status(401).json({
        success: false,
        data: {},
        message: 'User not found or unauthorized'
      });
    }

    await refreshTokenDoc.remove();
    const tokens = await tokenService.generateAuthTokens(user);

    return res.json({
      success: true,
      data: { tokens },
      message: 'Tokens refreshed successfully'
    });
  } catch (err) {
    return res.status(401).json({
      success: false,
      data: {},
      message: err.message || 'Invalid refresh token'
    });
  }
};

export const sendVerificationEmail = async (req, res) => {
  try {
    const user = await User.getUserByEmail(req.user.email);
    if (user.confirmed) {
      return res.status(400).json({
        success: false,
        data: {},
        message: 'Email already verified'
      });
    }

    const verifyEmailToken = await tokenService.generateVerifyEmailToken(req.user);
    await emailService.sendVerificationEmail(req.user.email, verifyEmailToken);

    return res.json({
      success: true,
      data: {},
      message: 'Verification email sent successfully'
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data: {},
      message: err.message || 'Could not send verification email'
    });
  }
};


// Helper to send consistent error (without throwing APIError)
const sendAuthError = (res, message, statusCode = httpStatus.UNAUTHORIZED) => {
  return res.status(statusCode).json({
    success: false,
    data: {},
    message
  });
};

export const verifyEmail = async (req, res) => {
  try {
    const verifyEmailTokenDoc = await tokenService.verifyToken(
      req.query.token,
      config.TOKEN_TYPES.VERIFY_EMAIL
    );
    const user = await User.getUserById(verifyEmailTokenDoc.user);
    if (!user) {
      return sendAuthError(res, 'Email verification failed', httpStatus.UNAUTHORIZED);
    }
    await Token.deleteMany({ user: user.id, type: config.TOKEN_TYPES.VERIFY_EMAIL });
    await User.updateUserById(user.id, { confirmed: true });

    return res.json({
      success: true,
      data: {}, // ✅ empty object
      message: 'Email verified successfully'
    });
  } catch (err) {
    return sendAuthError(res, 'Email verification failed', httpStatus.UNAUTHORIZED);
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const resetPasswordToken = await tokenService.generateResetPasswordToken(req.body.email);
    await emailService.sendResetPasswordEmail(req.body.email, resetPasswordToken);

    return res.json({
      success: true,
      data: {}, // ✅ was string, now empty object
      message: 'Password reset email sent successfully'
    });
  } catch (err) {
    // Handle user not found gracefully (don't leak info)
    if (err instanceof APIError && err.statusCode === httpStatus.NOT_FOUND) {
      // Still return success to avoid email enumeration
      return res.json({
        success: true,
        data: {},
        message: 'Password reset email sent successfully'
      });
    }
    return sendAuthError(res, 'Failed to send password reset email', httpStatus.INTERNAL_SERVER_ERROR);
  }
};

export const resetPassword = async (req, res) => {
  try {
    const resetPasswordTokenDoc = await tokenService.verifyToken(
      req.query.token,
      config.TOKEN_TYPES.RESET_PASSWORD
    );
    const user = await User.getUserById(resetPasswordTokenDoc.user);
    if (!user) {
      return sendAuthError(res, 'Password reset failed', httpStatus.UNAUTHORIZED);
    }
    await Token.deleteMany({ user: user.id, type: config.TOKEN_TYPES.RESET_PASSWORD });
    await User.updateUserById(user.id, { password: req.body.password });

    return res.json({
      success: true,
      data: {}, // ✅ empty object
      message: 'Password reset successfully'
    });
  } catch (err) {
    return sendAuthError(res, 'Password reset failed', httpStatus.UNAUTHORIZED);
  }
};

export const googleSignIn = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        data: {},
        message: 'Google ID token is required',
      });
    }

    const { user, tokens } = await googleService.googleSignIn(idToken);

    return res.json({
      success: true,
      data: { user, tokens },
      message: 'Google login successful',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data: {},
      message: err.message || 'Google login failed',
    });
  }
};


export const appleSignIn = async (req, res) => {
  try {
    const { identityToken } = req.body;

    if (!identityToken) {
      return res.status(400).json({
        success: false,
        data: {},
        message: 'Apple identity token is required',
      });
    }

    const { user, tokens } = await appleService.appleSignIn(identityToken);

    return res.json({
      success: true,
      data: { user, tokens },
      message: 'Apple login successful',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      data: {},
      message: err.message || 'Apple login failed',
    });
  }
};


export default {
  signup,
  signin,
  current,
  getMe,
  updateMe,
  signout,
  refreshTokens,
  sendVerificationEmail,
  verifyEmail,
  forgotPassword,
  resetPassword,
  googleSignIn,
  appleSignIn
};

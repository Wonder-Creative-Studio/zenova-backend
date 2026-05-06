// services/googleService.js
import { OAuth2Client } from 'google-auth-library';
import config from '~/config/config';
import User from '~/models/userModel';
import tokenService from '~/services/tokenService';
import httpStatus from 'http-status';
import APIError from '~/utils/apiError';
import { nanoid } from 'nanoid';

const client = new OAuth2Client(config.GOOGLE_CLIENT_ID);

/**
 * Verify Google ID token and return user info
 */
export const verifyGoogleToken = async (idToken) => {
  try {
    if (!config.GOOGLE_CLIENT_ID) {
      throw new APIError('Google auth is not configured on the server', httpStatus.INTERNAL_SERVER_ERROR);
    }

    const audiences = [
      config.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_ID_ANDROID,
      process.env.GOOGLE_CLIENT_ID_IOS,
    ].filter(Boolean);

    const ticket = await client.verifyIdToken({
      idToken,
      audience: audiences,
    });
    const payload = ticket.getPayload();
    if (!payload) {
      throw new APIError('Invalid Google token', httpStatus.UNAUTHORIZED);
    }
    return {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    };
  } catch (err) {
    console.error('Google Auth Error Details:', err);
    throw new APIError('Google authentication failed', httpStatus.UNAUTHORIZED);
  }
};

/**
 * Find or create user from Google info
 */
export const findOrCreateGoogleUser = async (googleInfo) => {
  let user = await User.findOne({ googleId: googleInfo.googleId });
  if (!user && googleInfo.email) {
    user = await User.findOne({ email: googleInfo.email.toLowerCase() });
  }

  if (!user) {
    user = new User({
      email: googleInfo.email?.toLowerCase(),
      fullName: googleInfo.name,
      userName: `google_${googleInfo.googleId.substring(0, 8)}`,
      password: `google_oauth_${nanoid(24)}`,
      googleId: googleInfo.googleId,
      confirmed: true,
      isVerified: true,
    });
    await user.save();
  } else {
    let shouldSave = false;
    if (!user.googleId) {
      user.googleId = googleInfo.googleId;
      shouldSave = true;
    }
    if (!user.email && googleInfo.email) {
      user.email = googleInfo.email.toLowerCase();
      shouldSave = true;
    }
    if (googleInfo.name && !user.fullName) {
      user.fullName = googleInfo.name;
      shouldSave = true;
    }
    if (shouldSave) {
      await user.save();
    }
  }
  return user;
};

/**
 * Full Google sign-in flow
 */
export const googleSignIn = async (idToken) => {
  const googleInfo = await verifyGoogleToken(idToken);
  const user = await findOrCreateGoogleUser(googleInfo);
  const tokens = await tokenService.generateAuthTokens(user);
  return { user, tokens };
};

export default {
  verifyGoogleToken,
  findOrCreateGoogleUser,
  googleSignIn,
};

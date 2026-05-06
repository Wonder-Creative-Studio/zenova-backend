// services/appleService.js
import appleSignin from 'apple-signin-auth';
import config from '~/config/config';
import User from '~/models/userModel';
import tokenService from '~/services/tokenService';
import httpStatus from 'http-status';
import APIError from '~/utils/apiError';
import { nanoid } from 'nanoid';

/**
 * Verify Apple identity token and extract user info
 */
export const verifyAppleToken = async (identityToken) => {
  try {
    if (!config.APPLE_CLIENT_ID) {
      throw new APIError('Apple auth is not configured on the server', httpStatus.INTERNAL_SERVER_ERROR);
    }

    const { payload } = await appleSignin.verifyIdToken(identityToken, {
      audience: config.APPLE_CLIENT_ID, // your bundle ID
    });

    if (!payload) {
      throw new APIError('Invalid Apple token', httpStatus.UNAUTHORIZED);
    }

    return {
      appleId: payload.sub, // unique user ID from Apple
      email: payload.email, // only on first login!
      isPrivateEmail: payload.is_private_email || false,
    };
  } catch (err) {
    throw new APIError('Apple authentication failed', httpStatus.UNAUTHORIZED);
  }
};

/**
 * Find or create user from Apple info
 */
export const findOrCreateAppleUser = async (appleInfo) => {
  // Apple only sends email on FIRST login!
  // So we must handle cases where email is missing

  let user;

  if (appleInfo.email) {
    user = await User.findOne({ email: appleInfo.email });
  }

  if (!user) {
    user = await User.findOne({ appleId: appleInfo.appleId });
  }

  if (!user) {
    // Create new user
    // If no email, generate a placeholder (Apple hides real email)
    const email = appleInfo.email || `apple_${appleInfo.appleId}@privaterelay.appleid.com`;

    user = new User({
      email,
      fullName: appleInfo.fullName || 'Apple User',
      userName: `apple_${appleInfo.appleId.substring(0, 8)}`,
      password: `apple_oauth_${nanoid(24)}`,
      appleId: appleInfo.appleId,
      confirmed: true,
      isVerified: true,
    });
    await user.save();
  } else {
    let shouldSave = false;
    if (!user.appleId) {
      user.appleId = appleInfo.appleId;
      shouldSave = true;
    }
    if (appleInfo.email && (!user.email || user.email.includes('privaterelay'))) {
      user.email = appleInfo.email;
      shouldSave = true;
    }
    if (appleInfo.fullName && (!user.fullName || user.fullName === 'Apple User')) {
      user.fullName = appleInfo.fullName;
      shouldSave = true;
    }
    if (shouldSave) {
      await user.save();
    }
  }

  return user;
};

/**
 * Full Apple sign-in flow
 */
export const appleSignIn = async (identityToken, profile = {}) => {
  const appleInfo = await verifyAppleToken(identityToken);
  const user = await findOrCreateAppleUser({
    ...appleInfo,
    email: appleInfo.email || profile.email,
    fullName: profile.fullName,
  });
  const tokens = await tokenService.generateAuthTokens(user);
  return { user, tokens };
};

export default {
  verifyAppleToken,
  findOrCreateAppleUser,
  appleSignIn,
};

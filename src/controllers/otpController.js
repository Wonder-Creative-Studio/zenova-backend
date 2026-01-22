import Otp from '../models/otpModel';
import User from '../models/userModel';
import { generateAndStoreOtp } from '../utils/otp.js';
import { sendOtpEmail } from '~/services/emailService/index.js';
import tokenService from '~/services/tokenService';
import { nanoid } from 'nanoid';

// Helper for consistent success response
const successResponse = (res, message, data = {}) => {
  return res.json({ success: true, data, message });
};

// Helper for consistent error response
const errorResponse = (res, statusCode, message) => {
  return res.status(statusCode).json({ success: false, data: {}, message });
};

// export const sendOtp = async (req, res, next) => {
//   try {
//     const { email, phone, type = 'LOGIN' } = req.body;

//     if (!email && !phone) {
//       return errorResponse(res, 400, 'Email or phone is required');
//     }

//     // Normalize email
//     const normalizedEmail = email ? email.toLowerCase().trim() : null;

//     // Check if user exists
//     let user = null;
//     if (normalizedEmail) {
//       user = await User.findOne({ email: normalizedEmail });
//     } else if (phone) {
//       user = await User.findOne({ phone });
//     }

//     // If user doesn't exist, create temp user for onboarding
//     if (!user) {
//       const userName = normalizedEmail 
//         ? normalizedEmail.split('@')[0] 
//         : `user_${Date.now()}`;

//       user = new User({
//         fullName: userName,
//         userName,
//         email: normalizedEmail,
//         phone: phone || undefined,
//         password: 'TEMP_USER_OTP', // Will be updated in onboarding
//         confirmed: false,
//         isVerified: false,
//       });
//       await user.save();
//     }

//     // Generate and store OTP
//     const identifier = normalizedEmail || phone;
//     await generateAndStoreOtp(user._id, identifier, type);

//     return successResponse(res, 'OTP sent successfully');
//   } catch (err) {
//     next(err);
//   }
// };



export const sendOtp = async (req, res, next) => {
  try {
    const { email, phone, type } = req.body;

    if (!email && !phone) {
      return errorResponse(res, 400, 'Email or phone is required');
    }

    // Normalize email
    const normalizedEmail = email ? email.toLowerCase().trim() : null;

    // Find user (required for OTP)
    let user = null;
    if (normalizedEmail) {
      user = await User.findOne({ email: normalizedEmail });
    } else if (phone) {
      user = await User.findOne({ phone });
    }

    if (!user) {
      // Create user ONLY if not found
      const userName = `user_${nanoid(6)}`;

      user = new User({
        fullName: userName,
        userName,
        email: normalizedEmail,
        phone: phone || undefined,
        password: 'TEMP_USER_OTP',
        confirmed: false,
        isVerified: false,
      });
      await user.save();
    }

    // ✅ DELETE OLD OTPs for this user (critical!)
    await Otp.deleteMany({ user: user._id, type });

    const identifier = normalizedEmail || phone;
    await generateAndStoreOtp(user._id, identifier, type);

    return successResponse(res, 'OTP sent successfully');
  } catch (err) {
    next(err);
  }
};



export const verifyOtp = async (req, res, next) => {
  try {
    let { email, phone, otp, type } = req.body;

    // Default OTP type (same as sendOtp)
    type = type || 'LOGIN';

    // Normalize email for consistency
    if (email) email = email.toLowerCase().trim();

    // Find user first
    let user = null;
    if (email) {
      user = await User.findOne({ email });
    } else if (phone) {
      user = await User.findOne({ phone });
    }

    if (!user) {
      return errorResponse(res, 400, 'User not found');
    }

    console.log('🔍 Verifying OTP for:', { email, phone, otp, type });

    // Find OTP linked to THIS user and correct type
    const otpDoc = await Otp.findOne({
      user: user._id,
      otp,
      type,
      expiresAt: { $gte: new Date() },
    });

    console.log('📄 Found OTP:', otpDoc);

    if (!otpDoc) {
      return errorResponse(res, 400, 'Invalid or expired OTP');
    }

    // Delete OTP after successful use
    await Otp.deleteOne({ _id: otpDoc._id });

    // Mark user verified (optional)
    if (!user.isVerified) {
      user.isVerified = true;
      await user.save();
    }

    // Generate JWT tokens
    const tokens = await tokenService.generateAuthTokens(user);

    // FIX: Determine onboarding status using new flag
    const isNewUser = !user.isOnboarded;
    const options = {
      httpOnly: false,
      secure: false,
      maxAge: 24 * 60 * 60 * 1000


    }

    return res.
      cookie('refreshToken', tokens.refreshToken.token, options).
      cookie('accessToken', tokens.accessToken.token, options).
      json({
        success: true,
        data: {
          userId: user._id,
          isNewUser,
          user: {
            id: user._id,
            fullName: user.fullName,
            userName: user.userName,
            email: user.email,
            phone: user.phone,
            avatarUrl: user.avatarUrl,
          },
          tokens,
        },
        message: isNewUser
          ? 'Account created. Complete onboarding.'
          : 'Login successful.',
      });

  } catch (err) {
    next(err);
  }
};





// export const verifyOtp = async (req, res, next) => {
//   try {
//     let { email, phone, otp, type } = req.body;

//     // Default OTP type (same as sendOtp)
//     type = type || 'LOGIN';

//     // Normalize email for consistency
//     if (email) email = email.toLowerCase().trim();

//     // Find user first
//     let user = null;
//     if (email) {
//       user = await User.findOne({ email });
//     } else if (phone) {
//       user = await User.findOne({ phone });
//     }

//     if (!user) {
//       return errorResponse(res, 400, 'User not found');
//     }

//     console.log('🔍 Verifying OTP for:', { email, phone, otp, type });

//     // Find OTP linked to THIS user and correct type
//     const otpDoc = await Otp.findOne({
//       user: user._id,
//       otp,
//       type,            // <-- FIXED
//       expiresAt: { $gte: new Date() },
//     });

//     console.log('📄 Found OTP:', otpDoc);

//     if (!otpDoc) {
//       return errorResponse(res, 400, 'Invalid or expired OTP');
//     }

//     // Delete OTP after successful use
//     await Otp.deleteOne({ _id: otpDoc._id });

//     // Mark user verified (optional)
//     if (!user.isVerified) {
//       user.isVerified = true;
//       await user.save();
//     }

//     // Generate JWT tokens
//     const tokens = await tokenService.generateAuthTokens(user);
//     const isNewUser = !user.confirmed;

//     return res.json({
//       success: true,
//       data: {
//         userId: user._id,
//         isNewUser,
//         user: {
//           id: user._id,
//           fullName: user.fullName,
//           userName: user.userName,
//           email: user.email,
//           phone: user.phone,
//           avatarUrl: user.avatarUrl,
//         },
//         tokens,
//       },
//       message: isNewUser
//         ? 'Account created. Complete onboarding.'
//         : 'Login successful.',
//     });

//   } catch (err) {
//     next(err);
//   }
// };










export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      // 🔒 Security: Don't reveal if email exists → still return success
      return successResponse(res, 'OTP sent for password reset');
    }

    await generateAndStoreOtp(user._id, email, 'RESET_PASSWORD');
    return successResponse(res, 'OTP sent for password reset');
  } catch (err) {
    next(err);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return errorResponse(res, 404, 'User not found');
    }

    const otpDoc = await Otp.findOne({ user: user._id, type: 'RESET_PASSWORD' }).sort({ createdAt: -1 });

    if (!otpDoc) {
      return errorResponse(res, 400, 'OTP not found or expired');
    }

    if (otpDoc.otp !== String(otp)) { // ✅ Also fix here!
      return errorResponse(res, 400, 'Invalid OTP');
    }

    await Otp.deleteMany({ user: user._id, type: 'RESET_PASSWORD' });

    user.password = newPassword;
    await user.save();

    return successResponse(res, 'Password reset successful');
  } catch (err) {
    next(err);
  }
};

// src/controllers/otpController.js
export const signupWithOtp = async (req, res, next) => {
  try {
    const { email, phone, otp, name } = req.body;

    // Validate
    if (!email && !phone) {
      return errorResponse(res, 400, 'Email or phone is required');
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }]
    });
    if (existingUser) {
      return errorResponse(res, 400, 'User already exists. Please log in.');
    }

    // Verify OTP
    const otpDoc = await Otp.findOne({
      $or: [{ email }, { phone }],
      otp,
      type: 'EMAIL_VERIFICATION',
      expiresAt: { $gte: new Date() }
    });

    if (!otpDoc) {
      return errorResponse(res, 400, 'Invalid or expired OTP');
    }

    // Create new user
    const newUser = new User({
      fullName: name || 'New User',
      userName: `user_${Date.now()}`,
      email: email || undefined,
      phone: phone || undefined,
      password: 'temp_password', // Will be updated in onboarding
      confirmed: true,
      isVerified: true,
    });

    const user = await newUser.save();

    // Delete OTP
    await Otp.deleteMany({
      $or: [{ email }, { phone }],
      type: 'EMAIL_VERIFICATION'
    });

    // ✅ Return userId for onboarding
    return res.json({
      success: true,
      data: {
        userId: user._id,
        isNewUser: true,
      },
      message: 'User created. Complete onboarding.',
    });
  } catch (err) {
    next(err);
  }
};
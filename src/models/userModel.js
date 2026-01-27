import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import config from '~/config/config';
import Role from './roleModel.js';
import APIError from '~/utils/apiError.js';
import httpStatus from 'http-status';
import { number } from 'joi';

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      unique: true,
      sparse: true, // optional email
    },
    phone: {
      type: String,
      unique: true,
      sparse: true, // optional phone
    },
    password: {
      type: String,
      required: true,
      private: true,
    },
    avatar: {
      type: String,
      default: 'avatar.png',
    },
    confirmed: {
      type: Boolean,
      default: false,
    },
    // In userModel.js — add inside the schema object
    height: {
      type: Number, // in cm
    },
    weight: {
      type: Number, // in kg
    },
    gender: {
      type: String, // 'male', 'female', 'other'
    },
    dietType: {
      type: String, // 'non-veg', 'veg', 'vegan'
    },
    lifestyle: {
      type: String, // 'very_active', 'active', 'sedentary'
    },
    medicalCondition: {
      type: String, // 'stress', 'none', 'diabetes', etc.
    },
    isOnboarded: { type: Boolean, default: false },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: [Number], // [longitude, latitude]
    },
    dob: {
      type: Date, // date of birth
    },
    languages: [String], // e.g., ['Bengali', 'English']
    syncAppleHealth: {
      type: Boolean,
      default: false,
    },
    autoTrackCategories: [String], // e.g., ['steps', 'nutrition']
    aiTrainer: {
      gender: String, // 'male', 'female'
      tonality: String, // 'energetic', 'calm', 'insightful'
    },
    aiNutritionist: {
      gender: String,
      tonality: String,
    },
    aiLifestyleCoach: {
      gender: String,
      tonality: String,
    },
    currentMood: String, // 'tired', 'neutral', 'calm', 'energized'
    lifestyleState: String, // 'chaotic', 'trying_to_get_back', 'on_off', 'balanced'
    barriers: [String], // e.g., ['too_much_work', 'lack_of_structure']

    stepGoal: {
      type: Number,
    },
    focusGoal: {
      dailyScreenTimeLimitMin: { type: Number, default: 150 },
      focusModeTargetHours: { type: Number, default: 2 },
      reminderEnabled: { type: Boolean, default: true },
    },
    // Gamification fields
    novaCoins: {
      type: Number,
      default: 0,
    },
    streakDays: {
      type: Number,
      default: 0,
    },
    level: {
      type: Number,
      default: 1,
    },
    badges: [{
      name: String,        // "Streak Master"
      icon: String,        // "streak_1"
      unlockedAt: Date,
    }],
    questsCompleted: [{
      questId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'quests',
      },
      completedAt: Date,
    }],
    lastStreakDate: {
      type: Date,
      default: null,
    },

    chats: [{
      role: {
        type: String,
        enum: ['user', 'assistant'],
        required: true,
      },
      content: {
        type: String,
        required: true,
      },
      bot: {
        type: String, // 'calia', 'noura'
        default: 'calia',
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
    }],
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
    aiPreferences: {
      calia: {
        gender: { type: String, enum: ['Male', 'Female'], default: 'Female' },
        tonality: { type: String, enum: ['Energetic', 'Insightful', 'Calm'], default: 'Calm' },
      },
      noura: {
        gender: { type: String, enum: ['Male', 'Female'], default: 'Female' },
        tonality: { type: String, enum: ['Energetic', 'Insightful', 'Calm'], default: 'Insightful' },
      },
      aeron: {
        gender: { type: String, enum: ['Male', 'Female'], default: 'Male' },
        tonality: { type: String, enum: ['Energetic', 'Insightful', 'Calm'], default: 'Energetic' },
      },
    },

    roles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'roles',
      },
    ],
    isVerified: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        delete ret.password; // never send password in response
      },
    },
  }
);

// Virtual field for avatar URL
userSchema.virtual('avatarUrl').get(function () {
  return config.IMAGE_URL + '/' + this.avatar;
});

// Password hash middleware
userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    const salt = bcrypt.genSaltSync(10);
    this.password = bcrypt.hashSync(this.password, salt);
  }
  next();
});

// Instance method for password check
userSchema.methods.isPasswordMatch = function (password) {
  return bcrypt.compareSync(password, this.password);
};

/** Static helpers */
userSchema.statics.getUserById = function (id) {
  return this.findById(id);
};

userSchema.statics.getUserByIdWithRoles = function (id) {
  return this.findById(id).populate('roles', 'name description');
};

userSchema.statics.getUserByUserName = function (userName) {
  return this.findOne({ userName });
};

userSchema.statics.getUserByEmail = function (email) {
  return this.findOne({ email });
};

// Create user with basic validation
userSchema.statics.createUser = async function (body) {
  if (await this.findOne({ userName: body.userName })) {
    throw new APIError('User name already exists', httpStatus.BAD_REQUEST);
  }
  if (body.email && (await this.findOne({ email: body.email }))) {
    throw new APIError('Email already exists', httpStatus.BAD_REQUEST);
  }
  if (body.phone && (await this.findOne({ phone: body.phone }))) {
    throw new APIError('Phone already exists', httpStatus.BAD_REQUEST);
  }
  if (body.roles) {
    for (const rid of body.roles) {
      if (!(await Role.findById(rid))) {
        throw new APIError('Role does not exist', httpStatus.BAD_REQUEST);
      }
    }
  }
  return this.create(body);
};

// Update user
userSchema.statics.updateUserById = async function (userId, body) {
  const user = await this.findById(userId);
  if (!user) throw new APIError('User not found', httpStatus.NOT_FOUND);

  if (body.userName && (await this.findOne({ userName: body.userName, _id: { $ne: userId } }))) {
    throw new APIError('User name already exists', httpStatus.BAD_REQUEST);
  }
  if (body.email && (await this.findOne({ email: body.email, _id: { $ne: userId } }))) {
    throw new APIError('Email already exists', httpStatus.BAD_REQUEST);
  }
  if (body.phone && (await this.findOne({ phone: body.phone, _id: { $ne: userId } }))) {
    throw new APIError('Phone already exists', httpStatus.BAD_REQUEST);
  }

  Object.assign(user, body);
  return user.save();
};


userSchema.post('save', async function (doc) {
  // Only run if this is an update (not new user)
  if (this.isNew) return;

  // Check if weight or height changed
  if (this.isModified('weight') || this.isModified('height')) {
    try {
      // Skip if essential fields are missing
      if (!this.weight || !this.height || !this.gender || !this.dob) return;

      const age = new Date().getFullYear() - new Date(this.dob).getFullYear();
      let bmr;
      if (this.gender === 'male') {
        bmr = 10 * this.weight + 6.25 * this.height - 5 * age + 5;
      } else {
        bmr = 10 * this.weight + 6.25 * this.height - 5 * age - 161;
      }
      bmr = Math.round(bmr);

      // Save BMR log
      await BmrLog.create({
        userId: this._id,
        bmr,
        weight: this.weight,
        height: this.height,
        age,
        gender: this.gender,
      });

      // Optional: Award NovaCoins (you can add this later)
      await awardNovaCoins(this._id, 'bmr_update', 5);
    } catch (err) {
      // Log error but don't crash user save
      console.error('Auto-BMR calculation failed:', err);
    }
  }
});

const User = mongoose.model('users', userSchema);
export default User;

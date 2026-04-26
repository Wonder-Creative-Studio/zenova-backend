// src/models/safetyEventModel.js
// Chatbot v1 — safety_events collection.
// Written whenever the chatbot detects a crisis or safety-relevant message.
import mongoose from 'mongoose';

const SEVERITY_LEVELS = ['low', 'medium', 'high', 'critical'];
const CATEGORIES = [
  'safe',
  'suicide_self_harm',
  'eating_disorder_active',
  'acute_mental_health_crisis',
  'medical_emergency',
  'other',
];

const safetyEventSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      required: true,
      index: true,
    },
    threadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'chat_threads',
      default: null,
    },
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'chat_messages',
      default: null,
    },
    agent: {
      type: String,
      enum: ['calia', 'noura', 'aeron'],
      required: true,
    },
    category: {
      type: String,
      enum: CATEGORIES,
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: SEVERITY_LEVELS,
      default: 'medium',
    },
    detectedBy: {
      type: String,
      enum: ['keyword_filter', 'llm_classification', 'manual'],
      default: 'keyword_filter',
    },
    snippet: {
      type: String,
      default: null, // First 200 chars of the triggering message (redacted if needed)
    },
    resolved: {
      type: Boolean,
      default: false,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

safetyEventSchema.index({ createdAt: -1 });
safetyEventSchema.index({ category: 1, createdAt: -1 });
safetyEventSchema.index({ userId: 1, createdAt: -1 });

const SafetyEvent = mongoose.model('safety_events', safetyEventSchema);
export default SafetyEvent;

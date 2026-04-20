// src/models/safetyEventModel.js
// Audit log of crisis detections. Category only — we never store message content here.
import mongoose from 'mongoose';

const safetyEventSchema = new mongoose.Schema(
	{
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'users',
			required: true,
			index: true,
		},
		threadId: { type: mongoose.Schema.Types.ObjectId, ref: 'chat_threads', default: null },
		agent: { type: String, enum: ['calia', 'noura', 'aeron'], default: null },
		category: {
			type: String,
			enum: [
				'suicide_self_harm',
				'eating_disorder_active',
				'acute_mental_health_crisis',
				'medical_emergency',
				'safe',
			],
			required: true,
		},
		severity: { type: String, enum: ['low', 'medium', 'high'], default: 'high' },
		detectedBy: { type: String, enum: ['regex', 'classifier'], default: 'regex' },
	},
	{ timestamps: true }
);

const SafetyEvent = mongoose.model('safety_events', safetyEventSchema);
export default SafetyEvent;

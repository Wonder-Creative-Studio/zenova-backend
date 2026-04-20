// src/models/chatThreadModel.js
// Thread between a user and one of the 3 AI agents (Calia, Noura, Aeron).
// `rollingSummary` compresses everything older than the last N verbatim turns.
import mongoose from 'mongoose';

const chatThreadSchema = new mongoose.Schema(
	{
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'users',
			required: true,
			index: true,
		},
		agent: {
			type: String,
			enum: ['calia', 'noura', 'aeron'],
			required: true,
			index: true,
		},
		title: { type: String, default: '' },
		rollingSummary: { type: String, default: '' },
		messageCount: { type: Number, default: 0 },
		lastMessageAt: { type: Date, default: Date.now },
	},
	{ timestamps: true }
);

chatThreadSchema.index({ userId: 1, agent: 1, lastMessageAt: -1 });

const ChatThread = mongoose.model('chat_threads', chatThreadSchema);
export default ChatThread;

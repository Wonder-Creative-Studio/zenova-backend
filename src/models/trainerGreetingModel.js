// src/models/trainerGreetingModel.js
import mongoose from 'mongoose';

const trainerGreetingSchema = new mongoose.Schema(
	{
		agent: {
			type: String,
			required: true,
			unique: true,
			index: true,
		},
		displayName: {
			type: String,
			required: true,
		},
		cardMessage: {
			type: String,
			required: true,
		},
		weeklyCardMessages: {
			type: [String],
			default: [],
		},
		isActive: {
			type: Boolean,
			default: true,
			index: true,
		},
	},
	{ timestamps: true }
);

const TrainerGreeting = mongoose.model('trainer_greetings', trainerGreetingSchema);
export default TrainerGreeting;

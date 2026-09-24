// models/FeedbackModel.js
import mongoose from 'mongoose'

const feedbackSchema = new mongoose.Schema({
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true }
}, { timestamps: true })

feedbackSchema.index({ event: 1, user: 1 }, { unique: true }) // one review per user per event

export const FeedbackModel = mongoose.model('Feedback', feedbackSchema)
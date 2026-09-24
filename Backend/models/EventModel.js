import mongoose from 'mongoose'
import { normalizeTags } from '../helpers/tags.js'

const eventSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: String, required: true },
    // wrapped so mongoose's extra setter args aren't mistaken for normalizeTags' `max`
    tags: { type: [String], default: [], set: (v) => normalizeTags(v) },

    venue: { type: String, required: true },
    city: { type: String, required: true },

    startTime: { type: Date, required: true },
    endTime: {
        type: Date, required: true,
        validate: {
            validator: function (v) { return !this.startTime || v > this.startTime },
            message: 'endTime must be after startTime'
        }
    },

    registrationType: { type: String, enum: ['individual', 'team'], default: 'individual' },
    teamSize: {
        min: { type: Number, default: 1, min: 1 },
        max: {
            type: Number, default: 1, min: 1,
            validate: {
                validator: function (v) { return v >= (this.teamSize?.min ?? 1) },
                message: 'teamSize.max must be at least teamSize.min'
            }
        }
    },

    capacity: { type: Number, required: true, min: [1, 'capacity must be at least 1'] },
    registeredCount: { type: Number, default: 0 },

    price: { type: Number, default: 0, min: 0 },

    checkers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    status: {
        type: String,
        enum: ['draft', 'published', 'ongoing', 'completed', 'cancelled'],
        default: 'draft'
    }
}, { timestamps: true })

// listing page (published, soonest first) and organizer dashboard
eventSchema.index({ status: 1, startTime: 1 })
eventSchema.index({ organizer: 1, startTime: 1 })

export const EventModel = mongoose.model('Event', eventSchema)

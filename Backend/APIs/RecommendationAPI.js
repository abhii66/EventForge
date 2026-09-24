import exp from 'express'
import { EventModel } from '../models/EventModel.js'
import { RegistrationModel } from '../models/RegistrationModel.js'
import { FeedbackModel } from '../models/FeedbackModel.js'
import { UserModel } from '../models/UserModel.js'
import { isAuthenticated } from '../middleware/verifyToken.js'
import { topK } from '../helpers/topK.js'
import { buildProfile, scoreEvent } from '../helpers/recommend.js'

export const recommendApp = exp.Router()

// average rating + review count per organizer, across all their events' feedback
async function organizerRatings(organizerIds) {
    if (!organizerIds.length) return new Map()
    const rows = await FeedbackModel.aggregate([
        { $lookup: { from: 'events', localField: 'event', foreignField: '_id', as: 'ev' } },
        { $unwind: '$ev' },
        { $match: { 'ev.organizer': { $in: organizerIds } } },
        { $group: { _id: '$ev.organizer', avg: { $avg: '$rating' }, n: { $sum: 1 } } }
    ])
    return new Map(rows.map(r => [String(r._id), { avg: r.avg, n: r.n }]))
}

recommendApp.get('/my', isAuthenticated, async (req, res) => {
    try {
        const user = await UserModel.findById(req.user.id).select('interests').lean()

        const regs = await RegistrationModel.find({
            user: req.user.id, status: { $in: ['confirmed', 'waitlisted'] }
        }).populate('event', 'category tags').lean()

        const myRatings = await FeedbackModel.find({ user: req.user.id }).select('event rating').lean()
        const ratingByEvent = new Map(myRatings.map(f => [String(f.event), f.rating]))

        // taste profile: stated interests + what they attended, weighted by how they rated it
        const history = regs
            .filter(r => r.status === 'confirmed' && r.event)
            .map(r => ({ event: r.event, rating: ratingByEvent.get(String(r.event._id)) ?? null }))
        const profile = buildProfile(user?.interests || [], history)

        const candidates = await EventModel.find({
            status: 'published',
            startTime: { $gt: new Date() },
            organizer: { $ne: req.user.id },
            _id: { $nin: regs.filter(r => r.event).map(r => r.event._id) }
        }).sort({ startTime: 1 }).limit(500).lean()

        const organizerIds = [...new Map(candidates.map(e => [String(e.organizer), e.organizer])).values()]
        const stats = await organizerRatings(organizerIds)

        const scored = candidates.map(event => ({ event, ...scoreEvent(event, profile, stats) }))
        const best = topK(scored, 10, s => s.score)

        res.json(best.map(({ event, matchedOn }) => ({ ...event, matchedOn })))
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch recommendations', error: err.message })
    }
})

import exp from 'express'
import { EventModel } from '../models/EventModel.js'
import { RegistrationModel } from '../models/RegistrationModel.js'
import { TeamModel } from '../models/TeamModel.js'
import { isAuthenticated, authorizeRoles } from '../middleware/verifyToken.js'
import { isOwner } from '../helpers/ownerCheck.js'
import { waitlistCandidates } from '../helpers/waitlist.js'
import { issueTicket } from './TicketAPI.js'

export const registerApp = exp.Router()

// atomic: only succeeds if a seat is actually free, so two racing requests can't oversell
async function claimSeat(eventId) {
    return EventModel.findOneAndUpdate(
        { _id: eventId, $expr: { $lt: ['$registeredCount', '$capacity'] } },
        { $inc: { registeredCount: 1 } },
        { new: true }
    )
}

const releaseSeat = (eventId) =>
    EventModel.findByIdAndUpdate(eventId, { $inc: { registeredCount: -1 } })

// null if the event is open for signups, otherwise the reason it isn't
function closedReason(event) {
    if (event.status !== 'published') return 'Registration is not open for this event'
    if (event.endTime < new Date()) return 'This event has already ended'
    return null
}

// First of the user's *active* confirmed events that overlaps `event`'s time window, or null.
// Overlap test (a.start < b.end && b.start < a.end) runs in the DB. Filtering on event status
// matters: cancelled events keep their confirmed registrations, and must not block new ones.
async function findConflict(userId, event) {
    const mine = await RegistrationModel.find({
        user: userId, status: 'confirmed', event: { $ne: event._id }
    }).select('event').lean()
    if (!mine.length) return null

    return EventModel.findOne({
        _id: { $in: mine.map(r => r.event) },
        status: { $in: ['published', 'ongoing'] },
        startTime: { $lt: event.endTime },
        endTime: { $gt: event.startTime }
    }).select('title').lean()
}

// A confirmed seat was just freed on `eventId`. Hand it to the best waitlisted registration
// that doesn't clash with something they're already attending; otherwise give the seat back.
//
// When someone is promoted, the seat is *transferred* — registeredCount stays put — so a new
// signup can't slip in ahead of the waitlist during the gap.
async function promoteFromWaitlist(eventId) {
    const event = await EventModel.findById(eventId)
    if (!event || !['published', 'ongoing'].includes(event.status)) {
        return releaseSeat(eventId)
    }

    const waitlisted = await RegistrationModel.find({ event: eventId, status: 'waitlisted' }).lean()

    for (const candidate of waitlistCandidates(waitlisted)) {
        // they may have joined another event since being waitlisted here
        if (candidate.user && await findConflict(candidate.user, event)) continue

        // atomic claim: if they cancelled or were promoted meanwhile, this returns null
        const promoted = await RegistrationModel.findOneAndUpdate(
            { _id: candidate._id, status: 'waitlisted' },
            { status: 'confirmed' },
            { new: true }
        )
        if (!promoted) continue

        await issueTicket(promoted._id)
        return promoted
    }

    return releaseSeat(eventId) // nobody eligible
}

// POST /register-api/:eventId — individual registration
registerApp.post('/:eventId', isAuthenticated, async (req, res) => {
    try {
        const { eventId } = req.params

        const event = await EventModel.findById(eventId)
        if (!event) return res.status(404).json({ message: 'Event not found' })

        const closed = closedReason(event)
        if (closed) return res.status(400).json({ message: closed })

        if (event.organizer.toString() === req.user.id) {
            return res.status(400).json({ message: "You can't register for your own event" })
        }
        if (event.registrationType === 'team') {
            return res.status(400).json({ message: 'This event needs a team registration' })
        }

        const existing = await RegistrationModel.findOne({
            event: eventId, user: req.user.id, status: { $ne: 'cancelled' }
        })
        if (existing) return res.status(400).json({ message: 'You are already registered for this event' })

        const conflict = await findConflict(req.user.id, event)
        if (conflict) return res.status(409).json({ message: `Time conflict with "${conflict.title}"` })

        const claimed = await claimSeat(eventId)
        const status = claimed ? 'confirmed' : 'waitlisted'

        let registration
        try {
            registration = await RegistrationModel.create({
                event: eventId, type: 'individual', user: req.user.id, status
            })
            if (status === 'confirmed') await issueTicket(registration._id)
        } catch (err) {
            if (claimed) await releaseSeat(eventId) // don't leak a seat if the save failed
            throw err
        }

        res.status(201).json({ message: `Registration ${status}`, registration })
    } catch (err) {
        res.status(500).json({ message: 'Registration failed', error: err.message })
    }
})

// POST /register-api/team/:eventId — team registration
// registration.user is the team leader, so the leader's dashboard, conflict checks,
// cancel rights and feedback all work through the same path as individual registrations.
registerApp.post('/team/:eventId', isAuthenticated, async (req, res) => {
    try {
        const { eventId } = req.params
        const { teamName, members } = req.body

        const event = await EventModel.findById(eventId)
        if (!event) return res.status(404).json({ message: 'Event not found' })

        const closed = closedReason(event)
        if (closed) return res.status(400).json({ message: closed })

        if (event.organizer.toString() === req.user.id) {
            return res.status(400).json({ message: "You can't register for your own event" })
        }
        if (event.registrationType !== 'team') {
            return res.status(400).json({ message: 'This event does not accept team registrations' })
        }
        if (!Array.isArray(members)) {
            return res.status(400).json({ message: 'members must be a list' })
        }

        const size = members.length + 1
        if (size < event.teamSize.min || size > event.teamSize.max) {
            return res.status(400).json({ message: `Team size must be between ${event.teamSize.min} and ${event.teamSize.max}` })
        }

        const existing = await RegistrationModel.findOne({
            event: eventId, user: req.user.id, status: { $ne: 'cancelled' }
        })
        if (existing) return res.status(400).json({ message: 'You have already registered a team for this event' })

        const conflict = await findConflict(req.user.id, event)
        if (conflict) return res.status(409).json({ message: `Time conflict with "${conflict.title}"` })

        const team = new TeamModel({ name: teamName, event: eventId, leader: req.user.id, members })
        await team.validate() // fail on bad input *before* a seat is claimed

        const claimed = await claimSeat(eventId)
        const status = claimed ? 'confirmed' : 'waitlisted'

        let registration
        try {
            await team.save()
            registration = await RegistrationModel.create({
                event: eventId, type: 'team', user: req.user.id, team: team._id, status
            })
            if (status === 'confirmed') await issueTicket(registration._id)
        } catch (err) {
            if (claimed) await releaseSeat(eventId)
            throw err
        }

        res.status(201).json({ message: `Team registration ${status}`, registration, team })
    } catch (err) {
        if (err.name === 'ValidationError') return res.status(400).json({ message: err.message })
        res.status(500).json({ message: 'Team registration failed', error: err.message })
    }
})

// DELETE /register-api/:id — cancel (own registration, or as the event's organizer),
// then hand the freed seat to the waitlist
registerApp.delete('/:id', isAuthenticated, async (req, res) => {
    try {
        const registration = await RegistrationModel.findById(req.params.id).populate('event', 'organizer')
        if (!registration) return res.status(404).json({ message: 'Registration not found' })

        const ownsIt = registration.user?.toString() === req.user.id
        if (!ownsIt && !isOwner(registration.event, req.user)) {
            return res.status(403).json({ message: "You can't cancel this registration" })
        }

        // atomic status flip: two simultaneous cancels can't both free a seat
        const before = await RegistrationModel.findOneAndUpdate(
            { _id: registration._id, status: { $ne: 'cancelled' } },
            { status: 'cancelled' },
            { new: false }
        )
        if (!before) return res.status(400).json({ message: 'Already cancelled' })

        if (before.status === 'confirmed') await promoteFromWaitlist(registration.event._id)

        res.json({ message: 'Registration cancelled' })
    } catch (err) {
        res.status(500).json({ message: 'Cancellation failed', error: err.message })
    }
})

// PATCH /register-api/:id/priority — organizer bumps (or lowers) someone's place on the waitlist
registerApp.patch('/:id/priority', isAuthenticated, authorizeRoles('organizer', 'admin'), async (req, res) => {
    try {
        const priorityScore = Number(req.body.priorityScore)
        if (!Number.isFinite(priorityScore)) return res.status(400).json({ message: 'priorityScore must be a number' })

        const registration = await RegistrationModel.findById(req.params.id).populate('event', 'organizer')
        if (!registration) return res.status(404).json({ message: 'Registration not found' })
        if (!isOwner(registration.event, req.user)) return res.status(403).json({ message: 'Not your event' })

        registration.priorityScore = priorityScore
        await registration.save()
        res.json({ message: 'Priority updated', registration })
    } catch (err) {
        res.status(500).json({ message: 'Failed to update priority', error: err.message })
    }
})

// GET /register-api/my — logged-in user's own registrations (individual + teams they lead)
registerApp.get('/my', isAuthenticated, async (req, res) => {
    try {
        const registrations = await RegistrationModel.find({ user: req.user.id })
            .populate('event', 'title startTime endTime venue status')
            .populate('team', 'name')
            .sort({ registeredAt: -1 })
        res.json(registrations)
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch registrations', error: err.message })
    }
})

// GET /register-api/event/:eventId — organizer views registrants for their own event
registerApp.get('/event/:eventId', isAuthenticated, authorizeRoles('organizer', 'admin'), async (req, res) => {
    try {
        const event = await EventModel.findById(req.params.eventId)
        if (!event) return res.status(404).json({ message: 'Event not found' })
        if (!isOwner(event, req.user)) return res.status(403).json({ message: 'Not your event' })

        const registrations = await RegistrationModel.find({ event: req.params.eventId })
            .populate('user', 'name email')
            .populate('team')
            .sort({ registeredAt: 1 })

        res.json(registrations)
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch registrants', error: err.message })
    }
})

import exp from 'express'
import crypto from 'crypto'
import QRCode from 'qrcode'
import { TicketModel } from '../models/TicketModel.js'
import { isAuthenticated } from '../middleware/verifyToken.js'

export const ticketApp = exp.Router()

function sign(ticketId) {
    return crypto.createHmac('sha256', process.env.TICKET_SECRET).update(ticketId).digest('hex')
}

// constant-time compare so response timing can't be used to guess a valid signature
function validSignature(ticketId, signature) {
    if (typeof ticketId !== 'string' || typeof signature !== 'string') return false
    const expected = Buffer.from(sign(ticketId))
    const given = Buffer.from(signature)
    return expected.length === given.length && crypto.timingSafeEqual(expected, given)
}

// called internally after a registration is confirmed — not a public route
export async function issueTicket(registrationId) {
    const ticketId = crypto.randomUUID()
    const signature = sign(ticketId)
    return TicketModel.create({ registration: registrationId, ticketId, signature })
}

// the ticket for a registration, but only if the caller owns that registration
// (for team registrations the owner is the team leader, who holds the one shared QR)
async function findOwnTicket(registrationId, userId) {
    const ticket = await TicketModel.findOne({ registration: registrationId }).populate('registration', 'user')
    if (!ticket) return { status: 404, message: 'No ticket for this registration' }
    if (ticket.registration?.user?.toString() !== userId) return { status: 403, message: 'This is not your ticket' }
    return { ticket }
}

ticketApp.post('/verify', isAuthenticated, async (req, res) => {
    try {
        const { ticketId, signature } = req.body
        if (!validSignature(ticketId, signature)) return res.status(400).json({ message: 'Invalid ticket' })

        const ticket = await TicketModel.findOne({ ticketId }).populate({
            path: 'registration',
            populate: [
                { path: 'user', select: 'name email' },
                { path: 'team' },
                { path: 'event', select: 'organizer checkers title status' }
            ]
        })
        if (!ticket) return res.status(404).json({ message: 'Ticket not found' })

        const { event } = ticket.registration
        const allowed = event.organizer.toString() === req.user.id
            || event.checkers.some(c => c.toString() === req.user.id)
            || req.user.role === 'admin'
        if (!allowed) return res.status(403).json({ message: 'Not authorized to scan for this event' })

        if (event.status !== 'ongoing') {
            return res.status(400).json({ message: 'This event has not started yet' })
        }

        // Atomic check-in: the `checkedIn: false` filter makes the DB pick exactly one winner
        // when two scanners hit the same ticket at once (bad network retry, impatient volunteer).
        const updated = await TicketModel.findOneAndUpdate(
            { ticketId, checkedIn: false },
            { checkedIn: true, checkedInAt: new Date() },
            { new: true }
        )
        if (!updated) {
            const current = await TicketModel.findOne({ ticketId }).select('checkedInAt')
            return res.status(409).json({ message: 'Already checked in', checkedInAt: current?.checkedInAt })
        }

        // only what the scanner needs — not the event's checker list
        const { type, user, team } = ticket.registration
        res.json({
            message: 'Checked in',
            details: { type, user, team, event: { title: event.title } },
            checkedInAt: updated.checkedInAt
        })
    } catch (err) {
        res.status(500).json({ message: 'Verification failed', error: err.message })
    }
})

ticketApp.get('/my/:registrationId', isAuthenticated, async (req, res) => {
    try {
        const found = await findOwnTicket(req.params.registrationId, req.user.id)
        if (!found.ticket) return res.status(found.status).json({ message: found.message })

        const { ticket } = found
        res.json({ ticketId: ticket.ticketId, signature: ticket.signature, checkedIn: ticket.checkedIn })
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch ticket', error: err.message })
    }
})

ticketApp.get('/qr/:registrationId', isAuthenticated, async (req, res) => {
    try {
        const found = await findOwnTicket(req.params.registrationId, req.user.id)
        if (!found.ticket) return res.status(found.status).json({ message: found.message })

        const { ticket } = found
        const payload = JSON.stringify({ ticketId: ticket.ticketId, signature: ticket.signature })
        const qrDataUrl = await QRCode.toDataURL(payload)

        res.json({ qrCode: qrDataUrl, checkedIn: ticket.checkedIn })
    } catch (err) {
        res.status(500).json({ message: 'Failed to generate QR', error: err.message })
    }
})

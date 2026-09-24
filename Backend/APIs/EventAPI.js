import exp from "express"
import { EventModel } from "../models/EventModel.js"
import { UserModel } from "../models/UserModel.js"
import { isAuthenticated, authorizeRoles } from '../middleware/verifyToken.js'
import { isOwner } from '../helpers/ownerCheck.js'
import { escapeRegex } from '../helpers/escapeRegex.js'

// Only these fields may be set from a request body. Everything else (organizer, registeredCount,
// checkers, status) is controlled by the server — otherwise an organizer could POST
// { registeredCount: 0 } and reopen a sold-out event, or reassign someone else's event.
const EDITABLE = ['title', 'description', 'category', 'tags', 'venue', 'city',
    'startTime', 'endTime', 'registrationType', 'teamSize', 'capacity', 'price', 'location']
const pickEditable = (body) =>
    Object.fromEntries(EDITABLE.filter(k => body[k] !== undefined).map(k => [k, body[k]]))

export const eventApp = exp.Router()

eventApp.post(
  "/create",
  isAuthenticated,
  authorizeRoles("organizer", "admin"),
  async (req, res) => {
    try {
      const event = new EventModel({
        ...pickEditable(req.body),
        organizer: req.user.id,
        status: "published",
      })
      await event.save()
      res.status(201).json({ message: "Event Created", event })
    } catch (err) {
      if (err.name === 'ValidationError') return res.status(400).json({ message: err.message })
      res.status(500).json({ message: "Failed to create event", error: err.message })
    }
  },
)

eventApp.get("/all", async (req, res) => {
  try {
    const { category, city, search } = req.query
    const filter = { status: "published" }

    if (category) filter.category = category
    if (city) filter.city = city
    if (search) filter.title = { $regex: escapeRegex(search), $options: "i" }

    const events = await EventModel.find(filter)
      .populate("organizer", "name email")
      .sort({ startTime: 1 })
    res.status(200).json({ events })
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch events", error: err.message })
  }
})

// must stay above /:id or it gets swallowed as a param match
eventApp.get('/organizer/my', isAuthenticated, authorizeRoles('organizer', 'admin'), async (req, res) => {
    try {
        const events = await EventModel.find({ organizer: req.user.id }).sort({ startTime: 1 })
        res.json(events)
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch your events', error: err.message })
    }
})

// must stay above /:id — same reason as /organizer/my
eventApp.get('/nearby', async (req, res) => {
    try {
        const { lat, lng, radiusKm = 15 } = req.query
        if (lat === undefined || lng === undefined) {
            return res.status(400).json({ message: 'lat and lng are required' })
        }

        const events = await EventModel.find({
            status: 'published',
            location: {
                $near: {
                    $geometry: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
                    $maxDistance: Number(radiusKm) * 1000
                }
            }
        }).populate('organizer', 'name email')

        res.json({ events })
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch nearby events', error: err.message })
    }
})

// .ics download — public, so anyone with the event link can add it to their calendar
eventApp.get('/:id/ics', async (req, res) => {
    try {
        const event = await EventModel.findById(req.params.id)
        if (!event) return res.status(404).json({ message: 'Event not found' })

        const fmt = (d) => new Date(d).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
        const escapeText = (s) => String(s).replace(/([,;])/g, '\\$1').replace(/\n/g, '\\n')

        const ics = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//EventForge//EN',
            'BEGIN:VEVENT',
            `UID:${event._id}@eventforge`,
            `DTSTAMP:${fmt(new Date())}`,
            `DTSTART:${fmt(event.startTime)}`,
            `DTEND:${fmt(event.endTime)}`,
            `SUMMARY:${escapeText(event.title)}`,
            `DESCRIPTION:${escapeText(event.description)}`,
            `LOCATION:${escapeText(`${event.venue}, ${event.city}`)}`,
            'END:VEVENT',
            'END:VCALENDAR'
        ].join('\r\n')

        res.setHeader('Content-Type', 'text/calendar')
        res.setHeader('Content-Disposition', `attachment; filename="${event.title.replace(/\s+/g, '_')}.ics"`)
        res.send(ics)
    } catch (err) {
        res.status(500).json({ message: 'Failed to generate calendar file', error: err.message })
    }
})

eventApp.get("/:id", async (req, res) => {
  try {
    const event = await EventModel.findById(req.params.id).populate("organizer", "name email")
    if (!event) return res.status(404).json({ message: "Event not found" })
    res.status(200).json({ event })
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch event", error: err.message })
  }
})

eventApp.put('/:id', isAuthenticated, authorizeRoles('organizer', 'admin'), async (req, res) => {
    try {
        const event = await EventModel.findById(req.params.id)
        if (!event) return res.status(404).json({ message: 'Event not found' })
        if (!isOwner(event, req.user)) return res.status(403).json({ message: 'Not your event' })

        if (req.body.capacity !== undefined && req.body.capacity < event.registeredCount) {
            return res.status(400).json({ message: `Capacity can't be less than ${event.registeredCount} already registered` })
        }

        Object.assign(event, pickEditable(req.body))
        await event.save()
        res.json({ message: 'Event updated', event })
    } catch (err) {
        if (err.name === 'ValidationError') return res.status(400).json({ message: err.message })
        res.status(500).json({ message: 'Failed to update event', error: err.message })
    }
})

eventApp.delete('/:id', isAuthenticated, authorizeRoles('organizer', 'admin'), async (req, res) => {
    try {
        const event = await EventModel.findById(req.params.id)
        if (!event) return res.status(404).json({ message: 'Event not found' })
        if (!isOwner(event, req.user)) return res.status(403).json({ message: 'Not your event' })

        event.status = 'cancelled'
        await event.save()
        res.json({ message: 'Event cancelled' })
    } catch (err) {
        res.status(500).json({ message: 'Failed to cancel event', error: err.message })
    }
})

eventApp.post('/:id/checkers', isAuthenticated, authorizeRoles('organizer', 'admin'), async (req, res) => {
    try {
        const event = await EventModel.findById(req.params.id)
        if (!event) return res.status(404).json({ message: 'Event not found' })
        if (!isOwner(event, req.user)) return res.status(403).json({ message: 'Not your event' })

        const person = await UserModel.findOne({ email: req.body.email.toLowerCase() })
        if (!person) return res.status(404).json({ message: 'No user with that email' })

        if (!event.checkers.includes(person._id)) event.checkers.push(person._id)
        await event.save()

        res.json({ message: `${person.name} can now scan tickets for this event` })
    } catch (err) {
        res.status(500).json({ message: 'Failed to add checker', error: err.message })
    }
})

eventApp.patch('/:id/start', isAuthenticated, authorizeRoles('organizer', 'admin'), async (req, res) => {
    try {
        const event = await EventModel.findById(req.params.id)
        if (!event) return res.status(404).json({ message: 'Event not found' })
        if (!isOwner(event, req.user)) return res.status(403).json({ message: 'Not your event' })

        event.status = 'ongoing'
        await event.save()
        res.json({ message: 'Event started', event })
    } catch (err) {
        res.status(500).json({ message: 'Failed to start event', error: err.message })
    }
})
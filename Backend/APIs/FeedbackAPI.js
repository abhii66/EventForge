import exp from 'express'
import { FeedbackModel } from '../models/FeedbackModel.js'
import { RegistrationModel } from '../models/RegistrationModel.js'
import { EventModel } from '../models/EventModel.js'
import { isAuthenticated } from '../middleware/verifyToken.js'

export const feedbackApp = exp.Router()

feedbackApp.post('/:eventId', isAuthenticated, async (req, res) => {
    try {
        const { eventId } = req.params
        const { rating, comment } = req.body

        const event = await EventModel.findById(eventId).select('endTime')
        if (!event) return res.status(404).json({ message: 'Event not found' })
        if (event.endTime > new Date()) return res.status(400).json({ message: 'You can rate an event once it has ended' })

        const attended = await RegistrationModel.findOne({ event: eventId, user: req.user.id, status: 'confirmed' })
        if (!attended) return res.status(403).json({ message: 'Only confirmed attendees can leave feedback' })

        const feedback = await FeedbackModel.create({ event: eventId, user: req.user.id, rating, comment })
        res.status(201).json({ message: 'Feedback submitted', feedback })
    } catch (err) {
        if (err.code === 11000) return res.status(400).json({ message: 'Already reviewed this event' })
        res.status(500).json({ message: 'Failed to submit feedback', error: err.message })
    }
})

feedbackApp.get('/:eventId', async (req, res) => {
    try {
        const feedback = await FeedbackModel.find({ event: req.params.eventId }).populate('user', 'name')
        res.json(feedback)
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch feedback', error: err.message })
    }
})

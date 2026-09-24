// APIs/AIContentAPI.js
import exp from 'express'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { isAuthenticated, authorizeRoles } from '../middleware/verifyToken.js'

export const aiApp = exp.Router()
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' })

const prompts = {
    description: (d) => `Write a concise, engaging event description (100-150 words) for an event titled "${d.title}", category: ${d.category}. Key details: ${d.details}`,
    bio: (d) => `Write a short professional speaker bio (60-80 words) for ${d.name}, based on these notes: ${d.notes}`,
    announcement: (d) => `Write a short announcement (2-3 sentences) for the event "${d.title}" happening on ${d.date}. Tone: exciting but professional.`,
    summary: (d) => `Write a post-event summary (100 words) for "${d.title}". Attendance: ${d.attendance}. Key feedback themes: ${d.feedback}`
}

aiApp.post('/draft/:type', isAuthenticated, authorizeRoles('organizer', 'admin'), async (req, res) => {
    try {
        const { type } = req.params
        const buildPrompt = prompts[type]
        if (!buildPrompt) return res.status(400).json({ message: 'Invalid draft type' })

        const result = await model.generateContent(buildPrompt(req.body))
        
        res.json({ draft: result.response.text() })
    } catch (err) {
        res.status(500).json({ message: 'Draft generation failed', error: err.message })
    }
})
import exp from 'express'
import jwt from 'jsonwebtoken'
import { UserModel } from '../models/UserModel.js'
import { isAuthenticated } from '../middleware/verifyToken.js'
import { normalizeTags } from '../helpers/tags.js'

export const userApp = exp.Router()

userApp.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body
        if (![name, email, password].every(v => typeof v === 'string' && v.trim())) {
            return res.status(400).json({ message: 'Name, email and password are required' })
        }
        if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' })

        const existing = await UserModel.findOne({ email: email.toLowerCase() })
        if (existing) return res.status(400).json({ message: 'Email already registered' })

        const user = new UserModel({ name, email, password })
        await user.save()

        res.status(201).json({ message: 'Registered successfully' })
    } catch (err) {
        res.status(500).json({ message: 'Registration failed', error: err.message })
    }
})

userApp.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body
        if (typeof email !== 'string' || typeof password !== 'string') {
            return res.status(400).json({ message: 'Email and password are required' })
        }
        const user = await UserModel.findOne({ email: email.toLowerCase() })
        if (!user) return res.status(401).json({ message: 'Invalid credentials' })

        const isMatch = await user.matchPassword(password)
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' })

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        )

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        })

        res.json({ message: 'Logged in', user: { id: user._id, name: user.name, role: user.role } })
    } catch (err) {
        res.status(500).json({ message: 'Login failed', error: err.message })
    }
})

// same shape as the login response ({ id, name, role }) so the frontend sees one consistent user object
userApp.get('/me', isAuthenticated, async (req, res) => {
    try {
        const user = await UserModel.findById(req.user.id).select('-password')
        if (!user) return res.status(401).json({ message: 'User no longer exists' })
        res.json({ id: user._id, name: user.name, email: user.email, role: user.role, interests: user.interests })
    } catch (err) {
        res.status(500).json({ message: 'Failed to load user', error: err.message })
    }
})

userApp.post('/logout', (req, res) => {
    res.clearCookie('token')
    res.json({ message: 'Logged out' })
})

userApp.patch('/become-organizer', isAuthenticated, async (req, res) => {
    try {
        const user = await UserModel.findByIdAndUpdate(req.user.id, { role: 'organizer' }, { new: true })

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' })
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        })

        res.json({ message: 'You can now host events', user: { id: user._id, name: user.name, role: user.role } })
    } catch (err) {
        res.status(500).json({ message: 'Failed to update role', error: err.message })
    }
})

userApp.patch('/interests', isAuthenticated, async (req, res) => {
    try {
        const interests = normalizeTags(req.body.interests)
        const user = await UserModel.findByIdAndUpdate(req.user.id, { interests }, { new: true })
        if (!user) return res.status(404).json({ message: 'User not found' })
        res.json({ message: 'Interests saved', interests: user.interests })
    } catch (err) {
        res.status(500).json({ message: 'Failed to save interests', error: err.message })
    }
})

// src/pages/Register.jsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await register(form.name, form.email, form.password)
      navigate('/login')
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-6">
      <div className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-[0_12px_30px_rgba(27,31,28,.08)]">
        <div className="text-xs font-semibold text-amber mb-2">EVENTFORGE</div>
        <h1 className="font-display font-bold text-3xl mb-6">Create account</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {['name', 'email', 'password'].map(field => (
            <input
              key={field}
              type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'}
              placeholder={field === 'password' ? 'Min 6 characters' : field[0].toUpperCase() + field.slice(1)}
              value={form[field]}
              onChange={e => setForm({ ...form, [field]: e.target.value })}
              className="w-full border border-ink/15 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-teal"
            />
          ))}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="w-full bg-ink text-white rounded-lg py-2.5 font-semibold text-sm">Sign up</button>
        </form>

        <p className="text-sm text-ink/60 mt-5 text-center">
          Already have an account? <Link to="/login" className="text-teal font-semibold">Log in</Link>
        </p>
      </div>
    </div>
  )
}
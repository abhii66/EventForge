// src/pages/Login.jsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-6">
      <div className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-[0_12px_30px_rgba(27,31,28,.08)]">
        <div className="text-xs font-semibold text-amber mb-2">EVENTFORGE</div>
        <h1 className="font-display font-bold text-3xl mb-6">Sign in</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email" placeholder="you@email.com" value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full border border-ink/15 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-teal"
          />
          <input
            type="password" placeholder="Min 6 characters" value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full border border-ink/15 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-teal"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="w-full bg-ink text-white rounded-lg py-2.5 font-semibold text-sm">Log in</button>
        </form>

        <p className="text-sm text-ink/60 mt-5 text-center">
          New here? <Link to="/register" className="text-teal font-semibold">Create account</Link>
        </p>
      </div>
    </div>
  )
}
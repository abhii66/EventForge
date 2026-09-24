// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/axios'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/user-api/me').then(res => setUser(res.data)).catch(() => setUser(null)).finally(() => setLoading(false))
  }, [])

  const login = async (email, password) => {
    const res = await api.post('/user-api/login', { email, password })
    setUser(res.data.user)
    return res.data
  }

  const register = async (name, email, password) => {
    return api.post('/user-api/register', { name, email, password })
  }

  const logout = async () => {
    await api.post('/user-api/logout')
    setUser(null)
  }

  const becomeOrganizer = async () => {
    const res = await api.patch('/user-api/become-organizer')
    setUser(res.data.user)
    return res.data
}

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, becomeOrganizer }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
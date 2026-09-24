import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function NavBar() {
  const { user, logout } = useAuth()

  return (
    <nav className="flex justify-between items-center max-w-6xl mx-auto px-10 py-6">
      <Link to="/" className="flex items-center gap-2 font-bold text-lg">
        <span className="w-7 h-7 rounded-lg bg-ink flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5">
            <path d="M4 12h16M4 12l6-6M4 12l6 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
        Event<span className="text-teal">Forge</span>
      </Link>
      <div className="flex items-center gap-4 text-sm">
        {!user && <><Link to="/login">Sign in</Link><Link to="/register" className="bg-ink text-white px-5 py-2.5 rounded-lg font-semibold">Get started</Link></>}
        {user && <Link to="/dashboard">My tickets</Link>}
        {user && <Link to="/organizer/scan">Scan</Link>}
        {(user?.role === 'organizer' || user?.role === 'admin') && <Link to="/organizer">Dashboard</Link>}
        {user && <button onClick={logout} className="text-ink/60">Log out</button>}
      </div>
    </nav>
  )
}

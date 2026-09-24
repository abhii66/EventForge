import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Hero() {
  const { user, becomeOrganizer } = useAuth()
  const navigate = useNavigate()

  const handleHost = async () => {
    if (!user) return navigate('/register')
    if (user.role === 'organizer') return navigate('/organizer/create')
    await becomeOrganizer()
    navigate('/organizer/create')
  }

  return (
    <section className="relative max-w-6xl mx-auto px-10 pt-10 pb-24 overflow-hidden">
      <div className="absolute w-80 h-80 rounded-full bg-teal/20 blur-xl -top-10 right-16 -z-10" />
      <div className="absolute w-64 h-64 rounded-full bg-amber/20 blur-xl bottom-0 -left-16 -z-10" />

      <div className="flex items-center gap-2 text-xs font-semibold text-amber mb-4">
        <span className="w-1.5 h-1.5 rounded-full bg-amber" /> THE EVENT ECOSYSTEM
      </div>

      <h1 className="font-display font-black text-6xl leading-[1.03] max-w-xl">
        Skip the queue.<br />Own the <span className="text-teal">moment.</span>
      </h1>

      <p className="text-ink/60 max-w-md mt-5 leading-relaxed">
        Discover events worth showing up for, register in seconds, and walk in with a scan.
      </p>

      <div className="flex gap-3.5 mt-7">
        <a href="#events" className="bg-ink text-white px-5 py-2.5 rounded-lg font-semibold text-sm">Find an event →</a>
        <button onClick={handleHost} className="bg-white border border-ink/15 px-5 py-2.5 rounded-lg font-semibold text-sm">
          Host an event
        </button>
      </div>
    </section>
  )
}
// src/pages/OrganizerDashboard.jsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import NavBar from '../components/NavBar'

export default function OrganizerDashboard() {
  const [events, setEvents] = useState([])

  useEffect(() => {
    api.get('/event-api/organizer/my').then(res => setEvents(res.data))
  }, [])

  return (
    <>
      <NavBar />
      <div className="max-w-6xl mx-auto px-10 pb-24">
        <div className="flex justify-between items-center mb-8">
          <h1 className="font-display font-bold text-3xl">Your events</h1>
          <Link to="/organizer/create" className="bg-ink text-white px-5 py-2.5 rounded-lg font-semibold text-sm">
            + Create event
          </Link>
        </div>

        <div className="space-y-3">
          {events.map(e => (
            <Link key={e._id} to={`/organizer/events/${e._id}`}
              className="flex justify-between items-center bg-white rounded-xl p-5 shadow-[0_8px_20px_rgba(27,31,28,.06)]">
              <div>
                <h3 className="font-display font-bold text-lg">{e.title}</h3>
                <p className="text-sm text-ink/60">{new Date(e.startTime).toLocaleDateString()} · {e.venue}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{e.registeredCount}/{e.capacity}</p>
                <p className="text-xs text-ink/50 capitalize">{e.status}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}
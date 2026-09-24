// src/components/EventCard.jsx
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function EventCard({ event }) {
  const { user } = useAuth()
  const full = event.registeredCount >= event.capacity
  const ownerId = event.organizer?._id || event.organizer
  const isOwner = user && ownerId === user.id
  const href = isOwner ? `/organizer/events/${event._id}` : `/events/${event._id}`

  return (
    <Link to={href} className="bg-white rounded-2xl p-5 shadow-[0_12px_30px_rgba(27,31,28,.08)] block">
      <div className="flex justify-between items-start mb-3">
        <span className="text-xs font-semibold text-teal">{event.category}</span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
          full ? 'bg-ink/10 text-ink/50' : 'bg-amber/15 text-amber'
        }`}>{full ? 'Sold out' : `${event.capacity - event.registeredCount} left`}</span>
      </div>
      <h3 className="font-display font-bold text-xl mb-1">{event.title}</h3>
      <p className="text-sm text-ink/60">{new Date(event.startTime).toLocaleString()} · {event.venue}</p>
    </Link>
  )
}
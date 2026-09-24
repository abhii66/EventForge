import { useEffect, useState } from 'react'
import api from '../api/axios'
import EventCard from './EventCard'
import { useAuth } from '../context/AuthContext'

export default function RecommendedEvents() {
  const { user } = useAuth()
  const [events, setEvents] = useState([])

  useEffect(() => {
    if (!user) return
    api.get('/recommend-api/my').then(res => setEvents(res.data)).catch(() => setEvents([]))
  }, [user])

  if (!user || !events.length) return null

  return (
    <section className="max-w-6xl mx-auto px-10 pb-4">
      <h2 className="font-display font-bold text-2xl mb-5">Picked for you</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {events.map(e => (
          <div key={e._id}>
            <EventCard event={e} />
            {e.matchedOn?.length > 0 && (
              <p className="text-xs text-ink/50 mt-2 px-1">Because you like {e.matchedOn.join(', ')}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

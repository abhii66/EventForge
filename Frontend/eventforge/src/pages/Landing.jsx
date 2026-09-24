// src/pages/Landing.jsx — updated to support the near-me override
import { useEffect, useState } from 'react'
import NavBar from '../components/NavBar'
import Hero from '../components/Hero'
import EventCard from '../components/EventCard'
import RecommendedEvents from '../components/RecommendedEvents'
import NearMeButton from '../components/NearMeButton'
import api from '../api/axios'

export default function Landing() {
  const [events, setEvents] = useState([])
  const [heading, setHeading] = useState('All events')

  useEffect(() => {
    api.get('/event-api/all').then(res => setEvents(res.data.events)).catch(() => setEvents([]))
  }, [])

  return (
    <>
      <NavBar />
      <Hero />
      <RecommendedEvents />
      <section id="events" className="max-w-6xl mx-auto px-10 pb-6 flex justify-between items-center">
        <h2 className="font-display font-bold text-2xl">{heading}</h2>
        <NearMeButton onResults={(evts) => { setEvents(evts); setHeading('Near you') }} />
      </section>
      <section className="max-w-6xl mx-auto px-10 pb-24 grid grid-cols-1 md:grid-cols-3 gap-5">
        {events.map(e => <EventCard key={e._id} event={e} />)}
      </section>
    </>
  )
}
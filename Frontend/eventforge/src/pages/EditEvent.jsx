import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import NavBar from '../components/NavBar'

const inputClass = "w-full border border-ink/15 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-teal"

const toLocalInput = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

export default function EditEvent() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/event-api/${id}`).then(res => {
      const e = res.data.event
      setForm({
        title: e.title, description: e.description, category: e.category,
        venue: e.venue, city: e.city,
        startTime: toLocalInput(e.startTime), endTime: toLocalInput(e.endTime),
        capacity: e.capacity, registrationType: e.registrationType,
        teamMin: e.teamSize?.min ?? 1, teamMax: e.teamSize?.max ?? 1
      })
    })
  }, [id])

  if (!form) return null

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.put(`/event-api/${id}`, {
        ...form,
        capacity: Number(form.capacity),
        teamSize: { min: Number(form.teamMin) || 1, max: Number(form.teamMax) || 1 }
      })
      navigate(`/organizer/events/${id}`)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update event')
    }
  }

  const cancelEvent = async () => {
    if (!confirm('Cancel this event? Registered participants will still see their tickets, but the event drops off discovery.')) return
    try {
      await api.delete(`/event-api/${id}`)
      navigate('/organizer')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel event')
    }
  }

  return (
    <>
      <NavBar />
      <div className="max-w-lg mx-auto px-10 pb-24">
        <div className="flex justify-between items-center mb-6">
          <h1 className="font-display font-bold text-3xl">Edit event</h1>
          <button onClick={cancelEvent} className="text-sm text-red-500 font-semibold">Cancel event</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input placeholder="Title" value={form.title} onChange={set('title')} className={inputClass} />
          <textarea placeholder="Description" value={form.description} onChange={set('description')} className={inputClass} rows={4} />
          <input placeholder="Category" value={form.category} onChange={set('category')} className={inputClass} />

          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Venue" value={form.venue} onChange={set('venue')} className={inputClass} />
            <input placeholder="City" value={form.city} onChange={set('city')} className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input type="datetime-local" value={form.startTime} onChange={set('startTime')} className={inputClass} />
            <input type="datetime-local" value={form.endTime} onChange={set('endTime')} className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input type="number" placeholder="Capacity" value={form.capacity} onChange={set('capacity')} className={inputClass} />
            <select value={form.registrationType} onChange={set('registrationType')} className={inputClass} disabled>
              <option value="individual">Individual</option>
              <option value="team">Team</option>
            </select>
          </div>

          {form.registrationType === 'team' && (
            <div className="grid grid-cols-2 gap-3">
              <input type="number" placeholder="Min team size" value={form.teamMin} onChange={set('teamMin')} className={inputClass} />
              <input type="number" placeholder="Max team size" value={form.teamMax} onChange={set('teamMax')} className={inputClass} />
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="w-full bg-ink text-white rounded-lg py-2.5 font-semibold text-sm">Save changes</button>
        </form>
      </div>
    </>
  )
}
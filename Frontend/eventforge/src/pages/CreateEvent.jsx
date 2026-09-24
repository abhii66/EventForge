import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import NavBar from '../components/NavBar'
import AIDraftButton from '../components/AIDraftButton'

const inputClass = "w-full border border-ink/15 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-teal"

export default function CreateEvent() {
  const [form, setForm] = useState({
    title: '', description: '', category: '', tags: '', venue: '', city: '',
    startTime: '', endTime: '', capacity: '', registrationType: 'individual',
    teamMin: '', teamMax: ''
  })
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.post('/event-api/create', {
        ...form,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        capacity: Number(form.capacity),
        teamSize: { min: Number(form.teamMin) || 1, max: Number(form.teamMax) || 1 }
      })
      navigate('/organizer')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create event')
    }
  }

  return (
    <>
      <NavBar />
      <div className="max-w-lg mx-auto px-10 pb-24">
        <h1 className="font-display font-bold text-3xl mb-6">Create event</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input placeholder="Title" value={form.title} onChange={set('title')} className={inputClass} />

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs text-ink/50">Description</label>
              <AIDraftButton
                type="description"
                payload={{ title: form.title, category: form.category, details: form.description }}
                onDraft={(draft) => draft && setForm(f => ({ ...f, description: draft }))}
              />
            </div>
            <textarea value={form.description} onChange={set('description')} className={inputClass} rows={4} />
          </div>

          <input placeholder="Category" value={form.category} onChange={set('category')} className={inputClass} />
          <input placeholder="Tags, comma-separated (e.g. music, outdoor)" value={form.tags} onChange={set('tags')} className={inputClass} />

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
            <select value={form.registrationType} onChange={set('registrationType')} className={inputClass}>
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
          <button className="w-full bg-ink text-white rounded-lg py-2.5 font-semibold text-sm">Publish event</button>
        </form>
      </div>
    </>
  )
}

import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../api/axios'
import NavBar from '../components/NavBar'
import FeedbackForm from '../components/FeedbackForm'
import { useAuth } from '../context/AuthContext'

export default function EventDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [event, setEvent] = useState(null)
  const [teamName, setTeamName] = useState('')
  const [members, setMembers] = useState([{ name: '', email: '' }])
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.get(`/event-api/${id}`).then(res => setEvent(res.data.event))
  }, [id])

  if (!event) return null
  if (!event.startTime || !event.capacity) {
    return <p className="text-center py-20 text-ink/50">This event's data looks incomplete.</p>
  }

  const full = event.registeredCount >= event.capacity
  const isPast = new Date(event.endTime) < new Date()

  const registerIndividual = async () => {
    if (busy) return
    setBusy(true)
    try {
      const res = await api.post(`/register-api/${id}`)
      setMsg(res.data.message)
    } catch (err) {
      setMsg(err.response?.data?.message || 'Registration failed')
    } finally {
      setBusy(false)
    }
  }

  const registerTeam = async () => {
    if (busy) return
    setBusy(true)
    try {
      const res = await api.post(`/register-api/team/${id}`, { teamName, members })
      setMsg(res.data.message)
    } catch (err) {
      setMsg(err.response?.data?.message || 'Registration failed')
    } finally {
      setBusy(false)
    }
  }

  const updateMember = (i, field, value) => {
    setMembers(members.map((m, j) => j === i ? { ...m, [field]: value } : m))
  }

  return (
    <>
      <NavBar />
      <div className="max-w-2xl mx-auto px-10 pb-24">
        <span className="text-xs font-semibold text-teal">{event.category}</span>
        <h1 className="font-display font-bold text-4xl mt-2 mb-3">{event.title}</h1>
        <p className="text-ink/60 mb-1">{new Date(event.startTime).toLocaleString()} · {event.venue}, {event.city}</p>
        {event.tags?.length > 0 && <p className="text-xs text-ink/50 mb-1">{event.tags.map(t => `#${t}`).join(' ')}</p>}
        <p className="text-sm font-semibold mb-6">{full ? 'Sold out' : `${event.capacity - event.registeredCount} seats left`}</p>
        <p className="text-ink/80 leading-relaxed mb-8">{event.description}</p>

        {!user ? (
          <p className="text-sm text-ink/60">Sign in to register.</p>
        ) : isPast ? (
          <FeedbackForm eventId={id} />
        ) : event.registrationType === 'individual' ? (
          <button onClick={registerIndividual} disabled={busy} className="bg-ink text-white px-6 py-3 rounded-lg font-semibold text-sm disabled:opacity-40">
            {full ? 'Join waitlist' : 'Register'}
          </button>
        ) : (
          <div className="bg-white rounded-2xl p-6 shadow-[0_12px_30px_rgba(27,31,28,.08)] space-y-3">
            <h3 className="font-display font-bold text-lg">Register your team</h3>
            <p className="text-xs text-ink/50">{event.teamSize?.min ?? 1}–{event.teamSize?.max ?? 1} members (you're the leader)</p>
            <input placeholder="Team name" value={teamName} onChange={e => setTeamName(e.target.value)}
              className="w-full border border-ink/15 rounded-lg px-4 py-2 text-sm" />
            {members.map((m, i) => (
              <div key={i} className="grid grid-cols-2 gap-2">
                <input placeholder="Member name" value={m.name} onChange={e => updateMember(i, 'name', e.target.value)}
                  className="border border-ink/15 rounded-lg px-3 py-2 text-sm" />
                <input placeholder="Member email" value={m.email} onChange={e => updateMember(i, 'email', e.target.value)}
                  className="border border-ink/15 rounded-lg px-3 py-2 text-sm" />
              </div>
            ))}
            <button type="button" onClick={() => setMembers([...members, { name: '', email: '' }])}
              className="text-sm text-teal font-semibold">+ Add member</button>
            <button onClick={registerTeam} disabled={busy} className="w-full bg-ink text-white rounded-lg py-2.5 font-semibold text-sm disabled:opacity-40">
              {full ? 'Join waitlist' : 'Register team'}
            </button>
          </div>
        )}

        {msg && <p className="text-sm mt-4">{msg}</p>}
      </div>
    </>
  )
}

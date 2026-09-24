import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../api/axios'
import NavBar from '../components/NavBar'

export default function EventRegistrants() {
  const { id } = useParams()
  const [event, setEvent] = useState(null)
  const [registrations, setRegistrations] = useState([])
  const [checkerEmail, setCheckerEmail] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    api.get(`/event-api/${id}`).then(res => setEvent(res.data.event))
    api.get(`/register-api/event/${id}`).then(res => setRegistrations(res.data))
  }, [id])

  const addChecker = async () => {
    try {
      const res = await api.post(`/event-api/${id}/checkers`, { email: checkerEmail })
      setMsg(res.data.message)
      setCheckerEmail('')
    } catch (err) {
      setMsg(err.response?.data?.message || 'Failed to add checker')
    }
  }

  const togglePriority = async (r) => {
    const priorityScore = r.priorityScore > 0 ? 0 : 1
    try {
      await api.patch(`/register-api/${r._id}/priority`, { priorityScore })
      setRegistrations(rs => rs.map(x => x._id === r._id ? { ...x, priorityScore } : x))
    } catch (err) {
      setMsg(err.response?.data?.message || 'Failed to update priority')
    }
  }

  const startEvent = async () => {
    const res = await api.patch(`/event-api/${id}/start`)
    setEvent(res.data.event)
  }

  return (
    <>
      <NavBar />
      <div className="max-w-3xl mx-auto px-10 pb-24">
        <div className="flex justify-between items-center mb-8">
          <h1 className="font-display font-bold text-3xl">Registrants</h1>
          <div className="flex gap-3">
            {event?.status === 'published' && (
              <button onClick={startEvent} className="bg-teal text-white px-5 py-2.5 rounded-lg font-semibold text-sm">
                Start event
              </button>
            )}
            <Link to="/organizer/scan" className="bg-ink text-white px-5 py-2.5 rounded-lg font-semibold text-sm">
              Scan tickets
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-[0_8px_20px_rgba(27,31,28,.06)] mb-8">
          <h3 className="font-display font-bold text-lg mb-1">Add a ticket checker</h3>
          <p className="text-xs text-ink/50 mb-3">Give someone (a volunteer, a friend) access to scan tickets for this event only.</p>
          <div className="flex gap-2">
            <input placeholder="Their email" value={checkerEmail} onChange={e => setCheckerEmail(e.target.value)}
              className="flex-1 border border-ink/15 rounded-lg px-4 py-2 text-sm" />
            <button onClick={addChecker} className="bg-ink text-white px-4 py-2 rounded-lg text-sm font-semibold">Add</button>
          </div>
          {msg && <p className="text-xs mt-2 text-teal">{msg}</p>}
        </div>

        <div className="space-y-3">
          {registrations.map(r => (
            <div key={r._id} className="flex justify-between items-center bg-white rounded-xl p-5 shadow-[0_8px_20px_rgba(27,31,28,.06)]">
              <div>
                <h3 className="font-display font-bold text-lg">{r.type === 'team' ? r.team?.name : r.user?.name}</h3>
                <p className="text-sm text-ink/60">{r.type === 'team' ? `${(r.team?.members?.length || 0) + 1} members` : r.user?.email}</p>
              </div>
              <div className="flex items-center gap-3">
                {r.status === 'waitlisted' && (
                  <button onClick={() => togglePriority(r)} className="text-xs font-semibold text-ink/60 underline">
                    {r.priorityScore > 0 ? 'Prioritised ✓' : 'Prioritise'}
                  </button>
                )}
                <span className={`text-xs font-semibold ${
                  r.status === 'confirmed' ? 'text-teal' : r.status === 'waitlisted' ? 'text-amber' : 'text-ink/40'
                }`}>{r.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

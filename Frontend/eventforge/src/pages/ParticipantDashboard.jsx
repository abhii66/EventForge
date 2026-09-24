import { useEffect, useState } from 'react'
import api from '../api/axios'
import NavBar from '../components/NavBar'
import TicketQR from '../components/TicketQR'

export default function ParticipantDashboard() {
  const [registrations, setRegistrations] = useState([])
  const [openId, setOpenId] = useState(null)

  useEffect(() => {
    api.get('/register-api/my').then(res => setRegistrations(res.data))
  }, [])

  const [error, setError] = useState('')
  const [interests, setInterests] = useState('')
  const [interestsMsg, setInterestsMsg] = useState('')

  useEffect(() => {
    api.get('/user-api/me').then(res => setInterests((res.data.interests || []).join(', '))).catch(() => {})
  }, [])

  const saveInterests = async () => {
    try {
      const res = await api.patch('/user-api/interests', { interests })
      setInterests(res.data.interests.join(', '))
      setInterestsMsg('Saved — your recommendations will use these.')
    } catch (err) {
      setInterestsMsg(err.response?.data?.message || 'Could not save')
    }
  }

  const cancel = async (id) => {
    try {
      await api.delete(`/register-api/${id}`)
      setRegistrations(reg => reg.map(r => r._id === id ? { ...r, status: 'cancelled' } : r))
      setError('')
    } catch (err) {
      setError(err.response?.data?.message || 'Could not cancel')
    }
  }

  return (
    <>
      <NavBar />
      <div className="max-w-2xl mx-auto px-10 pb-24">
        <h1 className="font-display font-bold text-3xl mb-8">Your registrations</h1>
        <div className="bg-white rounded-xl p-5 shadow-[0_8px_20px_rgba(27,31,28,.06)] mb-8">
          <h3 className="font-display font-bold text-lg mb-1">Your interests</h3>
          <p className="text-xs text-ink/50 mb-3">Topics you like, comma-separated. They shape the "Picked for you" list.</p>
          <div className="flex gap-2">
            <input placeholder="e.g. music, hackathon, running" value={interests} onChange={e => setInterests(e.target.value)}
              className="flex-1 border border-ink/15 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-teal" />
            <button onClick={saveInterests} className="bg-ink text-white px-4 py-2 rounded-lg text-sm font-semibold">Save</button>
          </div>
          {interestsMsg && <p className="text-xs mt-2 text-teal">{interestsMsg}</p>}
        </div>

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        <div className="space-y-3">
          {registrations.map(r => (
            <div key={r._id} className="bg-white rounded-xl p-5 shadow-[0_8px_20px_rgba(27,31,28,.06)]">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-display font-bold text-lg">{r.event?.title}{r.team?.name && <span className="text-ink/40 font-normal text-sm"> · team {r.team.name}</span>}</h3>
                  <p className="text-sm text-ink/60">{r.event?.startTime && new Date(r.event.startTime).toLocaleString()} · {r.event?.venue}</p>
                  <span className={`text-xs font-semibold ${
                    r.status === 'confirmed' ? 'text-teal' : r.status === 'waitlisted' ? 'text-amber' : 'text-ink/40'
                  }`}>{r.status}</span>
                </div>
                <div className="flex gap-3 items-center">
                  {r.status === 'confirmed' && (
                    <button onClick={() => setOpenId(openId === r._id ? null : r._id)} className="text-sm text-teal font-semibold">
                      {openId === r._id ? 'Hide QR' : 'Show QR'}
                    </button>
                  )}
                  {r.status !== 'cancelled' && (
                    <button onClick={() => cancel(r._id)} className="text-sm text-red-500 font-semibold">Cancel</button>
                  )}
                </div>
              </div>
              {openId === r._id && (
                <div className="mt-4 pt-4 border-t border-ink/10">
                  <TicketQR registrationId={r._id} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

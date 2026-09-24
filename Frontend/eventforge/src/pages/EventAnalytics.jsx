import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../api/axios'
import NavBar from '../components/NavBar'

export default function EventAnalytics() {
  const { id } = useParams()
  const [data, setData] = useState(null)

  useEffect(() => {
    api.get(`/register-api/event/${id}/analytics`).then(res => setData(res.data))
  }, [id])

  if (!data) return null

  const stat = (label, value) => (
    <div className="bg-white rounded-xl p-5 shadow-[0_8px_20px_rgba(27,31,28,.06)]">
      <p className="text-xs text-ink/50 mb-1">{label}</p>
      <p className="font-display font-bold text-2xl">{value}</p>
    </div>
  )

  return (
    <>
      <NavBar />
      <div className="max-w-3xl mx-auto px-10 pb-24">
        <h1 className="font-display font-bold text-3xl mb-8">Analytics</h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stat('Confirmed', data.confirmed)}
          {stat('Waitlisted', data.waitlisted)}
          {stat('Cancelled', data.cancelled)}
          {stat('Capacity filled', `${data.utilization}%`)}
        </div>

        <div className="bg-white rounded-xl p-5 shadow-[0_8px_20px_rgba(27,31,28,.06)]">
          <h3 className="font-display font-bold text-lg mb-4">Signups over time</h3>
          {data.dailySignups.length === 0 ? (
            <p className="text-sm text-ink/50">No registrations yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.dailySignups}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#0F6B52" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </>
  )
}
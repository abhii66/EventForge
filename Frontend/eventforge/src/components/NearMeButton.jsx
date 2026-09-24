import { useState } from 'react'
import api from '../api/axios'

export default function NearMeButton({ onResults }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const findNearby = () => {
    setLoading(true)
    setError('')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await api.get('/event-api/nearby', {
            params: { lat: pos.coords.latitude, lng: pos.coords.longitude }
          })
          onResults(res.data.events)
        } catch {
          setError('Failed to fetch nearby events')
        } finally {
          setLoading(false)
        }
      },
      () => { setError('Location permission denied'); setLoading(false) }
    )
  }

  return (
    <div>
      <button onClick={findNearby} disabled={loading}
        className="text-sm font-semibold text-teal disabled:opacity-40">
        {loading ? 'Finding events near you…' : '📍 Events near me'}
      </button>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
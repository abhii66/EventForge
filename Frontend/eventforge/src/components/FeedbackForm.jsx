// src/components/FeedbackForm.jsx
import { useState } from 'react'
import api from '../api/axios'

export default function FeedbackForm({ eventId }) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    try {
      await api.post(`/feedback-api/${eventId}`, { rating, comment })
      setDone(true)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit')
    }
  }

  if (done) return <p className="text-sm text-teal font-semibold">Thanks for the feedback!</p>

  return (
    <div className="bg-white rounded-2xl p-6 shadow-[0_12px_30px_rgba(27,31,28,.08)] space-y-3">
      <h3 className="font-display font-bold text-lg">Rate this event</h3>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} onClick={() => setRating(n)}
            className={`text-2xl ${n <= rating ? 'text-amber' : 'text-ink/20'}`}>★</button>
        ))}
      </div>
      <textarea placeholder="Any thoughts? (optional)" value={comment} onChange={e => setComment(e.target.value)}
        className="w-full border border-ink/15 rounded-lg px-4 py-2.5 text-sm" rows={3} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button onClick={submit} disabled={!rating} className="bg-ink text-white px-5 py-2.5 rounded-lg font-semibold text-sm disabled:opacity-40">
        Submit
      </button>
    </div>
  )
}
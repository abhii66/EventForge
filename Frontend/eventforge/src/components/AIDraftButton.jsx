// src/components/AIDraftButton.jsx — reusable "Generate draft" for any text field
import { useState } from 'react'
import api from '../api/axios'

export default function AIDraftButton({ type, payload, onDraft }) {
  const [loading, setLoading] = useState(false)

  const generate = async () => {
    setLoading(true)
    try {
      const res = await api.post(`/ai-api/draft/${type}`, payload)
      onDraft(res.data.draft)
    } catch {
      onDraft('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button type="button" onClick={generate} disabled={loading}
      className="text-xs font-semibold text-teal disabled:opacity-40">
      {loading ? 'Generating…' : '✦ Generate with AI'}
    </button>
  )
}
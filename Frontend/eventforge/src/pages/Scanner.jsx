import { useRef, useState } from 'react'
import { Scanner } from '@yudiel/react-qr-scanner'
import api from '../api/axios'
import NavBar from '../components/NavBar'

const COOLDOWN_MS = 2500

export default function ScannerPage() {
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  // the scanner fires onScan on every frame while a code is visible — ignore repeats
  // so a successful check-in isn't immediately overwritten by "Already checked in"
  const busy = useRef(false)

  const handleScan = async (codes) => {
    if (busy.current || !codes.length) return
    busy.current = true
    try {
      const { ticketId, signature } = JSON.parse(codes[0].rawValue)
      const res = await api.post('/ticket-api/verify', { ticketId, signature })
      setResult(res.data.details)
      setError('')
    } catch (err) {
      const data = err.response?.data
      const when = data?.checkedInAt ? ` at ${new Date(data.checkedInAt).toLocaleTimeString()}` : ''
      setError((data?.message || 'Invalid QR') + when)
      setResult(null)
    } finally {
      setTimeout(() => { busy.current = false }, COOLDOWN_MS)
    }
  }

  const isTeam = result?.type === 'team'

  return (
    <>
      <NavBar />
      <div className="max-w-md mx-auto px-10 pb-24">
        <h1 className="font-display font-bold text-3xl mb-6">Scan tickets</h1>
        <div className="rounded-2xl overflow-hidden mb-6">
          <Scanner onScan={handleScan} />
        </div>

        {error && <p className="text-sm text-red-600 font-semibold">{error}</p>}
        {result && (
          <div className="bg-white rounded-xl p-5 shadow-[0_8px_20px_rgba(27,31,28,.06)]">
            <p className="text-sm text-teal font-semibold mb-1">Checked in ✓ · {result.event?.title}</p>
            <p className="font-display font-bold text-lg">{isTeam ? result.team?.name : result.user?.name}</p>
            {!isTeam && <p className="text-sm text-ink/60">{result.user?.email}</p>}
            {isTeam && (
              <ul className="mt-2 text-sm text-ink/70 space-y-0.5">
                <li>{result.user?.name} <span className="text-ink/40">(leader)</span></li>
                {result.team?.members?.map((m, i) => <li key={i}>{m.name}</li>)}
              </ul>
            )}
          </div>
        )}
      </div>
    </>
  )
}

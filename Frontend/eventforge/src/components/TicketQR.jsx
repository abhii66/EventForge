// src/components/TicketQR.jsx
import { useEffect, useState } from 'react'
import api from '../api/axios'

export default function TicketQR({ registrationId }) {
  const [qr, setQr] = useState(null)
  const [checkedIn, setCheckedIn] = useState(false)

  useEffect(() => {
    api.get(`/ticket-api/qr/${registrationId}`).then(res => {
      setQr(res.data.qrCode)
      setCheckedIn(res.data.checkedIn)
    }).catch(() => {})
  }, [registrationId])

  if (!qr) return null

  return (
    <div className="flex flex-col items-center gap-2">
      <img src={qr} alt="Ticket QR" className="w-32 h-32" />
      <span className={`text-xs font-semibold ${checkedIn ? 'text-teal' : 'text-ink/50'}`}>
        {checkedIn ? 'Checked in' : 'Not checked in yet'}
      </span>
    </div>
  )
}
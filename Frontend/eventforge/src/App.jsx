// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import EventDetail from './pages/EventDetail'
import OrganizerDashboard from './pages/OrganizerDashboard'
import CreateEvent from './pages/CreateEvent'
import EventRegistrants from './pages/EventRegistrants'
import ParticipantDashboard from './pages/ParticipantDashboard'
import ScannerPage from './pages/Scanner'
import EditEvent from './pages/EditEvent'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/dashboard" element={<ProtectedRoute><ParticipantDashboard /></ProtectedRoute>} />
          <Route path="/organizer" element={<ProtectedRoute role="organizer"><OrganizerDashboard /></ProtectedRoute>} />
          <Route path="/organizer/create" element={<ProtectedRoute role="organizer"><CreateEvent /></ProtectedRoute>} />
          <Route path="/organizer/events/:id" element={<ProtectedRoute role="organizer"><EventRegistrants /></ProtectedRoute>} />
          <Route path="/organizer/scan" element={<ProtectedRoute><ScannerPage /></ProtectedRoute>} />
          <Route path="/organizer/events/:id/edit" element={<ProtectedRoute role="organizer"><EditEvent /></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
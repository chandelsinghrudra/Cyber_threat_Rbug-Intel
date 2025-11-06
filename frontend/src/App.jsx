// frontend/src/App.jsx
import React, { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import ReportForm from './components/ReportForm.jsx'
import AdminDashboard from './components/AdminDashboard.jsx'

const socket = io('http://localhost:4000', { transports: ['websocket'] })

export default function App() {
  const [route, setRoute] = useState(window.location.pathname)

  useEffect(() => {
    const onPop = () => setRoute(window.location.pathname)
    window.addEventListener('popstate', onPop)
    socket.on('hello', (msg) => console.log('Socket:', msg))
    return () => {
      window.removeEventListener('popstate', onPop)
      socket.close()
    }
  }, [])

  // keep route logic; no visible Admin link. You can still open /admin directly.
  return (
    <div className="container">
      {route === '/admin' ? <AdminDashboard socket={socket} /> : <ReportForm />}
    </div>
  )
}
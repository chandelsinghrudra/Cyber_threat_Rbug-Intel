
// backend/src/index.js
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import http from 'http'
import { Server } from 'socket.io'
import { pool } from './db.js'
import reportsRouter from './routes/reports.js'

const app = express()
app.use(express.json())
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }))

app.get('/api/health', async (_req, res) => {
  const [rows] = await pool.query('SELECT NOW() AS now')
  res.json({ ok: true, now: rows[0].now })
})

app.use('/api/reports', reportsRouter)

const server = http.createServer(app)
export const io = new Server(server, {
  cors: { origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }
})

io.on('connection', socket => {
  socket.emit('hello', { message: 'Connected to cyber portal socket' })
})

const PORT = process.env.PORT || 4000
server.listen(PORT, () => console.log(`Backend on http://localhost:${PORT}`))

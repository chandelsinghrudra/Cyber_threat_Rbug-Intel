
// frontend/src/api.js
const BASE = 'http://localhost:4000/api'

export async function createReport(payload) {
  const res = await fetch(`${BASE}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  return res.json()
}

export async function listReports({ status, search } = {}) {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  if (search) params.set('search', search)
  const res = await fetch(`${BASE}/reports?${params.toString()}`)
  return res.json()
}

export async function updateStatus(id, body) {
  const res = await fetch(`${BASE}/reports/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  return res.json()
}

export async function resolveReport(id, version) {
  const res = await fetch(`${BASE}/reports/${id}/resolve`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ version })
  })
  return res.json()
}

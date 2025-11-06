// frontend/src/components/ReportForm.jsx
import React, { useState } from 'react'
import { createReport } from '../api.js'

export default function ReportForm() {
  const [types] = useState([
    {id:1, name:'Fraud'}, {id:2, name:'Phishing'}, {id:3, name:'Cyber Bullying'},
    {id:4, name:'National Security'}, {id:5, name:'Malware'}
  ])
  const [form, setForm] = useState({
    name:'', phone:'', location:'', type_id:1, description:''
  })
  const [result, setResult] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const onChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: name==='type_id' ? Number(value) : value }))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    const res = await createReport(form)
    setResult(res)
    setSubmitting(false)
    if (res.ok) setForm({ name:'', phone:'', location:'', type_id:1, description:'' })
  }

  return (
    <div className="card">
      <h2 style={{marginTop:0, color:'var(--neon)'}}>Report a Threat</h2>
      <form onSubmit={onSubmit}>
        <div className="row">
          <div>
            <label>Name</label>
            <input name="name" placeholder="Your name" value={form.name} onChange={onChange} required />
          </div>
          <div>
            <label>Phone</label>
            <input name="phone" placeholder="+91-XXXXXXXXXX" value={form.phone} onChange={onChange} required />
          </div>
        </div>
        <div className="row">
          <div>
            <label>Location</label>
            <input name="location" placeholder="Jaipur, Rajasthan" value={form.location} onChange={onChange} required />
          </div>
          <div>
            <label>Threat Type</label>
            <select name="type_id" value={form.type_id} onChange={onChange}>
              {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label>Description</label>
          <textarea name="description" rows="4" placeholder="What happened?" value={form.description} onChange={onChange} required />
        </div>
        <button type="submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit Report'}</button>
      </form>
      {result && (
        <div style={{marginTop:12}}>
          {result.ok
            ? <div className="badge ok">Submitted ✔</div>
            : <div className="badge danger">Error: {result.error}</div>}
        </div>
      )}
    </div>
  )
}
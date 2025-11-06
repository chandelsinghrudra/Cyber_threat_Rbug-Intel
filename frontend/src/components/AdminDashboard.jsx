// frontend/src/components/AdminDashboard.jsx
import React, { useCallback, useEffect, useState, useRef } from 'react'
import { listReports, updateStatus, resolveReport } from '../api.js'

const StatusBadge = ({ code }) => {
  let cls = "badge"
  if (code === "RESOLVED") cls += " ok"
  else if (code === "UNDER_PROCESS") cls += " warn"
  else cls += ""
  return <span className={cls}>{code.replace("_", " ")}</span>
}

// Single Row (memoized for speed)
const Row = React.memo(function Row({ row, onChangeStatus, onResolve, onView, busy }) {
  return (
    <tr>
      <td>{row.id}</td>
      <td>{new Date(row.created_at).toLocaleString()}</td>
      <td>{row.reporter_name}</td>
      <td>{row.phone}</td>
      <td>{row.location}</td>

      <td>
        {row.threat_type}
        <br />
        <button 
          className="ghost" 
          style={{marginTop:"6px", fontSize:"12px"}} 
          onClick={()=>onView(row)}
        >
          View
        </button>
      </td>

      <td>{row.priority}</td>

      <td><StatusBadge code={row.status_code} /></td>

      <td>
        <div className="row">
          <button 
            className="ghost" 
            disabled={busy} 
            onClick={() => onChangeStatus(row, "NOT_OPENED")}
          >
            Not opened
          </button>

          <button 
            className="secondary" 
            disabled={busy} 
            onClick={() => onChangeStatus(row, "UNDER_PROCESS")}
          >
            Under process
          </button>

          <button 
            disabled={busy} 
            onClick={() => onResolve(row)}
          >
            Resolve
          </button>
        </div>
      </td>
    </tr>
  )
})

export default function AdminDashboard({ socket }) {
  const [status, setStatus] = useState("")
  const [search, setSearch] = useState("")
  const [rows, setRows] = useState([])
  const [busyId, setBusyId] = useState(null)
  const searchRef = useRef("")
  const [viewing, setViewing] = useState(null)

  // fetch data
  const fetchData = useCallback(async () => {
    const res = await listReports({ status, search: searchRef.current })
    if (res.ok) {
      setRows(res.reports)
    }
  }, [status])

  // socket listeners
  useEffect(() => {
    fetchData()

    const onNew = (r) => setRows(prev => [r, ...prev])
    const onUpd = (r) => setRows(prev => prev.map(x => x.id === r.id ? {...x, ...r} : x))

    socket.on('report:new', onNew)
    socket.on('report:updated', onUpd)

    return () => {
      socket.off('report:new', onNew)
      socket.off('report:updated', onUpd)
    }
  }, [])

  // status filter reload
  useEffect(() => { fetchData() }, [status, fetchData])

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      searchRef.current = search
      fetchData()
    }, 300)
    return () => clearTimeout(t)
  }, [search, fetchData])

  // optimistic update
  const optimisticPatch = (id, patch) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
  }

  // change status
  const onChangeStatus = useCallback(async (row, new_status) => {
    if (busyId) return
    setBusyId(row.id)

    const old = { status_code: row.status_code, version: row.version }
    const nextVersion = (row.version || 1) + 1

    optimisticPatch(row.id, { status_code: new_status, version: nextVersion })

    const res = await updateStatus(row.id, { new_status, version: row.version })
    
    if (!res.ok) {
      // rollback
      optimisticPatch(row.id, { status_code: old.status_code, version: old.version })
      alert(res.error)
    } else {
      optimisticPatch(row.id, {
        status_code: res.report.status_code,
        version: res.report.version,
        priority: res.report.priority
      })
    }

    setBusyId(null)
  }, [busyId])

  // resolve
  const onResolve = useCallback(async (row) => {
    if (busyId) return
    setBusyId(row.id)

    const old = { status_code: row.status_code, version: row.version }
    const nextVersion = (row.version || 1) + 1

    optimisticPatch(row.id, { status_code: "RESOLVED", version: nextVersion })

    const res = await resolveReport(row.id, row.version)

    if (!res.ok) {
      optimisticPatch(row.id, { status_code: old.status_code, version: old.version })
      alert(res.error)
    } else {
      optimisticPatch(row.id, {
        status_code: res.report.status_code,
        version: res.report.version,
        priority: res.report.priority
      })
    }

    setBusyId(null)
  }, [busyId])

  // modal open
  const onView = useCallback((row) => {
    setViewing(row)
  }, [])

  return (
    <div className="card">
      <h2 style={{marginTop:0, color:"var(--neon)"}}>Admin Dashboard</h2>

      {/* filters */}
      <div className="row">
        <div>
          <label>Status</label>
          <select value={status} onChange={(e)=>setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="NOT_OPENED">NOT_OPENED</option>
            <option value="UNDER_PROCESS">UNDER_PROCESS</option>
            <option value="RESOLVED">RESOLVED</option>
          </select>
        </div>
        <div>
          <label>Search</label>
          <input 
            value={search} 
            onChange={(e)=>setSearch(e.target.value)} 
            placeholder="phone / name / location"
          />
        </div>
        <div style={{alignSelf:'end'}}>
          <button className="ghost" onClick={fetchData}>Refresh</button>
        </div>
      </div>

      {/* table */}
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Created</th>
            <th>Name</th>
            <th>Phone</th>
            <th>Location</th>
            <th>Type / View</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {rows.map(r => (
            <Row 
              key={r.id} 
              row={r}
              onChangeStatus={onChangeStatus}
              onResolve={onResolve}
              onView={onView}
              busy={busyId === r.id}
            />
          ))}
        </tbody>
      </table>

      {/* DESCRIPTION MODAL */}
      {viewing && (
        <div 
          style={{
            position:"fixed", top:0, left:0, width:"100%", height:"100%",
            background:"rgba(0,0,0,0.85)", backdropFilter:"blur(3px)",
            display:"flex", alignItems:"center", justifyContent:"center",
            zIndex: 9999
          }}
        >
          <div 
            className="card" 
            style={{
              maxWidth:"600px", width:"90%",
              border:`1px solid var(--neon-dim)`,
              boxShadow:"0 0 25px rgba(57,255,20,.25)"
            }}
          >
            <h3 style={{color:"var(--neon)", marginTop:0}}>
              Description for Report #{viewing.id}
            </h3>

            <p style={{
              whiteSpace:"pre-wrap",
              lineHeight:"1.55",
              color:"var(--text)",
              fontSize:"15px"
            }}>
              {viewing.description}
            </p>

            <button 
              onClick={()=>setViewing(null)}
              className="ghost"
              style={{
                marginTop:"12px",
                borderColor:"var(--neon-dim)",
                color:"var(--neon)"
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
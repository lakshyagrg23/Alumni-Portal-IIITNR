import React, { useEffect, useMemo, useState } from 'react'
import { adminService } from '@services/adminService'
import styles from '../AdminPanel.module.css'
import toast from 'react-hot-toast'

const PERMISSIONS = [
  { key: 'manage_users', label: 'Manage Users' },
  { key: 'manage_news', label: 'Manage News' },
  { key: 'manage_events', label: 'Manage Events' },
]

const AdminAccessTab = () => {
  const [loading, setLoading] = useState(true)
  const [admins, setAdmins] = useState([])
  const [query, setQuery] = useState('')
  const [promoteEmail, setPromoteEmail] = useState('')
  const [busyIds, setBusyIds] = useState(new Set())

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return admins
    return admins.filter(a => a.email?.toLowerCase().includes(q))
  }, [admins, query])

  const refresh = async () => {
    try {
      setLoading(true)
      const res = await adminService.listAdmins()
      // Expecting res.data = [{ id, email, role, permissions: ['manage_users', ...] }]
      const list = res.data || res || []
      setAdmins(Array.isArray(list) ? list : [])
    } catch (e) {
      console.error('Failed to load admins', e)
      toast.error(e?.message || 'Failed to load admins')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const withBusy = (id, fn) => async (...args) => {
    setBusyIds(prev => new Set(prev).add(id))
    try {
      await fn(...args)
    } finally {
      setBusyIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const handlePromoteByEmail = async (e) => {
    e.preventDefault()
    const email = promoteEmail.trim().toLowerCase()
    if (!email) return
    try {
      const search = await adminService.getUsers({ search: email, limit: 5 })
      const candidates = (search?.data || []).filter(u => (u.email || '').toLowerCase() === email)
      if (!candidates.length) {
        toast.error('User not found')
        return
      }
      const user = candidates[0]
      await adminService.promoteToAdmin(user.id)
      toast.success(`Promoted ${email} to admin`)
      setPromoteEmail('')
      await refresh()
    } catch (e) {
      console.error('Promote failed', e)
      toast.error(e?.message || 'Promote failed')
    }
  }

  const togglePermission = async (userId, has, perm) => {
    try {
      if (has) {
        await adminService.revokePermission(userId, perm)
        toast.success('Permission revoked')
      } else {
        await adminService.grantPermission(userId, perm)
        toast.success('Permission granted')
      }
      await refresh()
    } catch (e) {
      console.error('Permission change failed', e)
      toast.error(e?.message || 'Permission change failed')
    }
  }

  const demote = async (userId, email) => {
    if (!confirm(`Demote ${email} to alumni?`)) return
    try {
      await adminService.demoteToAlumni(userId)
      toast.success(`Demoted ${email}`)
      await refresh()
    } catch (e) {
      console.error('Demote failed', e)
      toast.error(e?.message || 'Demote failed')
    }
  }

  return (
    <div className={styles.accessContainer}>
      <div className={styles.accessHeader}>
        <div>
          <h1 className={styles.pageTitle}>Admin Access Control</h1>
          <p className={styles.pageSubtitle}>Promote/demote admins and manage granular permissions</p>
        </div>
        <div className={styles.accessActions}>
          <button className={styles.refreshButton} onClick={refresh} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className={styles.promoteBox}>
        <form onSubmit={handlePromoteByEmail} className={styles.promoteForm}>
          <input
            type="email"
            placeholder="Promote by email (exact)"
            className={styles.searchInput}
            value={promoteEmail}
            onChange={(e) => setPromoteEmail(e.target.value)}
            required
          />
          <button type="submit" className={styles.primaryButton}>Promote to Admin</button>
        </form>
        <div className={styles.hint}>Tip: Enter the exact email of a registered user to promote.</div>
      </div>

      <div className={styles.filters}>
        <input
          type="text"
          placeholder="Filter admins by email…"
          className={styles.searchInput}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <div className={styles.loadingSpinner}><div className={styles.spinner}></div></div>
      ) : filtered.length === 0 ? (
        <div className={styles.emptyState}><p>No admins found.</p></div>
      ) : (
        <div className={styles.accessGrid}>
          {filtered.map((u) => {
            const perms = new Set(u.permissions || [])
            const busy = busyIds.has(u.id)
            return (
              <div className={styles.adminCard} key={u.id}>
                <div className={styles.adminHeader}>
                  <div>
                    <div className={styles.adminEmail}>{u.email}</div>
                    <div className={styles.roleRow}>
                      <span className={`${styles.roleTag} ${u.role === 'superadmin' ? styles.roleSuper : styles.roleAdmin}`}>
                        {u.role}
                      </span>
                    </div>
                  </div>
                  {u.role !== 'superadmin' && (
                    <button
                      className={`${styles.actionButton} ${styles.reject}`}
                      disabled={busy}
                      onClick={withBusy(u.id, () => demote(u.id, u.email))}
                    >
                      Demote
                    </button>
                  )}
                </div>

                <div className={styles.permissionToggles}>
                  {PERMISSIONS.map(p => {
                    const has = perms.has(p.key)
                    return (
                      <label key={p.key} className={styles.permissionToggle}>
                        <span>{p.label}</span>
                        <button
                          type="button"
                          className={`${styles.switch} ${has ? styles.switchOn : styles.switchOff}`}
                          disabled={busy || u.role === 'superadmin'}
                          onClick={withBusy(u.id, () => togglePermission(u.id, has, p.key))}
                          aria-pressed={has}
                        >
                          <span className={styles.knob}></span>
                        </button>
                      </label>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default AdminAccessTab

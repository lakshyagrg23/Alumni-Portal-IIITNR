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
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [newAdminPassword, setNewAdminPassword] = useState('')
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

  const handleCreateAdmin = async (e) => {
    e.preventDefault()
    const email = newAdminEmail.trim().toLowerCase()
    const password = newAdminPassword
    if (!email || !password) return
    try {
      const res = await adminService.createAdmin({ email, password })
      if (res?.success) {
        toast.success(`Admin created: ${email}`)
      } else {
        toast.success(`Admin created`) // API returns data only; interceptor unwraps
      }
      setNewAdminEmail('')
      setNewAdminPassword('')
      await refresh()
    } catch (e) {
      console.error('Create admin failed', e)
      toast.error(e?.message || 'Failed to create admin')
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

  const demoteOrRemove = async (userId, email, hasProfile) => {
    if (hasProfile) {
      // User was promoted from alumni - demote back to alumni
      if (!confirm(`Demote ${email} back to alumni role?`)) return
      try {
        await adminService.demoteToAlumni(userId)
        toast.success(`Demoted ${email} to alumni`)
        await refresh()
      } catch (e) {
        console.error('Demote failed', e)
        toast.error(e?.message || 'Demote failed')
      }
    } else {
      // User was created as admin - remove completely
      if (!confirm(`Remove admin account ${email}? This cannot be undone.`)) return
      try {
        await adminService.removeAdmin(userId)
        toast.success(`Removed admin ${email}`)
        await refresh()
      } catch (e) {
        console.error('Remove failed', e)
        toast.error(e?.message || 'Remove failed')
      }
    }
  }

  return (
    <div className={styles.accessPage}>
      {/* Header Section */}
      <div className={styles.accessPageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Admin Access Control</h1>
          <p className={styles.pageSubtitle}>Manage administrators and their permissions</p>
        </div>
        <button className={styles.refreshButton} onClick={refresh} disabled={loading}>
          {loading ? 'Loading…' : '↻ Refresh'}
        </button>
      </div>

      {/* Two Column Layout */}
      <div className={styles.accessLayout}>
        {/* Left Column: Admin Management Actions */}
        <div className={styles.accessSidebar}>
          {/* Promote Existing User */}
          <div className={styles.actionCard}>
            <h3 className={styles.cardTitle}>Promote Existing User</h3>
            <p className={styles.cardDescription}>Promote a registered alumni to admin role</p>
            <form onSubmit={handlePromoteByEmail} className={styles.actionForm}>
              <input
                type="email"
                placeholder="Enter user email"
                className={styles.formInput}
                value={promoteEmail}
                onChange={(e) => setPromoteEmail(e.target.value)}
                required
              />
              <button type="submit" className={styles.promoteButton}>
                <span>Promote to Admin</span>
              </button>
            </form>
          </div>

          {/* Create New Admin */}
          <div className={styles.actionCard}>
            <h3 className={styles.cardTitle}>Create New Admin</h3>
            <p className={styles.cardDescription}>Create an admin account directly (Superadmin only)</p>
            <form onSubmit={handleCreateAdmin} className={styles.actionForm}>
              <input
                type="email"
                placeholder="Admin email"
                className={styles.formInput}
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Temporary password"
                className={styles.formInput}
                value={newAdminPassword}
                onChange={(e) => setNewAdminPassword(e.target.value)}
                required
                minLength={6}
              />
              <button type="submit" className={styles.createButton}>
                <span>Create Admin</span>
              </button>
            </form>
          </div>

          {/* Info Box */}
          <div className={styles.infoBox}>
            <div className={styles.infoIcon}>ℹ️</div>
            <div>
              <strong>Permission Types:</strong>
              <ul className={styles.infoList}>
                <li><strong>Manage Users:</strong> Approve/reject registrations</li>
                <li><strong>Manage News:</strong> Create/edit news articles</li>
                <li><strong>Manage Events:</strong> Create/edit events</li>
              </ul>
              <p style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
                Superadmins have all permissions by default.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Admin List */}
        <div className={styles.accessMain}>
          {/* Search Bar */}
          <div className={styles.searchBar}>
            <input
              type="text"
              placeholder="🔍 Search admins by email..."
              className={styles.searchInput}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <span className={styles.adminCount}>
              {filtered.length} {filtered.length === 1 ? 'admin' : 'admins'}
            </span>
          </div>

          {/* Admin Cards */}
          {loading ? (
            <div className={styles.loadingSpinner}><div className={styles.spinner}></div></div>
          ) : filtered.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No admins found</p>
            </div>
          ) : (
            <div className={styles.adminList}>
              {filtered.map((u) => {
                const perms = new Set(u.permissions || [])
                const busy = busyIds.has(u.id)
                return (
                  <div className={styles.adminCardNew} key={u.id}>
                    {/* Card Header */}
                    <div className={styles.cardHeader}>
                      <div className={styles.adminInfo}>
                        <div className={styles.adminEmailNew}>{u.email}</div>
                        <span className={`${styles.roleTagNew} ${u.role === 'superadmin' ? styles.roleSuperNew : styles.roleAdminNew}`}>
                          {u.role === 'superadmin' ? '👑 Superadmin' : '🔧 Admin'}
                        </span>
                      </div>
                      {u.role !== 'superadmin' && (
                        <button
                          className={styles.removeButton}
                          disabled={busy}
                          onClick={withBusy(u.id, () => demoteOrRemove(u.id, u.email, u.hasProfile))}
                          title={u.hasProfile ? 'Demote to alumni role' : 'Remove admin account'}
                        >
                          {u.hasProfile ? '↓ Demote' : '✕ Remove'}
                        </button>
                      )}
                    </div>

                    {/* Permissions - Only show for regular admins */}
                    {u.role !== 'superadmin' && (
                      <div className={styles.permissionsSection}>
                        <div className={styles.permissionsLabel}>Permissions</div>
                        <div className={styles.permissionsList}>
                          {PERMISSIONS.map(p => {
                            const has = perms.has(p.key)
                            return (
                              <div key={p.key} className={styles.permissionItem}>
                                <span className={styles.permissionName}>{p.label}</span>
                                <button
                                  type="button"
                                  className={`${styles.toggleSwitch} ${has ? styles.toggleOn : styles.toggleOff}`}
                                  disabled={busy}
                                  onClick={withBusy(u.id, () => togglePermission(u.id, has, p.key))}
                                  aria-pressed={has}
                                  title={has ? 'Click to revoke' : 'Click to grant'}
                                >
                                  <span className={styles.toggleKnob}></span>
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
          })
        </div>
      </div>
    </div>
  )
}

export default AdminAccessTab

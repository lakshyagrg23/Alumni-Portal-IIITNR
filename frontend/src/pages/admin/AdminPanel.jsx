import React, { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { useAuth } from '@hooks/useAuth'
import { adminService } from '@services/adminService'
import NewsManagement from './components/NewsManagement'
import EventsManagement from './components/EventsManagement'
import AccreditationDashboard from './AccreditationDashboard'
import styles from './AdminPanel.module.css'

const AdminPanel = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    isApproved: '',
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
  })

  // Load users
  const loadUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = {
        page: pagination.page,
        limit: pagination.limit,
      }
      
      if (filters.search) params.search = filters.search
      if (filters.role) params.role = filters.role
      if (filters.isApproved !== '') params.isApproved = filters.isApproved

      const response = await adminService.getUsers(params)
      setUsers(response.data)
      setPagination(prev => ({
        ...prev,
        total: response.total,
      }))
    } catch (err) {
      console.error('Load users error:', err)
      setError(err.message || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  // Load statistics
  const loadStats = async () => {
    try {
      const response = await adminService.getUserStats()
      setStats(response.data)
    } catch (err) {
      console.error('Load stats error:', err)
    }
  }

  // Handle user approval
  const handleApproveUser = async (userId) => {
    try {
      await adminService.approveUser(userId)
      await loadUsers()
      await loadStats()
    } catch (err) {
      console.error('Approve user error:', err)
      setError(err.message || 'Failed to approve user')
    }
  }

  // Handle user rejection
  const handleRejectUser = async (userId) => {
    try {
      await adminService.rejectUser(userId)
      await loadUsers()
      await loadStats()
    } catch (err) {
      console.error('Reject user error:', err)
      setError(err.message || 'Failed to reject user')
    }
  }

  // Handle user deactivation
  const handleDeactivateUser = async (userId) => {
    try {
      await adminService.deactivateUser(userId)
      await loadUsers()
      await loadStats()
    } catch (err) {
      console.error('Deactivate user error:', err)
      setError(err.message || 'Failed to deactivate user')
    }
  }

  // Handle user activation
  const handleActivateUser = async (userId) => {
    try {
      await adminService.activateUser(userId)
      await loadUsers()
      await loadStats()
    } catch (err) {
      console.error('Activate user error:', err)
      setError(err.message || 'Failed to activate user')
    }
  }

  // Handle filter change
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  // Handle page change
  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }))
  }

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  // Check if email is institute email
  const isInstituteEmail = (email) => {
    return email.endsWith('@iiitnr.edu.in')
  }

  // Load data on component mount and filter changes
  useEffect(() => {
    loadUsers()
  }, [pagination.page, filters])

  useEffect(() => {
    loadStats()
  }, [])

  // Redirect if not admin
  if (user?.role !== 'admin') {
    return (
      <div className={styles.adminContainer}>
        <div className={styles.mainContent}>
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <h1>Access Denied</h1>
            <p>You need admin privileges to access this page.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <Helmet>
        <title>Admin Panel - IIIT Naya Raipur Alumni Portal</title>
      </Helmet>
      
      <div className={styles.adminContainer}>
        <div className={styles.adminContent}>
          {/* Tab Navigation */}
          <div className={styles.tabNavigation}>
            <button
              className={`${styles.tab} ${activeTab === 'dashboard' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <span className={styles.tabIcon}>📊</span>
              Dashboard
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'users' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('users')}
            >
              <span className={styles.tabIcon}>👥</span>
              Users
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'news' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('news')}
            >
              <span className={styles.tabIcon}>📰</span>
              News
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'events' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('events')}
            >
              <span className={styles.tabIcon}>📅</span>
              Events
            </button>
          </div>

          {/* Content Area */}
          <div className={styles.tabContent}>
            {activeTab === 'dashboard' && <AccreditationDashboard />}

          {activeTab === 'users' && (
            <>
              <div className={styles.pageHeader}>
                <h1 className={styles.pageTitle}>User Management</h1>
                <p className={styles.pageSubtitle}>
                  Manage user accounts, approvals, and permissions
                </p>
              </div>

              <div className={styles.userManagement}>
                {/* Statistics */}
                {stats && (
                  <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                      <div className={styles.statValue}>{stats.total}</div>
                      <div className={styles.statLabel}>Total Users</div>
                    </div>
                    <div className={`${styles.statCard} ${styles.approved}`}>
                      <div className={styles.statValue}>{stats.approved}</div>
                      <div className={styles.statLabel}>Approved</div>
                    </div>
                    <div className={`${styles.statCard} ${styles.pending}`}>
                      <div className={styles.statValue}>{stats.pending}</div>
                      <div className={styles.statLabel}>Pending Approval</div>
                    </div>
                    <div className={`${styles.statCard} ${styles.inactive}`}>
                      <div className={styles.statValue}>{stats.inactive}</div>
                      <div className={styles.statLabel}>Inactive</div>
                    </div>
                  </div>
                )}

                {/* Filters */}
                <div className={styles.filters}>
                  <input
                    type="text"
                    placeholder="Search by email..."
                    className={styles.searchInput}
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                  />
                  
                  <select
                    className={styles.filterSelect}
                    value={filters.role}
                    onChange={(e) => handleFilterChange('role', e.target.value)}
                  >
                    <option value="">All Roles</option>
                    <option value="admin">Admin</option>
                    <option value="alumni">Alumni</option>
                  </select>
                  
                  <select
                    className={styles.filterSelect}
                    value={filters.isApproved}
                    onChange={(e) => handleFilterChange('isApproved', e.target.value)}
                  >
                    <option value="">All Status</option>
                    <option value="true">Approved</option>
                    <option value="false">Pending</option>
                  </select>
                  
                  <button
                    className={styles.refreshButton}
                    onClick={() => {
                      loadUsers()
                      loadStats()
                    }}
                    disabled={loading}
                  >
                    {loading ? 'Loading...' : 'Refresh'}
                  </button>
                </div>

                {/* Error Message */}
                {error && (
                  <div className={styles.errorMessage}>
                    {error}
                  </div>
                )}

                {/* Users Table */}
                {loading ? (
                  <div className={styles.loadingSpinner}>
                    <div className={styles.spinner}></div>
                  </div>
                ) : users.length === 0 ? (
                  <div className={styles.emptyState}>
                    <p>No users found matching your criteria.</p>
                  </div>
                ) : (
                  <>
                    <table className={styles.userTable}>
                      <thead>
                        <tr>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Status</th>
                          <th>Account</th>
                          <th>Joined</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user) => (
                          <tr key={user.id}>
                            <td className={styles.emailCell}>
                              {user.email}
                              {isInstituteEmail(user.email) && (
                                <span style={{ color: '#10b981', marginLeft: '0.5rem' }}>
                                  ✓ Institute
                                </span>
                              )}
                            </td>
                            <td className={styles.roleCell}>{user.role}</td>
                            <td>
                              <span
                                className={`${styles.statusBadge} ${
                                  user.is_approved ? styles.approved : styles.pending
                                }`}
                              >
                                {user.is_approved ? 'Approved' : 'Pending'}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`${styles.statusBadge} ${
                                  user.is_active ? styles.approved : styles.inactive
                                }`}
                              >
                                {user.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td>{formatDate(user.created_at)}</td>
                            <td>
                              <div className={styles.actionButtons}>
                                {!user.is_approved && (
                                  <button
                                    className={`${styles.actionButton} ${styles.approve}`}
                                    onClick={() => handleApproveUser(user.id)}
                                  >
                                    Approve
                                  </button>
                                )}
                                {user.is_approved && !isInstituteEmail(user.email) && (
                                  <button
                                    className={`${styles.actionButton} ${styles.reject}`}
                                    onClick={() => handleRejectUser(user.id)}
                                  >
                                    Revoke
                                  </button>
                                )}
                                {user.is_active ? (
                                  <button
                                    className={`${styles.actionButton} ${styles.deactivate}`}
                                    onClick={() => handleDeactivateUser(user.id)}
                                    disabled={user.id === user.id} // Prevent self-deactivation
                                  >
                                    Deactivate
                                  </button>
                                ) : (
                                  <button
                                    className={`${styles.actionButton} ${styles.activate}`}
                                    onClick={() => handleActivateUser(user.id)}
                                  >
                                    Activate
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Pagination */}
                    <div className={styles.pagination}>
                      <button
                        className={styles.paginationButton}
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                      >
                        Previous
                      </button>
                      
                      <span className={styles.paginationInfo}>
                        Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit)}
                      </span>
                      
                      <button
                        className={styles.paginationButton}
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
                      >
                        Next
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

            {activeTab === 'news' && <NewsManagement />}

            {activeTab === 'events' && <EventsManagement />}
          </div>
        </div>
      </div>
    </>
  )
}

export default AdminPanel

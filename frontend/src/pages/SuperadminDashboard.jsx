import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { BiFlag, BiBlock, BiUser, BiX, BiCheck, BiTime, BiTrash, BiError } from 'react-icons/bi'
import styles from './SuperadminDashboard.module.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const SuperadminDashboard = () => {
  const { token, user } = useAuth()
  const [activeTab, setActiveTab] = useState('reports') // reports, blocked, warnings, suspensions
  const [reports, setReports] = useState([])
  const [blockedUsers, setBlockedUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedReport, setSelectedReport] = useState(null)
  const [showActionModal, setShowActionModal] = useState(false)
  const [actionType, setActionType] = useState('') // warn, suspend, dismiss
  const [actionData, setActionData] = useState({
    warningType: 'content_violation',
    message: '',
    suspensionType: 'temporary',
    durationDays: 7,
    reason: '',
    adminNotes: ''
  })
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    if (user?.role === 'superadmin') {
      loadReports()
    }
  }, [user, filterStatus])

  useEffect(() => {
    if (activeTab === 'blocked' && user?.role === 'superadmin') {
      loadBlockedUsers()
    }
  }, [activeTab, user])

  const loadReports = async () => {
    setLoading(true)
    setError('')
    try {
      const params = filterStatus !== 'all' ? `?status=${filterStatus}` : ''
      const res = await axios.get(`${API}/moderation/reports${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setReports(res.data?.data || [])
    } catch (err) {
      console.error('Failed to load reports:', err)
      setError(err.response?.data?.message || 'Failed to load reports')
    } finally {
      setLoading(false)
    }
  }

  const loadBlockedUsers = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await axios.get(`${API}/moderation/blocked-users`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setBlockedUsers(res.data?.data || [])
    } catch (err) {
      console.error('Failed to load blocked users:', err)
      setError(err.response?.data?.message || 'Failed to load blocked users')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateReportStatus = async (reportId, status, notes = '') => {
    try {
      await axios.put(`${API}/moderation/reports/${reportId}`, {
        status,
        adminNotes: notes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setError('')
      loadReports()
      setSelectedReport(null)
    } catch (err) {
      console.error('Failed to update report:', err)
      setError(err.response?.data?.message || 'Failed to update report')
    }
  }

  const openActionModal = (report, type) => {
    setSelectedReport(report)
    setActionType(type)
    setShowActionModal(true)
    setActionData({
      warningType: 'content_violation',
      message: '',
      suspensionType: 'temporary',
      durationDays: 7,
      reason: '',
      adminNotes: ''
    })
  }

  const handleTakeAction = async () => {
    if (!selectedReport) return

    try {
      if (actionType === 'warn') {
        if (!actionData.message.trim()) {
          setError('Warning message is required')
          return
        }
        await axios.post(`${API}/moderation/warn`, {
          userId: selectedReport.reported_user_id,
          warningType: actionData.warningType,
          message: actionData.message,
          relatedReportId: selectedReport.id
        }, {
          headers: { Authorization: `Bearer ${token}` }
        })
        // Update report to resolved
        await handleUpdateReportStatus(selectedReport.id, 'resolved', `Warning issued: ${actionData.message}`)
      } else if (actionType === 'suspend') {
        if (!actionData.reason.trim()) {
          setError('Suspension reason is required')
          return
        }
        await axios.post(`${API}/moderation/suspend/${selectedReport.reported_user_id}`, {
          reason: actionData.reason,
          suspensionType: actionData.suspensionType,
          durationDays: actionData.suspensionType === 'temporary' ? actionData.durationDays : undefined,
          relatedReportId: selectedReport.id
        }, {
          headers: { Authorization: `Bearer ${token}` }
        })
        // Update report to resolved
        await handleUpdateReportStatus(selectedReport.id, 'resolved', `User suspended: ${actionData.reason}`)
      } else if (actionType === 'dismiss') {
        await handleUpdateReportStatus(selectedReport.id, 'dismissed', actionData.adminNotes)
      }
      
      setShowActionModal(false)
      setSelectedReport(null)
      setError('')
      alert(`Action completed successfully`)
    } catch (err) {
      console.error('Failed to take action:', err)
      setError(err.response?.data?.message || 'Failed to take action')
    }
  }

  const getStatusBadge = (status) => {
    const styles_map = {
      pending: { bg: '#fef3c7', color: '#92400e', icon: <BiTime /> },
      under_review: { bg: '#dbeafe', color: '#1e40af', icon: <BiFlag /> },
      resolved: { bg: '#d1fae5', color: '#065f46', icon: <BiCheck /> },
      dismissed: { bg: '#f3f4f6', color: '#6b7280', icon: <BiX /> }
    }
    const style = styles_map[status] || styles_map.pending
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '0.75rem',
        fontWeight: 600,
        background: style.bg,
        color: style.color
      }}>
        {style.icon}
        {status.replace('_', ' ').toUpperCase()}
      </span>
    )
  }

  const getReportTypeLabel = (type) => {
    const labels = {
      harassment: 'Harassment',
      spam: 'Spam',
      inappropriate_content: 'Inappropriate Content',
      impersonation: 'Impersonation',
      other: 'Other'
    }
    return labels[type] || type
  }

  if (user?.role !== 'superadmin') {
    return (
      <div className={styles.container}>
        <div className={styles.errorCard}>
          <BiError size={48} />
          <h2>Access Denied</h2>
          <p>This page is only accessible to superadmins.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Helmet><title>Superadmin Dashboard - IIIT Naya Raipur Alumni Portal</title></Helmet>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Moderation Dashboard</h1>
          <p className={styles.subtitle}>Manage user reports, blocks, and enforcement actions</p>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'reports' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            <BiFlag size={20} />
            User Reports
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'blocked' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('blocked')}
          >
            <BiBlock size={20} />
            Blocked Users
          </button>
        </div>

        {error && (
          <div className={styles.errorBanner}>
            <BiError size={20} />
            {error}
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <>
            <div className={styles.filterBar}>
              <label style={{ fontWeight: 600, color: '#374151' }}>Filter by Status:</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="all">All Reports</option>
                <option value="pending">Pending</option>
                <option value="under_review">Under Review</option>
                <option value="resolved">Resolved</option>
                <option value="dismissed">Dismissed</option>
              </select>
            </div>

            {loading ? (
              <div className={styles.loadingState}>
                <div className={styles.spinner}></div>
                <p>Loading reports...</p>
              </div>
            ) : reports.length === 0 ? (
              <div className={styles.emptyState}>
                <BiFlag size={64} />
                <h3>No Reports Found</h3>
                <p>There are no user reports matching your filter.</p>
              </div>
            ) : (
              <div className={styles.reportsList}>
                {reports.map((report) => (
                  <div key={report.id} className={styles.reportCard}>
                    <div className={styles.reportHeader}>
                      <div>
                        <div className={styles.reportType}>{getReportTypeLabel(report.report_type)}</div>
                        <div className={styles.reportDate}>
                          Reported on {new Date(report.reported_at).toLocaleDateString()}
                        </div>
                      </div>
                      {getStatusBadge(report.status)}
                    </div>

                    <div className={styles.reportBody}>
                      <div className={styles.reportRow}>
                        <span className={styles.label}>Reported User:</span>
                        <span className={styles.value}>
                          <BiUser size={16} />
                          {report.reported_first_name} {report.reported_last_name} ({report.reported_email})
                        </span>
                      </div>
                      <div className={styles.reportRow}>
                        <span className={styles.label}>Reported By:</span>
                        <span className={styles.value}>
                          <BiUser size={16} />
                          {report.reporter_first_name} {report.reporter_last_name} ({report.reporter_email})
                        </span>
                      </div>
                      <div className={styles.reportRow}>
                        <span className={styles.label}>Description:</span>
                        <span className={styles.value}>{report.description}</span>
                      </div>
                      {report.admin_notes && (
                        <div className={styles.reportRow}>
                          <span className={styles.label}>Admin Notes:</span>
                          <span className={styles.value} style={{ fontStyle: 'italic', color: '#6b7280' }}>
                            {report.admin_notes}
                          </span>
                        </div>
                      )}
                      {report.action_taken && (
                        <div className={styles.reportRow}>
                          <span className={styles.label}>Action Taken:</span>
                          <span className={styles.value} style={{ fontWeight: 600, color: '#10b981' }}>
                            {report.action_taken}
                          </span>
                        </div>
                      )}
                    </div>

                    {report.status === 'pending' || report.status === 'under_review' ? (
                      <div className={styles.reportActions}>
                        <button
                          onClick={() => handleUpdateReportStatus(report.id, 'under_review')}
                          className={styles.actionBtn}
                          style={{ background: '#3b82f6' }}
                        >
                          <BiFlag size={16} />
                          Mark Under Review
                        </button>
                        <button
                          onClick={() => openActionModal(report, 'warn')}
                          className={styles.actionBtn}
                          style={{ background: '#f59e0b' }}
                        >
                          <BiError size={16} />
                          Issue Warning
                        </button>
                        <button
                          onClick={() => openActionModal(report, 'suspend')}
                          className={styles.actionBtn}
                          style={{ background: '#ef4444' }}
                        >
                          <BiBlock size={16} />
                          Suspend User
                        </button>
                        <button
                          onClick={() => openActionModal(report, 'dismiss')}
                          className={styles.actionBtn}
                          style={{ background: '#6b7280' }}
                        >
                          <BiX size={16} />
                          Dismiss
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Blocked Users Tab */}
        {activeTab === 'blocked' && (
          <>
            {loading ? (
              <div className={styles.loadingState}>
                <div className={styles.spinner}></div>
                <p>Loading blocked users...</p>
              </div>
            ) : blockedUsers.length === 0 ? (
              <div className={styles.emptyState}>
                <BiBlock size={64} />
                <h3>No Blocked Users</h3>
                <p>There are currently no blocked users in the system.</p>
              </div>
            ) : (
              <div className={styles.reportsList}>
                {blockedUsers.map((block) => (
                  <div key={block.id} className={styles.reportCard}>
                    <div className={styles.reportBody}>
                      <div className={styles.reportRow}>
                        <span className={styles.label}>Blocked User:</span>
                        <span className={styles.value}>
                          <BiUser size={16} />
                          {block.blocked_user_email}
                        </span>
                      </div>
                      <div className={styles.reportRow}>
                        <span className={styles.label}>Blocked By:</span>
                        <span className={styles.value}>
                          <BiUser size={16} />
                          {block.blocker_user_email}
                        </span>
                      </div>
                      <div className={styles.reportRow}>
                        <span className={styles.label}>Reason:</span>
                        <span className={styles.value}>{block.reason || 'No reason provided'}</span>
                      </div>
                      <div className={styles.reportRow}>
                        <span className={styles.label}>Blocked At:</span>
                        <span className={styles.value}>
                          {new Date(block.blocked_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Action Modal */}
        {showActionModal && selectedReport && (
          <div className={styles.modalOverlay} onClick={() => setShowActionModal(false)}>
            <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>
                  {actionType === 'warn' && 'Issue Warning'}
                  {actionType === 'suspend' && 'Suspend User'}
                  {actionType === 'dismiss' && 'Dismiss Report'}
                </h3>
                <button className={styles.modalClose} onClick={() => setShowActionModal(false)}>
                  <BiX size={24} />
                </button>
              </div>

              <div className={styles.modalContent}>
                <div className={styles.modalInfo}>
                  <p><strong>User:</strong> {selectedReport.reported_first_name} {selectedReport.reported_last_name}</p>
                  <p><strong>Report Type:</strong> {getReportTypeLabel(selectedReport.report_type)}</p>
                  <p><strong>Description:</strong> {selectedReport.description}</p>
                </div>

                {actionType === 'warn' && (
                  <>
                    <div className={styles.formGroup}>
                      <label>Warning Type</label>
                      <select
                        value={actionData.warningType}
                        onChange={(e) => setActionData({ ...actionData, warningType: e.target.value })}
                        className={styles.formInput}
                      >
                        <option value="content_violation">Content Violation</option>
                        <option value="behavior_violation">Behavior Violation</option>
                        <option value="spam">Spam</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className={styles.formGroup}>
                      <label>Warning Message *</label>
                      <textarea
                        value={actionData.message}
                        onChange={(e) => setActionData({ ...actionData, message: e.target.value })}
                        className={styles.formTextarea}
                        rows={4}
                        placeholder="Enter warning message to be sent to the user..."
                        required
                      />
                    </div>
                  </>
                )}

                {actionType === 'suspend' && (
                  <>
                    <div className={styles.formGroup}>
                      <label>Suspension Type</label>
                      <select
                        value={actionData.suspensionType}
                        onChange={(e) => setActionData({ ...actionData, suspensionType: e.target.value })}
                        className={styles.formInput}
                      >
                        <option value="temporary">Temporary</option>
                        <option value="permanent">Permanent</option>
                      </select>
                    </div>
                    {actionData.suspensionType === 'temporary' && (
                      <div className={styles.formGroup}>
                        <label>Duration (Days)</label>
                        <input
                          type="number"
                          value={actionData.durationDays}
                          onChange={(e) => setActionData({ ...actionData, durationDays: parseInt(e.target.value) })}
                          className={styles.formInput}
                          min="1"
                          max="365"
                        />
                      </div>
                    )}
                    <div className={styles.formGroup}>
                      <label>Suspension Reason *</label>
                      <textarea
                        value={actionData.reason}
                        onChange={(e) => setActionData({ ...actionData, reason: e.target.value })}
                        className={styles.formTextarea}
                        rows={4}
                        placeholder="Enter reason for suspension..."
                        required
                      />
                    </div>
                  </>
                )}

                {actionType === 'dismiss' && (
                  <div className={styles.formGroup}>
                    <label>Admin Notes (Optional)</label>
                    <textarea
                      value={actionData.adminNotes}
                      onChange={(e) => setActionData({ ...actionData, adminNotes: e.target.value })}
                      className={styles.formTextarea}
                      rows={4}
                      placeholder="Enter notes about why this report is being dismissed..."
                    />
                  </div>
                )}

                <div className={styles.modalActions}>
                  <button
                    onClick={() => setShowActionModal(false)}
                    className={styles.btnSecondary}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleTakeAction}
                    className={styles.btnPrimary}
                    style={{
                      background: actionType === 'suspend' ? '#ef4444' : actionType === 'warn' ? '#f59e0b' : '#6b7280'
                    }}
                  >
                    {actionType === 'warn' && 'Issue Warning'}
                    {actionType === 'suspend' && 'Suspend User'}
                    {actionType === 'dismiss' && 'Dismiss Report'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default SuperadminDashboard

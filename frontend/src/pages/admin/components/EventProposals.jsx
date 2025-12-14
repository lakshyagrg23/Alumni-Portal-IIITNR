import React, { useEffect, useState } from 'react'
import { getEventProposals, manageEventProposal } from '@services/eventService'
import { useAuth } from '@hooks/useAuth'
import styles from '../AdminPanel.module.css'

const EventProposals = () => {
  const { user } = useAuth()
  const [proposals, setProposals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Only superadmins can view and manage proposals
  if (user?.role !== 'superadmin') {
    return (
      <div className={styles.accessDenied}>
        <h3>Access Restricted</h3>
        <p>Only superadmins can approve or reject event proposals.</p>
      </div>
    )
  }

  const loadProposals = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await getEventProposals({ status: 'pending', limit: 50 })
      setProposals(res.data || [])
    } catch (err) {
      console.error('Load proposals error:', err)
      setError(err.message || 'Failed to load proposals')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadProposals() }, [])

  const handleAction = async (id, action) => {
    if (!window.confirm(`Are you sure you want to ${action} this proposal?`)) return

    try {
      await manageEventProposal(id, action)
      // reload
      await loadProposals()
    } catch (err) {
      console.error('Manage proposal error:', err)
      setError(err.message || 'Failed to update proposal')
    }
  }

  if (loading) return <div className={styles.loadingSpinner}><div className={styles.spinner}></div></div>

  return (
    <div className={styles.proposalsContainer}>
      <h3>Event Proposals ({proposals.length})</h3>
      {error && <div className={styles.errorMessage}>{error}</div>}
      {proposals.length === 0 ? (
        <div className={styles.emptyState}>No pending proposals</div>
      ) : (
        <div className={styles.proposalsList}>
          {proposals.map(p => (
            <div key={p.id} className={styles.proposalCard}>
              <div className={styles.proposalHeader}>
                <h4>{p.title}</h4>
                <div className={styles.proposalMeta}>{p.organizerDisplayName || p.organizerName || 'Unknown'}</div>
              </div>
              <p className={styles.proposalDescription}>{p.description}</p>
              <div className={styles.proposalDetails}>
                <div>Type: {p.eventType}</div>
                <div>When: {p.startDateTime ? new Date(p.startDateTime).toLocaleString() : 'TBD' } - {p.endDateTime ? new Date(p.endDateTime).toLocaleString() : 'TBD'}</div>
                {p.location && <div>Location: {p.location}</div>}
              </div>
              <div className={styles.proposalActions}>
                <button className={`${styles.actionButton} ${styles.approve}`} onClick={() => handleAction(p.id, 'approve')}>Approve</button>
                <button className={`${styles.actionButton} ${styles.reject}`} onClick={() => handleAction(p.id, 'reject')}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default EventProposals

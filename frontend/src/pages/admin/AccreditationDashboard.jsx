import React, { useEffect, useState } from 'react'
import styles from './AdminPanel.module.css'
import reportsService from '@services/reportsService'

const AccreditationDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview')
  const [overview, setOverview] = useState(null)
  const [placements, setPlacements] = useState(null)
  const [contributions, setContributions] = useState(null)
  const [achievements, setAchievements] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({
    startYear: '',
    endYear: '',
    program: '',
    department: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const overviewData = await reportsService.getOverview(filters)
      setOverview(overviewData)
    } catch (err) {
      console.error('Failed to load accreditation overview', err)
      setError(err.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const loadPlacements = async () => {
    try {
      setLoading(true)
      const data = await reportsService.getPlacementDetails(filters)
      setPlacements(data)
    } catch (err) {
      console.error('Failed to load placements', err)
      setError(err.message || 'Failed to load placements')
    } finally {
      setLoading(false)
    }
  }

  const loadContributions = async () => {
    try {
      setLoading(true)
      const data = await reportsService.getContributions(filters)
      setContributions(data)
    } catch (err) {
      console.error('Failed to load contributions', err)
      setError(err.message || 'Failed to load contributions')
    } finally {
      setLoading(false)
    }
  }

  const loadAchievements = async () => {
    try {
      setLoading(true)
      const data = await reportsService.getAchievements(filters)
      setAchievements(data)
    } catch (err) {
      console.error('Failed to load achievements', err)
      setError(err.message || 'Failed to load achievements')
    } finally {
      setLoading(false)
    }
  }

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setError(null)
    
    // Load data for the specific tab if not already loaded
    if (tab === 'placements' && !placements) {
      loadPlacements()
    } else if (tab === 'contributions' && !contributions) {
      loadContributions()
    } else if (tab === 'achievements' && !achievements) {
      loadAchievements()
    }
  }

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters(prev => ({ ...prev, [name]: value }))
  }

  const applyFilters = () => {
    loadData()
    if (activeTab === 'placements') loadPlacements()
    if (activeTab === 'contributions') loadContributions()
    if (activeTab === 'achievements') loadAchievements()
  }

  const clearFilters = () => {
    setFilters({
      startYear: '',
      endYear: '',
      program: '',
      department: ''
    })
  }

  const data = overview?.data || overview

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Accreditation Dashboard</h1>
        <p className={styles.pageSubtitle}>Overview KPIs for accreditation (NAAC / NIRF / NBA)</p>
      </div>

      {/* Filters Section */}
      <div style={{ padding: '1.5rem', background: '#f8f9fa', borderRadius: '8px', margin: '1rem 0' }}>
        <h3 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: '600' }}>Filters</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Start Year</label>
            <input
              type="number"
              name="startYear"
              value={filters.startYear}
              onChange={handleFilterChange}
              placeholder="2015"
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>End Year</label>
            <input
              type="number"
              name="endYear"
              value={filters.endYear}
              onChange={handleFilterChange}
              placeholder="2025"
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Program</label>
            <input
              type="text"
              name="program"
              value={filters.program}
              onChange={handleFilterChange}
              placeholder="BTech, MTech, etc."
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Department</label>
            <input
              type="text"
              name="department"
              value={filters.department}
              onChange={handleFilterChange}
              placeholder="CSE, ECE, etc."
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>
        </div>
        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
          <button onClick={applyFilters} style={{ padding: '0.5rem 1.5rem', background: '#1e3a8a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}>
            Apply Filters
          </button>
          <button onClick={clearFilters} style={{ padding: '0.5rem 1.5rem', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}>
            Clear
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div style={{ borderBottom: '2px solid #e0e0e0', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['overview', 'placements', 'contributions', 'achievements'].map(tab => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              style={{
                padding: '0.75rem 1.5rem',
                background: activeTab === tab ? '#1e3a8a' : 'transparent',
                color: activeTab === tab ? 'white' : '#666',
                border: 'none',
                borderBottom: activeTab === tab ? '3px solid #f97316' : '3px solid transparent',
                cursor: 'pointer',
                fontWeight: activeTab === tab ? '600' : '500',
                textTransform: 'capitalize',
                transition: 'all 0.2s'
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <div className={styles.loadingSpinner}><div className={styles.spinner}></div></div>
        </div>
      )}

      {error && (
        <div className={styles.errorMessage}>{error}</div>
      )}

      {/* Overview Tab */}
      {!loading && !error && activeTab === 'overview' && data && (
        <div style={{ padding: '1rem 0' }}>
          {/* KPI Cards */}
          <div className={styles.statsGrid} style={{ marginBottom: '2rem' }}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{data.total_alumni || '0'}</div>
              <div className={styles.statLabel}>Total Alumni</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{data.employed_count || '0'}</div>
              <div className={styles.statLabel}>Employed</div>
              <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                {data.placement_rate || '0'}% placement rate
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{data.higher_studies_count || '0'}</div>
              <div className={styles.statLabel}>Higher Studies</div>
              <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                {data.higher_studies_rate || '0'}% rate
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{data.entrepreneur_count || '0'}</div>
              <div className={styles.statLabel}>Entrepreneurs</div>
            </div>
          </div>

          {/* Additional Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ padding: '1.5rem', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#0369a1' }}>Placement Statistics</h4>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0c4a6e' }}>{data.total_placements || '0'}</div>
              <div style={{ fontSize: '0.75rem', color: '#0369a1', marginTop: '0.25rem' }}>
                Avg: ₹{data.avg_salary ? Number(data.avg_salary).toFixed(2) : '0'} LPA
              </div>
            </div>

            <div style={{ padding: '1.5rem', background: '#fef3c7', borderRadius: '8px', border: '1px solid #fde68a' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#92400e' }}>Contributions</h4>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#78350f' }}>{data.total_contributions || '0'}</div>
              <div style={{ fontSize: '0.75rem', color: '#92400e', marginTop: '0.25rem' }}>
                ₹{data.total_donations ? Number(data.total_donations).toLocaleString() : '0'} donated
              </div>
            </div>

            <div style={{ padding: '1.5rem', background: '#fce7f3', borderRadius: '8px', border: '1px solid #fbcfe8' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#9f1239' }}>Achievements</h4>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#881337' }}>{data.total_achievements || '0'}</div>
              <div style={{ fontSize: '0.75rem', color: '#9f1239', marginTop: '0.25rem' }}>
                {data.publications || '0'} publications
              </div>
            </div>

            <div style={{ padding: '1.5rem', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#166534' }}>Data Quality</h4>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#14532d' }}>{data.verified_count || '0'}</div>
              <div style={{ fontSize: '0.75rem', color: '#166534', marginTop: '0.25rem' }}>
                {data.consented_count || '0'} consented for reports
              </div>
            </div>
          </div>

          {/* Detailed Summary */}
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem', fontWeight: '600' }}>Detailed Summary</h3>
            <pre style={{ whiteSpace: 'pre-wrap', background: '#f8f9fa', padding: '1rem', borderRadius: '4px', fontSize: '0.875rem', overflow: 'auto' }}>
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Placements Tab */}
      {!loading && !error && activeTab === 'placements' && placements && (
        <div style={{ padding: '1rem 0' }}>
          <h3>Placement Details</h3>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#f8f9fa', padding: '1rem', borderRadius: '4px', fontSize: '0.875rem' }}>
            {JSON.stringify(placements, null, 2)}
          </pre>
        </div>
      )}

      {/* Contributions Tab */}
      {!loading && !error && activeTab === 'contributions' && contributions && (
        <div style={{ padding: '1rem 0' }}>
          <h3>Alumni Contributions</h3>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#f8f9fa', padding: '1rem', borderRadius: '4px', fontSize: '0.875rem' }}>
            {JSON.stringify(contributions, null, 2)}
          </pre>
        </div>
      )}

      {/* Achievements Tab */}
      {!loading && !error && activeTab === 'achievements' && achievements && (
        <div style={{ padding: '1rem 0' }}>
          <h3>Alumni Achievements</h3>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#f8f9fa', padding: '1rem', borderRadius: '4px', fontSize: '0.875rem' }}>
            {JSON.stringify(achievements, null, 2)}
          </pre>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && activeTab !== 'overview' && (
        (activeTab === 'placements' && !placements) ||
        (activeTab === 'contributions' && !contributions) ||
        (activeTab === 'achievements' && !achievements)
      ) && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
          <p>Loading {activeTab} data...</p>
        </div>
      )}
    </div>
  )
}

export default AccreditationDashboard

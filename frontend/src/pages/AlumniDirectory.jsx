import React, { useState, useEffect, useCallback } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { getAvatarUrl, handleAvatarError } from '@utils/avatarUtils'
import styles from './AlumniDirectory.module.css'

const AlumniDirectory = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [alumni, setAlumni] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)
  const currentYear = new Date().getFullYear()
  const queryAdmissionYear = searchParams.get('admissionYear') || searchParams.get('enrollmentYear') || searchParams.get('batch') || ''
  const queryGraduationYear = searchParams.get('graduationYear') || searchParams.get('gradYear') || ''
  const initialStudentType = (() => {
    const paramType = searchParams.get('studentType')
    if (paramType === 'alumni' || paramType === 'current') return paramType
    const grad = parseInt(queryGraduationYear, 10)
    if (!Number.isNaN(grad)) {
      return grad > currentYear ? 'current' : 'alumni'
    }
    const admit = parseInt(queryAdmissionYear, 10)
    if (!Number.isNaN(admit)) {
      // Assume 4-year program for inference; adjust if needed
      return admit + 4 > currentYear ? 'current' : 'alumni'
    }
    return 'alumni'
  })()
  
  // Initialize filters from URL params or defaults
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
  const [selectedBatch, setSelectedBatch] = useState(queryAdmissionYear)
  const [selectedBranch, setSelectedBranch] = useState(searchParams.get('branch') || '')
  const [selectedIndustry, setSelectedIndustry] = useState(searchParams.get('industry') || '')
  const [selectedCompany, setSelectedCompany] = useState(searchParams.get('company') || '')
  const [sortBy, setSortBy] = useState('graduation_year')
  const [sortOrder, setSortOrder] = useState('DESC')
  const [studentType, setStudentType] = useState(initialStudentType) // 'alumni' or 'current'

  // Get available batches and branches for filters
  const [batches, setBatches] = useState([])
  const [branches, setBranches] = useState([])
  const [industries, setIndustries] = useState([])
  const [companies, setCompanies] = useState([])

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

  // Fetch alumni data
  const fetchAlumni = useCallback(async (page = 1) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12'
      })

      // Add sortBy and sortOrder without 'ap.' prefix
      if (sortBy && sortOrder) {
        params.append('sortBy', sortBy)
        params.append('sortOrder', sortOrder)
      }

      if (searchTerm) params.append('search', searchTerm)
      if (selectedBatch) params.append('admissionYear', selectedBatch)
      if (selectedBranch) params.append('branch', selectedBranch)
      if (selectedIndustry) params.append('industry', selectedIndustry)
      if (selectedCompany) params.append('company', selectedCompany)
      if (studentType) params.append('studentType', studentType)

      const response = await axios.get(`${API_URL}/alumni?${params}`)
      
      if (response.data.success) {
        setAlumni(response.data.data)
        setCurrentPage(response.data.pagination.current)
        setTotalPages(response.data.pagination.total)
        setTotalRecords(response.data.pagination.totalRecords)
        setError(null)
      } else {
        setError('Failed to fetch alumni data')
      }
    } catch (err) {
      console.error('Error fetching alumni:', err)
      setError(err.response?.data?.message || 'Failed to fetch alumni data')
    } finally {
      setLoading(false)
    }
  }, [searchTerm, selectedBatch, selectedBranch, selectedIndustry, selectedCompany, sortBy, sortOrder, studentType])

  // Extract unique filter options from the currently visible profiles
  useEffect(() => {
    const uniqueBatches = [...new Set(
      alumni
        .map(a => a.admissionYear || a.admission_year || a.graduationYear)
        .filter(Boolean)
    )].sort((a, b) => b - a)
    const uniqueBranches = [...new Set(alumni.map(a => a.branch).filter(Boolean))].sort()
    const uniqueIndustries = [...new Set(alumni.map(a => a.industrySector || a.industry).filter(Boolean))].sort((a, b) => a.localeCompare(b))
    const uniqueCompanies = [...new Set(alumni.map(a => a.currentCompany || a.currentEmployer).filter(Boolean))].sort((a, b) => a.localeCompare(b))

    if (selectedIndustry && !uniqueIndustries.includes(selectedIndustry)) {
      uniqueIndustries.unshift(selectedIndustry)
    }
    if (selectedCompany && !uniqueCompanies.includes(selectedCompany)) {
      uniqueCompanies.unshift(selectedCompany)
    }

    setBatches(uniqueBatches)
    setBranches(uniqueBranches)
    setIndustries(uniqueIndustries)
    setCompanies(uniqueCompanies)
  }, [alumni, selectedIndustry, selectedCompany])

  // Initial fetch and refetch on filter changes
  useEffect(() => {
    fetchAlumni(1)
  }, [fetchAlumni])

  // Handle page change
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
      fetchAlumni(page)
    }
  }

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault()
    setCurrentPage(1)
    fetchAlumni(1)
  }

  // Reset filters
  const resetFilters = () => {
    setSearchTerm('')
    setSelectedBatch('')
    setSelectedBranch('')
    setSelectedIndustry('')
    setSelectedCompany('')
    setSortBy('graduation_year')
    setSortOrder('DESC')
    setStudentType('alumni')
    setCurrentPage(1)
  }

  return (
    <>
      <Helmet>
        <title>Alumni Directory - IIIT Naya Raipur Alumni Portal</title>
        <meta 
          name="description" 
          content="Discover and connect with IIIT Naya Raipur alumni. Search by batch, branch, company, and more." 
        />
      </Helmet>

      <div className={styles.directoryContainer}>
        <section className={styles.heroSection}>
          <div className={styles.heroContent}>
            <div className={styles.heroText}>
              <p className={styles.eyebrow}>Connect and grow</p>
              <h1 className={styles.title}>
                {studentType === 'alumni' ? 'Alumni Directory' : 'Current Students'}
              </h1>
              <p className={styles.subtitle}>
                {studentType === 'alumni' 
                  ? `${totalRecords} alumni worldwide`
                  : `${totalRecords} current students`
                }
              </p>
              <div className={styles.heroStats}>
                <div className={styles.statPill}>
                  <span className={styles.statLabel}>Profiles</span>
                  <span className={styles.statValue}>{totalRecords ?? '—'}</span>
                </div>
                <div className={styles.statPill}>
                  <span className={styles.statLabel}>View mode</span>
                  <span className={styles.statValue}>
                    {studentType === 'alumni' ? 'Alumni' : 'Students'}
                  </span>
                </div>
              </div>
            </div>
            <div className={styles.heroActions}>
              <p className={styles.toggleLabel}>Choose a view</p>
              
              {/* Toggle between Alumni and Current Students */}
              <div className={styles.toggleContainer}>
                <button
                  className={`${styles.toggleButton} ${studentType === 'alumni' ? styles.active : ''}`}
                  onClick={() => setStudentType('alumni')}
                >
                  Alumni
                </button>
                <button
                  className={`${styles.toggleButton} ${studentType === 'current' ? styles.active : ''}`}
                  onClick={() => setStudentType('current')}
                >
                  Current Students
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Search and Filters */}
        <div className={styles.filtersSection}>
          <form onSubmit={handleSearch} className={styles.searchForm}>
            <div className={styles.searchRow}>
              <input
                type="text"
                placeholder="Search by name, company, role, industry, or location"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
              <div className={styles.searchActions}>
                <button type="submit" className={styles.searchButton}>
                  Search
                </button>
                <button 
                  type="button"
                  onClick={resetFilters}
                  className={styles.resetButton}
                >
                  Reset
                </button>
              </div>
            </div>

            <div className={styles.filterRow}>
              <label className={styles.filterControl}>
                <span className={styles.filterLabel}>Batch (Enrollment Year)</span>
                <select
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  className={styles.filterSelect}
                >
                  <option value="">All Batches</option>
                  {(batches.length ? batches : [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </label>

              <label className={styles.filterControl}>
                <span className={styles.filterLabel}>Branch</span>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className={styles.filterSelect}
                >
                  <option value="">All Branches</option>
                  {(branches.length
                    ? branches
                    : [
                        'Computer Science & Engineering',
                        'Electronics & Communication Engineering',
                        'Data Science & Artificial Intelligence'
                      ]
                  ).map(branch => (
                    <option key={branch} value={branch}>{branch}</option>
                  ))}
                </select>
              </label>

              <label className={styles.filterControl}>
                <span className={styles.filterLabel}>Industry</span>
                <select
                  value={selectedIndustry}
                  onChange={(e) => setSelectedIndustry(e.target.value)}
                  className={styles.filterSelect}
                >
                  <option value="">All Industries</option>
                  {industries.map((industry) => (
                    <option key={industry} value={industry}>{industry}</option>
                  ))}
                </select>
              </label>

              <label className={styles.filterControl}>
                <span className={styles.filterLabel}>Company</span>
                <select
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                  className={styles.filterSelect}
                >
                  <option value="">All Companies</option>
                  {companies.map((company) => (
                    <option key={company} value={company}>{company}</option>
                  ))}
                </select>
              </label>

              <label className={styles.filterControl}>
                <span className={styles.filterLabel}>Sort</span>
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [newSortBy, newSortOrder] = e.target.value.split('-')
                    setSortBy(newSortBy)
                    setSortOrder(newSortOrder)
                  }}
                  className={styles.filterSelect}
                >
                  <option value="graduation_year-DESC">Latest Batch First</option>
                  <option value="graduation_year-ASC">Oldest Batch First</option>
                  <option value="first_name-ASC">Name A-Z</option>
                  <option value="first_name-DESC">Name Z-A</option>
                </select>
              </label>
            </div>
          </form>
        </div>

        {/* Loading State */}
        {loading && (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Loading alumni...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className={styles.error}>
            <p>⚠️ {error}</p>
            <button onClick={() => fetchAlumni(currentPage)} className={styles.retryButton}>
              Retry
            </button>
          </div>
        )}

        {/* Alumni Grid */}
        {!loading && !error && (
          <>
            <div className={styles.resultsInfo}>
              <p>
                Showing {alumni.length} of {totalRecords} alumni 
                (Page {currentPage} of {totalPages})
              </p>
            </div>

            <div className={styles.alumniGrid}>
              {alumni.map((alum) => {
                // Backend converts `user_id` -> `userId` in API responses.
                // Use `userId` (camelCase) primarily and fall back to `user_id` if present.
                const userId = alum.userId || alum.user_id || null;
                const profileImageUrl = alum.profilePictureUrl
                  ? getAvatarUrl(alum.profilePictureUrl)
                  : null;
                return (
                <div key={alum.id} className={styles.alumniCard}>
                  {/* Large Photo at Top */}
                  <div className={styles.photoContainer}>
                    {profileImageUrl ? (
                      <img 
                        src={profileImageUrl} 
                        alt={`${alum.firstName} ${alum.lastName}`}
                        className={styles.photo}
                        onError={(e) => {
                          handleAvatarError(e)
                          e.target.style.display = 'none'
                          if (e.target.nextSibling) {
                            e.target.nextSibling.style.display = 'flex'
                          }
                        }}
                      />
                    ) : null}
                    <div 
                      className={styles.photoInitials}
                      style={{ display: profileImageUrl ? 'none' : 'flex' }}
                    >
                      {alum.firstName?.charAt(0)}{alum.lastName?.charAt(0)}
                    </div>
                  </div>

                  {/* Compact Info Section */}
                  <div className={styles.infoSection}>
                    <h3 className={styles.alumniName}>
                      {alum.firstName} {alum.lastName}
                    </h3>
                    
                    <p className={styles.educationInfo}>
                      Class of {alum.graduationYear}
                    </p>
                    
                    <p className={styles.degreeInfo}>
                      {alum.degree}, {alum.branch}
                    </p>

                    {(alum.currentPosition || alum.currentCompany) && (
                      <div className={styles.workSection}>
                        {alum.currentPosition && (
                          <p className={styles.positionInfo}>{alum.currentPosition}</p>
                        )}
                        {alum.currentCompany && (
                          <p className={styles.companyInfo}>Currently at {alum.currentCompany}</p>
                        )}
                      </div>
                    )}

                    {alum.currentCity && (
                      <p className={styles.locationInfo}>
                        Based in {alum.currentCity}{alum.currentState ? `, ${alum.currentState}` : ''}
                      </p>
                    )}

                    <div className={styles.actionsRow}>
                      <button 
                        className={styles.viewButton}
                        onClick={() => navigate(`/alumni/${alum.id}`)}
                      >
                        View Profile
                      </button>
                      {userId && (
                        <button
                          className={styles.messageButton}
                          onClick={() => navigate(`/messages?to=${userId}`)}
                          aria-label={`Message ${alum.firstName} ${alum.lastName}`}
                        >
                          Message
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                  )
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={styles.pageButton}
                >
                  Previous
                </button>

                {/* Page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`${styles.pageButton} ${
                        currentPage === pageNum ? styles.active : ''
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={styles.pageButton}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!loading && !error && alumni.length === 0 && (
          <div className={styles.emptyState}>
            <h3>No alumni found</h3>
            <p>Try adjusting your search criteria or filters</p>
            <button onClick={resetFilters} className={styles.resetButton}>
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </>
  )
}

export default AlumniDirectory

import React, { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import styles from './AlumniDirectory.module.css'

const AlumniDirectory = () => {
  const navigate = useNavigate()
  const [alumni, setAlumni] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBatch, setSelectedBatch] = useState('')
  const [selectedBranch, setSelectedBranch] = useState('')
  const [sortBy, setSortBy] = useState('graduation_year')
  const [sortOrder, setSortOrder] = useState('DESC')

  // Get available batches and branches for filters
  const [batches, setBatches] = useState([])
  const [branches, setBranches] = useState([])

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

  // Fetch alumni data
  const fetchAlumni = async (page = 1) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12',
        sortBy,
        sortOrder
      })

      if (searchTerm) params.append('search', searchTerm)
      if (selectedBatch) params.append('batch', selectedBatch)
      if (selectedBranch) params.append('branch', selectedBranch)

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
  }

  // Extract unique batches and branches for filters
  useEffect(() => {
    const uniqueBatches = [...new Set(alumni.map(a => a.graduation_year))].sort((a, b) => b - a)
    const uniqueBranches = [...new Set(alumni.map(a => a.branch))].sort()
    setBatches(uniqueBatches)
    setBranches(uniqueBranches)
  }, [alumni])

  // Initial fetch
  useEffect(() => {
    fetchAlumni(1)
  }, [searchTerm, selectedBatch, selectedBranch, sortBy, sortOrder])

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
    setSortBy('graduation_year')
    setSortOrder('DESC')
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
        <div className={styles.header}>
          <h1 className={styles.title}>Alumni Directory</h1>
          <p className={styles.subtitle}>
            Discover and connect with {totalRecords} IIIT NR alumni worldwide
          </p>
        </div>

        {/* Search and Filters */}
        <div className={styles.filtersSection}>
          <form onSubmit={handleSearch} className={styles.searchForm}>
            <div className={styles.searchGroup}>
              <input
                type="text"
                placeholder="Search by name, company, or skills..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
              <button type="submit" className={styles.searchButton}>
                Search
              </button>
            </div>
          </form>

          <div className={styles.filters}>
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="">All Batches</option>
              {[2018, 2019, 2020, 2021, 2022, 2023].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>

            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="">All Branches</option>
              <option value="Computer Science Engineering">CSE</option>
              <option value="Electronics and Communication Engineering">ECE</option>
              <option value="Information Technology">IT</option>
              <option value="Electrical Engineering">EE</option>
            </select>

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

            <button 
              onClick={resetFilters}
              className={styles.resetButton}
            >
              Reset
            </button>
          </div>
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
              {alumni.map((alum) => (
                <div key={alum.id} className={styles.alumniCard}>
                  <div className={styles.cardHeader}>
                    <div className={styles.avatar}>
                      {alum.profile_picture_url ? (
                        <img 
                          src={alum.profile_picture_url} 
                          alt={`${alum.first_name} ${alum.last_name}`}
                          onError={(e) => {
                            e.target.style.display = 'none'
                            e.target.nextSibling.style.display = 'flex'
                          }}
                        />
                      ) : null}
                      <div 
                        className={styles.avatarInitials}
                        style={{ display: alum.profile_picture_url ? 'none' : 'flex' }}
                      >
                        {alum.first_name?.charAt(0)}{alum.last_name?.charAt(0)}
                      </div>
                    </div>
                    <div className={styles.basicInfo}>
                      <h3 className={styles.name}>
                        {alum.first_name} {alum.last_name}
                      </h3>
                      <p className={styles.batch}>
                        {alum.degree} {alum.branch} • {alum.graduation_year}
                      </p>
                    </div>
                  </div>

                  <div className={styles.cardBody}>
                    {alum.current_company && (
                      <div className={styles.workInfo}>
                        <p className={styles.position}>{alum.current_position}</p>
                        <p className={styles.company}>at {alum.current_company}</p>
                      </div>
                    )}

                    {alum.current_city && (
                      <p className={styles.location}>
                        📍 {alum.current_city}, {alum.current_state}
                      </p>
                    )}

                    {alum.skills && alum.skills.length > 0 && (
                      <div className={styles.skills}>
                        {alum.skills.slice(0, 3).map((skill, index) => (
                          <span key={index} className={styles.skillTag}>
                            {skill}
                          </span>
                        ))}
                        {alum.skills.length > 3 && (
                          <span className={styles.skillTag}>+{alum.skills.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className={styles.cardFooter}>
                    <button 
                      className={styles.viewButton}
                      onClick={() => navigate(`/alumni/${alum.id}`)}
                    >
                      View Profile
                    </button>
                    {alum.linkedin_url && (
                      <a
                        href={alum.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.linkedinButton}
                      >
                        LinkedIn
                      </a>
                    )}
                  </div>
                </div>
              ))}
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

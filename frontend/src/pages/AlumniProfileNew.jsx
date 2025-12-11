import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import axios from 'axios'
import styles from './AlumniProfileNew.module.css'

const API_BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'

const AlumniProfileNew = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [alumni, setAlumni] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

  useEffect(() => {
    const fetchAlumniProfile = async () => {
      try {
        setLoading(true)
        const response = await axios.get(`${API_URL}/alumni/${id}`)
        
        if (response.data.success) {
          setAlumni(response.data.data.alumni)
          setError(null)
        } else {
          setError('Alumni profile not found')
        }
      } catch (err) {
        console.error('Error fetching alumni profile:', err)
        setError(err.response?.data?.message || 'Failed to fetch alumni profile')
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchAlumniProfile()
    }
  }, [id, API_URL])

  const getProfileImageUrl = (url) => {
    if (!url) return '/default-avatar.svg'
    if (url.startsWith('http')) return url
    return `${API_BASE_URL}${url}`
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading profile...</p>
        </div>
      </div>
    )
  }

  if (error || !alumni) {
    return (
      <div className={styles.container}>
        <div className={styles.errorCard}>
          <h2>Profile Not Found</h2>
          <p>{error || 'The requested alumni profile could not be found.'}</p>
          <button onClick={() => navigate('/directory')} className={styles.backBtn}>
            Back to Directory
          </button>
        </div>
      </div>
    )
  }

  const getEmploymentDisplay = () => {
    switch (alumni.employmentStatus) {
      case 'Employed Full-time':
        return `${alumni.currentPosition || 'Professional'} at ${alumni.currentCompany || 'Company'}`
      case 'Self-Employed / Entrepreneur':
        return `Founder at ${alumni.currentCompany || 'Startup'}`
      case 'Freelancing / Consulting':
        return `Freelance ${alumni.targetRole || 'Consultant'}`
      case 'Looking for Opportunities':
        return `Seeking ${alumni.targetRole || 'Opportunities'}`
      case 'Pursuing Higher Education':
        return `${alumni.currentPosition || 'Student'} at ${alumni.institutionName || 'University'}`
      case 'Career Break':
        return 'On Career Break'
      default:
        return alumni.employmentStatus || 'Professional'
    }
  }

  return (
    <>
      <Helmet>
        <title>{alumni.firstName} {alumni.lastName} - IIIT Naya Raipur Alumni</title>
        <meta 
          name="description" 
          content={`Profile of ${alumni.firstName} ${alumni.lastName}, ${alumni.degree} ${alumni.branch} graduate from IIIT Naya Raipur`}
        />
      </Helmet>

      <div className={styles.profilePage}>
        <div className={styles.container}>
          {/* Back Button */}
          <button onClick={() => navigate('/directory')} className={styles.backBtn}>
            Back to Directory
          </button>

          {/* Profile Header Card */}
          <div className={styles.headerCard}>
            <div className={styles.headerBg}></div>
            <div className={styles.headerContent}>
              <div className={styles.avatarSection}>
                <img 
                  src={getProfileImageUrl(alumni.profilePictureUrl)} 
                  alt={`${alumni.firstName} ${alumni.lastName}`}
                  className={styles.avatar}
                  onError={(e) => { e.target.src = '/default-avatar.svg' }}
                />
              </div>
              
              <div className={styles.headerInfo}>
                <h1 className={styles.name}>
                  {alumni.firstName} {alumni.lastName}
                </h1>
                <p className={styles.headline}>{getEmploymentDisplay()}</p>
                <div className={styles.metaTags}>
                  <span className={styles.tag}>
                    {alumni.degree} - {alumni.branch}
                  </span>
                  <span className={styles.tag}>
                    Class of {alumni.graduationYear}
                  </span>
                  {alumni.currentCity && (
                    <span className={styles.tag}>
                      Location: {alumni.currentCity}, {alumni.currentState || alumni.currentCountry}
                    </span>
                  )}
                  {alumni.industry && (
                    <span className={styles.tag}>
                      Industry: {alumni.industry}
                    </span>
                  )}
                </div>

                {/* Social Links */}
                <div className={styles.socialLinks}>
                  {alumni.linkedinUrl && (
                    <a href={alumni.linkedinUrl} target="_blank" rel="noopener noreferrer" className={styles.socialBtn}>
                      <svg className={styles.socialIcon} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                      </svg>
                      LinkedIn
                    </a>
                  )}
                  {alumni.githubUrl && (
                    <a href={alumni.githubUrl} target="_blank" rel="noopener noreferrer" className={styles.socialBtn}>
                      <svg className={styles.socialIcon} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                      GitHub
                    </a>
                  )}
                  {alumni.twitterUrl && (
                    <a href={alumni.twitterUrl} target="_blank" rel="noopener noreferrer" className={styles.socialBtn}>
                      <svg className={styles.socialIcon} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                      </svg>
                      Twitter
                    </a>
                  )}
                  {alumni.portfolioUrl && (
                    <a href={alumni.portfolioUrl} target="_blank" rel="noopener noreferrer" className={styles.socialBtn}>
                      <svg className={styles.socialIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                      Portfolio
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Content Sections */}
          <div className={styles.contentSections}>
            <section className={styles.sectionGroup}>
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.sectionEyebrow}>Status & Background</p>
                </div>
              </div>

              <div className={styles.cardGrid}>
                {/* Current Status */}
                <div className={styles.card}>
                  <h3 className={styles.cardTitle}>Current Status</h3>
                  <div className={styles.infoList}>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Employment Status</span>
                      <span className={styles.infoValue}>{alumni.employmentStatus || 'Not specified'}</span>
                    </div>
                    {alumni.industry && (
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Industry</span>
                        <span className={styles.infoValue}>{alumni.industry}</span>
                      </div>
                    )}
                    {alumni.currentCompany && (
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Company</span>
                        <span className={styles.infoValue}>{alumni.currentCompany}</span>
                      </div>
                    )}
                    {alumni.currentPosition && (
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Position</span>
                        <span className={styles.infoValue}>{alumni.currentPosition}</span>
                      </div>
                    )}
                    {alumni.targetRole && (
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Target Role</span>
                        <span className={styles.infoValue}>{alumni.targetRole}</span>
                      </div>
                    )}
                    {alumni.institutionName && (
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Institution</span>
                        <span className={styles.infoValue}>{alumni.institutionName}</span>
                      </div>
                    )}
                    {alumni.expectedCompletionYear && (
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Expected Completion</span>
                        <span className={styles.infoValue}>{alumni.expectedCompletionYear}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Academic Background */}
                <div className={styles.card}>
                  <h3 className={styles.cardTitle}>Academic Background</h3>
                  <div className={styles.infoList}>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Roll Number</span>
                      <span className={styles.infoValue}>{alumni.studentId || 'N/A'}</span>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Degree</span>
                      <span className={styles.infoValue}>{alumni.degree}</span>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Branch</span>
                      <span className={styles.infoValue}>{alumni.branch}</span>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Graduation Year</span>
                      <span className={styles.infoValue}>{alumni.graduationYear}</span>
                    </div>
                  </div>
                </div>

                {/* Location */}
                {alumni.currentCity && (
                  <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Location</h3>
                    <div className={styles.infoList}>
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>City</span>
                        <span className={styles.infoValue}>{alumni.currentCity}</span>
                      </div>
                      {alumni.currentState && (
                        <div className={styles.infoItem}>
                          <span className={styles.infoLabel}>State</span>
                          <span className={styles.infoValue}>{alumni.currentState}</span>
                        </div>
                      )}
                      {alumni.currentCountry && (
                        <div className={styles.infoItem}>
                          <span className={styles.infoLabel}>Country</span>
                          <span className={styles.infoValue}>{alumni.currentCountry}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className={styles.sectionGroup}>
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.sectionEyebrow}>Professional & Community</p>
                </div>
              </div>

              <div className={styles.cardGrid}>
                {/* Professional Interests */}
                {alumni.professionalInterests && alumni.professionalInterests.length > 0 && (
                  <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Professional Interests</h3>
                    <div className={styles.chipContainer}>
                      {alumni.professionalInterests.map((interest, index) => (
                        <span key={index} className={styles.chip}>
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Career Goals */}
                {alumni.careerGoals && alumni.careerGoals.length > 0 && (
                  <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Career Goals</h3>
                    <div className={styles.goalsList}>
                      {alumni.careerGoals.map((goal, index) => (
                        <div key={index} className={styles.goalItem}>
                          <span className={styles.goalIcon}>*</span>
                          <span>{goal}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Engagement */}
                {(alumni.interestedInMentoring || alumni.openToReferrals || alumni.availableForSpeaking) && (
                  <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Community Engagement</h3>
                    <div className={styles.engagementList}>
                      {alumni.interestedInMentoring && (
                        <div className={styles.engagementItem}>
                          <span>Available for Mentoring</span>
                        </div>
                      )}
                      {alumni.openToReferrals && (
                        <div className={styles.engagementItem}>
                          <span>Open to Referrals</span>
                        </div>
                      )}
                      {alumni.availableForSpeaking && (
                        <div className={styles.engagementItem}>
                          <span>Available for Speaking</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  )
}

export default AlumniProfileNew

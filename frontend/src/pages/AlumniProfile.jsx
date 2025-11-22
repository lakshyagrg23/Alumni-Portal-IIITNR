import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import axios from 'axios'
import { getAvatarUrl, handleAvatarError } from '@utils/avatarUtils'
import styles from './AlumniProfile.module.css'

const AlumniProfile = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [alumni, setAlumni] = useState(null)
  const [workExperiences, setWorkExperiences] = useState([])
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
          setWorkExperiences(response.data.data.workExperiences || [])
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

  if (loading) {
    return (
      <div className={styles.profileContainer}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading profile...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.profileContainer}>
        <div className={styles.error}>
          <h2>Profile Not Found</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/directory')} className={styles.backButton}>
            Back to Directory
          </button>
        </div>
      </div>
    )
  }

  if (!alumni) {
    return (
      <div className={styles.profileContainer}>
        <div className={styles.error}>
          <h2>Profile Not Found</h2>
          <p>The requested alumni profile could not be found.</p>
          <button onClick={() => navigate('/directory')} className={styles.backButton}>
            Back to Directory
          </button>
        </div>
      </div>
    )
  }

  const profileImageUrl = alumni.profilePictureUrl
    ? getAvatarUrl(alumni.profilePictureUrl)
    : null

  return (
    <>
      <Helmet>
        <title>{alumni.firstName} {alumni.lastName} - IIIT Naya Raipur Alumni</title>
        <meta 
          name="description" 
          content={`Profile of ${alumni.firstName} ${alumni.lastName}, ${alumni.degree} ${alumni.branch} graduate from IIIT Naya Raipur`}
        />
      </Helmet>

      <div className={styles.profileContainer}>
        {/* Back Button */}
        <button onClick={() => navigate('/directory')} className={styles.backButton}>
          ← Back to Directory
        </button>

        {/* Profile Header */}
        <div className={styles.profileHeader}>
          <div className={styles.profilePicture}>
            {profileImageUrl ? (
              <img 
                src={profileImageUrl} 
                alt={`${alumni.firstName} ${alumni.lastName}`}
                className={styles.profileImage}
                onError={handleAvatarError}
              />
            ) : (
              <div className={styles.avatarInitials}>
                {alumni.firstName?.charAt(0)}{alumni.lastName?.charAt(0)}
              </div>
            )}
          </div>

          <div className={styles.profileInfo}>
            <h1 className={styles.name}>
              {alumni.firstName} {alumni.lastName}
            </h1>
            
            <div className={styles.basicInfo}>
              <p className={styles.education}>
                {alumni.degree} in {alumni.branch} • Class of {alumni.graduationYear}
              </p>
              
              {alumni.currentCompany && (
                <p className={styles.currentWork}>
                  {alumni.currentPosition} at {alumni.currentCompany}
                </p>
              )}
              
              {alumni.currentCity && (
                <p className={styles.location}>
                  📍 {alumni.currentCity}, {alumni.currentState}
                </p>
              )}
            </div>

            <div className={styles.profileActions}>
              {alumni.linkedinUrl && (
                <a
                  href={alumni.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.linkedinButton}
                >
                  View LinkedIn
                </a>
              )}
              <button className={styles.messageButton}>
                Send Message
              </button>
            </div>
          </div>
        </div>

        {/* Profile Content */}
        <div className={styles.profileContent}>
          {/* About Section */}
          {alumni.bio && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>About</h2>
              <div className={styles.sectionContent}>
                <p className={styles.bio}>{alumni.bio}</p>
              </div>
            </div>
          )}

          {/* Skills Section */}
          {alumni.skills && alumni.skills.length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Skills</h2>
              <div className={styles.sectionContent}>
                <div className={styles.skillsGrid}>
                  {alumni.skills.map((skill, index) => (
                    <span key={index} className={styles.skillTag}>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Work Experience Section */}
          {workExperiences.length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Work Experience</h2>
              <div className={styles.sectionContent}>
                <div className={styles.experienceList}>
                  {workExperiences.map((exp, index) => (
                    <div key={index} className={styles.experienceItem}>
                      <div className={styles.experienceHeader}>
                        <h3 className={styles.experienceTitle}>{exp.position}</h3>
                        <span className={styles.experienceDuration}>
                          {exp.start_date} - {exp.end_date || 'Present'}
                        </span>
                      </div>
                      <p className={styles.experienceCompany}>{exp.company_name}</p>
                      {exp.location && (
                        <p className={styles.experienceLocation}>📍 {exp.location}</p>
                      )}
                      {exp.description && (
                        <p className={styles.experienceDescription}>{exp.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Contact Information */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Contact Information</h2>
            <div className={styles.sectionContent}>
              <div className={styles.contactGrid}>
                {alumni.email && (
                  <div className={styles.contactItem}>
                    <span className={styles.contactLabel}>Email:</span>
                    <a href={`mailto:${alumni.email}`} className={styles.contactValue}>
                      {alumni.email}
                    </a>
                  </div>
                )}
                
                {alumni.phone && (
                  <div className={styles.contactItem}>
                    <span className={styles.contactLabel}>Phone:</span>
                    <span className={styles.contactValue}>{alumni.phone}</span>
                  </div>
                )}

                {alumni.linkedinUrl && (
                  <div className={styles.contactItem}>
                    <span className={styles.contactLabel}>LinkedIn:</span>
                    <a 
                      href={alumni.linkedinUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={styles.contactValue}
                    >
                      View Profile
                    </a>
                  </div>
                )}

                {alumni.githubUrl && (
                  <div className={styles.contactItem}>
                    <span className={styles.contactLabel}>GitHub:</span>
                    <a 
                      href={alumni.githubUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={styles.contactValue}
                    >
                      View Profile
                    </a>
                  </div>
                )}

                {alumni.portfolioUrl && (
                  <div className={styles.contactItem}>
                    <span className={styles.contactLabel}>Website:</span>
                    <a 
                      href={alumni.portfolioUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={styles.contactValue}
                    >
                      Visit Website
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Professional Details */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Professional Details</h2>
            <div className={styles.sectionContent}>
              <div className={styles.detailsGrid}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Graduation Year:</span>
                  <span className={styles.detailValue}>{alumni.graduationYear}</span>
                </div>
                
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Degree:</span>
                  <span className={styles.detailValue}>{alumni.degree}</span>
                </div>
                
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Branch:</span>
                  <span className={styles.detailValue}>{alumni.branch}</span>
                </div>

                {alumni.currentCompany && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Current Company:</span>
                    <span className={styles.detailValue}>{alumni.currentCompany}</span>
                  </div>
                )}

                {alumni.currentPosition && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Current Position:</span>
                    <span className={styles.detailValue}>{alumni.currentPosition}</span>
                  </div>
                )}

                {alumni.workExperienceYears && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Experience:</span>
                    <span className={styles.detailValue}>{alumni.workExperienceYears} years</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default AlumniProfile

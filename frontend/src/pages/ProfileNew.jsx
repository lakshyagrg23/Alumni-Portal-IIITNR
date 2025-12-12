import React, { useState, useEffect, useRef } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@hooks/useAuth'
import { authService } from '../services/authService'
import axios from 'axios'
import styles from './ProfileNew.module.css'

const API_BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'

// Professional Interests options
const PROFESSIONAL_INTERESTS = [
  'Software Development (Web/Mobile/Desktop)',
  'Data Science & Analytics',
  'Machine Learning & AI',
  'Cloud Computing & DevOps',
  'Cybersecurity',
  'Blockchain & Web3',
  'Hardware & Embedded Systems',
  'Product Management',
  'Project Management',
  'Business Strategy & Consulting',
  'Marketing & Growth',
  'Sales & Business Development',
  'Finance & Investment',
  'UI/UX Design',
  'Graphic Design & Branding',
  'Research & Development',
  'Teaching & Academia',
  'Entrepreneurship & Startups',
]

// Career Goals options
const CAREER_GOALS = [
  'Building/Growing my Startup',
  'Pursuing Higher Education (Masters/PhD)',
  'Research & Development Career',
  'Moving into Leadership/Management Roles',
  'Becoming a Technical Expert/Specialist',
  'Transitioning to a Different Industry/Role',
  'Freelancing/Independent Consulting',
]

// Employment Status options
const EMPLOYMENT_STATUS_OPTIONS = [
  'Employed Full-time',
  'Self-Employed / Entrepreneur',
  'Freelancing / Consulting',
  'Looking for Opportunities',
  'Pursuing Higher Education',
  'Career Break',
]

// Industry options
const INDUSTRY_OPTIONS = [
  'Information Technology / Software',
  'Product Development / SaaS',
  'Consulting / Professional Services',
  'Financial Services / Banking / Fintech',
  'Healthcare / Biotech / Pharmaceuticals',
  'E-commerce / Retail',
  'Education / EdTech',
  'Media / Entertainment / Gaming',
  'Telecommunications',
  'Manufacturing / Engineering',
  'Energy / Utilities',
  'Real Estate / Construction',
  'Transportation / Logistics',
  'Government / Public Sector',
  'Non-Profit / Social Impact',
  'Research & Development / Academia',
  'Agriculture / Food Tech',
  'Legal / Law',
  'Other',
]

const Profile = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('interests') // Default to interests for both
  const [message, setMessage] = useState({ type: '', text: '' })

  // Redirect admins - they shouldn't have profiles
  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'superadmin') {
      navigate('/admin', { replace: true })
    }
  }, [user, navigate])

  // Institute data (read-only)
  const [instituteData, setInstituteData] = useState({
    firstName: '',
    lastName: '',
    rollNumber: '',
    degree: '',
    branch: '',
    graduationYear: '',
    profilePicture: '',
  })

  // Editable profile data
  const [profileData, setProfileData] = useState({
    // Professional Details
    currentCity: '',
    currentState: '',
    currentCountry: 'India',
    employmentStatus: '',
    currentCompany: '',
    currentPosition: '',
    targetRole: '',
    institutionName: '',
    expectedCompletionYear: '',
    industry: '',
    
    // Skills & Interests
    professionalInterests: [],
    linkedinUrl: '',
    githubUrl: '',
    twitterUrl: '',
    portfolioUrl: '',
    
    // Career Goals & Engagement
    careerGoals: [],
    interestedInMentoring: false,
    openToReferrals: false,
    availableForSpeaking: false,
  })

  const [errors, setErrors] = useState({})
  const [uploadingPicture, setUploadingPicture] = useState(false)
  const [isCurrentStudent, setIsCurrentStudent] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    loadProfileData()
  }, [])

  const loadProfileData = async () => {
    try {
      setLoading(true)
      const response = await authService.getProfile()
      
      if (response.success) {
        const { data } = response
        const alumni = data.alumniProfile || {}

        // Set institute data (read-only)
        const gradYear = alumni.graduationYear || 0
        const currentYear = new Date().getFullYear()
        const isStudent = gradYear > currentYear
        
        setInstituteData({
          firstName: data.firstName || alumni.firstName || '',
          lastName: data.lastName || alumni.lastName || '',
          rollNumber: alumni.studentId || '',
          degree: alumni.degree || '',
          branch: alumni.branch || '',
          graduationYear: alumni.graduationYear || '',
          profilePicture: alumni.profilePictureUrl || data.profilePicture || '',
        })
        
        setIsCurrentStudent(isStudent)

        // Set editable profile data
        setProfileData({
          currentCity: alumni.currentCity || '',
          currentState: alumni.currentState || '',
          currentCountry: alumni.currentCountry || 'India',
          employmentStatus: alumni.employmentStatus || '',
          currentCompany: alumni.currentCompany || '',
          currentPosition: alumni.currentPosition || '',
          targetRole: alumni.targetRole || '',
          institutionName: alumni.institutionName || '',
          expectedCompletionYear: alumni.expectedCompletionYear || '',
          industry: alumni.industry || '',
          professionalInterests: Array.isArray(alumni.professionalInterests) 
            ? alumni.professionalInterests 
            : Array.isArray(alumni.skills)
            ? alumni.skills
            : [],
          linkedinUrl: alumni.linkedinUrl || '',
          githubUrl: alumni.githubUrl || '',
          twitterUrl: alumni.twitterUrl || '',
          portfolioUrl: alumni.portfolioUrl || '',
          careerGoals: Array.isArray(alumni.careerGoals) ? alumni.careerGoals : [],
          interestedInMentoring: alumni.interestedInMentoring || false,
          openToReferrals: alumni.openToReferrals || false,
          availableForSpeaking: alumni.availableForSpeaking || false,
        })
      }
    } catch (error) {
      console.error('Error loading profile:', error)
      setMessage({ type: 'error', text: 'Failed to load profile data' })
    } finally {
      setLoading(false)
    }
  }

  const handlePictureSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setMessage({ type: 'error', text: 'Please select a valid image (JPEG, PNG, or WebP)' })
      return
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image size must be less than 2MB' })
      return
    }

    setUploadingPicture(true)
    setMessage({ type: '', text: '' })

    try {
      const formData = new FormData()
      formData.append('profilePicture', file)

      const token = localStorage.getItem('token')
      const response = await axios.post(
        `${API_BASE_URL}/api/alumni/profile/upload-picture`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (response.data.success) {
        setInstituteData(prev => ({
          ...prev,
          profilePicture: response.data.data.profilePictureUrl
        }))
        setMessage({ type: 'success', text: 'Profile picture updated!' })
        setTimeout(() => setMessage({ type: '', text: '' }), 3000)
      }
    } catch (error) {
      console.error('Picture upload error:', error)
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to upload picture' 
      })
    } finally {
      setUploadingPicture(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setProfileData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleInterestToggle = (interest) => {
    setProfileData(prev => ({
      ...prev,
      professionalInterests: prev.professionalInterests.includes(interest)
        ? prev.professionalInterests.filter(i => i !== interest)
        : [...prev.professionalInterests, interest]
    }))
  }

  const handleCareerGoalToggle = (goal) => {
    setProfileData(prev => ({
      ...prev,
      careerGoals: prev.careerGoals.includes(goal)
        ? prev.careerGoals.filter(g => g !== goal)
        : [...prev.careerGoals, goal]
    }))
  }

  const validateForm = () => {
    const newErrors = {}

    // Skip professional validation for current students
    if (!isCurrentStudent) {
      // Validate professional details (alumni only)
      if (!profileData.currentCity.trim()) {
        newErrors.currentCity = 'City is required'
      }
      if (!profileData.currentState.trim()) {
        newErrors.currentState = 'State is required'
      }
      if (!profileData.currentCountry.trim()) {
        newErrors.currentCountry = 'Country is required'
      }
      if (!profileData.employmentStatus) {
        newErrors.employmentStatus = 'Employment status is required'
      }
      if (!profileData.industry) {
        newErrors.industry = 'Industry/domain is required'
      }

      // Conditional validation based on employment status (alumni only)
      if (profileData.employmentStatus === 'Employed Full-time') {
      if (!profileData.currentCompany.trim()) {
        newErrors.currentCompany = 'Company name is required'
      }
      if (!profileData.currentPosition.trim()) {
        newErrors.currentPosition = 'Job title is required'
      }
    } else if (profileData.employmentStatus === 'Self-Employed / Entrepreneur') {
      if (!profileData.currentCompany.trim()) {
        newErrors.currentCompany = 'Company/venture name is required'
      }
      if (!profileData.currentPosition.trim()) {
        newErrors.currentPosition = 'Your role is required'
      }
    } else if (profileData.employmentStatus === 'Freelancing / Consulting') {
      if (!profileData.targetRole.trim()) {
        newErrors.targetRole = 'Primary service area is required'
      }
    } else if (profileData.employmentStatus === 'Looking for Opportunities') {
      if (!profileData.targetRole.trim()) {
        newErrors.targetRole = 'Target role is required'
      }
    } else if (profileData.employmentStatus === 'Pursuing Higher Education') {
      if (!profileData.institutionName.trim()) {
        newErrors.institutionName = 'Institution name is required'
      }
      if (!profileData.currentPosition.trim()) {
        newErrors.currentPosition = 'Program/degree is required'
      }
    }
    }

    // Validate professional interests (required for all)
    if (profileData.professionalInterests.length < 1) {
      newErrors.professionalInterests = 'Please select at least 1 professional interest'
    }
    if (profileData.professionalInterests.length > 7) {
      newErrors.professionalInterests = 'Please select at most 7 professional interests'
    }

    // Validate LinkedIn URL
    if (!profileData.linkedinUrl.trim()) {
      newErrors.linkedinUrl = 'LinkedIn profile URL is required'
    } else if (!profileData.linkedinUrl.includes('linkedin.com')) {
      newErrors.linkedinUrl = 'Please enter a valid LinkedIn URL'
    }

    // Validate other URLs if provided
    if (profileData.githubUrl && !profileData.githubUrl.includes('github.com')) {
      newErrors.githubUrl = 'Please enter a valid GitHub URL'
    }
    if (profileData.twitterUrl && !profileData.twitterUrl.includes('twitter.com') && !profileData.twitterUrl.includes('x.com')) {
      newErrors.twitterUrl = 'Please enter a valid Twitter/X URL'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      console.log('Validation errors:', errors)
      setMessage({ type: 'error', text: 'Please fix the errors below' })
      // Scroll to first error
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    try {
      setSaving(true)
      setMessage({ type: '', text: '' })

      // Prepare data for submission
      const submitData = {
        // Keep institute data (except profilePicture which is uploaded separately)
        firstName: instituteData.firstName,
        lastName: instituteData.lastName,
        studentId: instituteData.rollNumber,
        degree: instituteData.degree,
        branch: instituteData.branch,
        graduationYear: instituteData.graduationYear,
        
        // Common fields for all users
        professionalInterests: profileData.professionalInterests,
        linkedinUrl: profileData.linkedinUrl || null,
        githubUrl: profileData.githubUrl || null,
        twitterUrl: profileData.twitterUrl || null,
        portfolioUrl: profileData.portfolioUrl || null,
        careerGoals: profileData.careerGoals,
      }
      
      // Add professional fields only for alumni
      if (!isCurrentStudent) {
        submitData.currentCity = profileData.currentCity || null
        submitData.currentState = profileData.currentState || null
        submitData.currentCountry = profileData.currentCountry || 'India'
        submitData.employmentStatus = profileData.employmentStatus || null
        submitData.currentCompany = profileData.currentCompany || null
        submitData.currentPosition = profileData.currentPosition || null
        submitData.targetRole = profileData.targetRole || null
        submitData.institutionName = profileData.institutionName || null
        submitData.expectedCompletionYear = profileData.expectedCompletionYear || null
        submitData.industry = profileData.industry || null
        submitData.interestedInMentoring = profileData.interestedInMentoring
        submitData.openToReferrals = profileData.openToReferrals
        submitData.availableForSpeaking = profileData.availableForSpeaking
      }

      console.log('Submitting profile data:', submitData)

      const response = await authService.updateProfile(submitData)

      if (response.success) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' })
        setTimeout(() => setMessage({ type: '', text: '' }), 3000)
      } else {
        setMessage({ type: 'error', text: response.message || 'Failed to update profile' })
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      setMessage({ type: 'error', text: 'An error occurred while updating profile' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading profile...</p>
      </div>
    )
  }

  return (
    <>
      <Helmet>
        <title>My Profile - IIIT Naya Raipur Alumni Portal</title>
      </Helmet>

      <div className={styles.profilePage}>
        <div className={styles.container}>
          {/* Message Display */}
          {message.text && (
            <div className={`${styles.message} ${styles[message.type]}`}>
              {message.text}
            </div>
          )}

          {/* Error Summary */}
          {Object.keys(errors).length > 0 && (
            <div className={styles.errorSummary}>
              <h4>⚠️ Please fix the following errors:</h4>
              <ul>
                {Object.entries(errors).map(([field, error]) => (
                  <li key={field}>
                    <strong>{field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</strong> {error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Basic Information Card (Read-only) */}
          <div className={styles.basicInfoCard}>
            <div className={styles.basicInfoHeader}>
              <div className={styles.headerLeft}>
                <h3>Basic Information</h3>
                <span className={styles.verifiedBadge}>✓ Verified</span>
              </div>
              <div className={styles.profilePictureWrapper}>
                <div className={styles.avatarContainer}>
                  <img 
                    src={
                      instituteData.profilePicture 
                        ? (instituteData.profilePicture.startsWith('http') 
                            ? instituteData.profilePicture 
                            : `${API_BASE_URL}${instituteData.profilePicture}`)
                        : '/default-avatar.svg'
                    } 
                    alt="Profile"
                    className={styles.avatarImage}
                    onError={(e) => { e.target.src = '/default-avatar.svg' }}
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handlePictureSelect}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={styles.uploadButton}
                    disabled={uploadingPicture}
                  >
                    {uploadingPicture ? '⟳' : '📷'}
                  </button>
                </div>
                <span className={styles.uploadHint}>
                  {uploadingPicture ? 'Uploading...' : 'Click camera to upload *'}
                </span>
              </div>
            </div>
            <div className={styles.basicInfoContent}>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <label>Name</label>
                  <p>{instituteData.firstName} {instituteData.lastName}</p>
                </div>
                {instituteData.rollNumber && (
                  <div className={styles.infoItem}>
                    <label>Roll Number</label>
                    <p>{instituteData.rollNumber}</p>
                  </div>
                )}
                {instituteData.degree && instituteData.branch && (
                  <div className={styles.infoItem}>
                    <label>Program</label>
                    <p>{instituteData.degree} - {instituteData.branch}</p>
                  </div>
                )}
                {instituteData.graduationYear && (
                  <div className={styles.infoItem}>
                    <label>Graduation Year</label>
                    <p className={styles.gradYear}>{instituteData.graduationYear}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className={styles.tabNav}>
            {!isCurrentStudent && (
              <button 
                className={`${styles.tab} ${activeTab === 'professional' ? styles.active : ''}`}
                onClick={() => setActiveTab('professional')}
              >
                Professional Details
              </button>
            )}
            <button 
              className={`${styles.tab} ${activeTab === 'interests' ? styles.active : ''}`}
              onClick={() => setActiveTab('interests')}
            >
              Interests & Goals
            </button>
            <button 
              className={`${styles.tab} ${activeTab === 'social' ? styles.active : ''}`}
              onClick={() => setActiveTab('social')}
            >
              {isCurrentStudent ? 'Social Profiles' : 'Social & Community'}
            </button>
          </div>

          {/* Editable Profile Form */}
          <form onSubmit={handleSubmit} className={styles.profileForm}>
            {/* Professional Details Tab - Alumni Only */}
            {!isCurrentStudent && activeTab === 'professional' && (
              <div className={styles.tabContent}>
                <h3>Professional Details</h3>

                {/* Current Location */}
                <div className={styles.section}>
                  <h4>Current Location</h4>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label htmlFor="currentCity">
                        City <span className={styles.required}>*</span>
                      </label>
                      <input
                        type="text"
                        id="currentCity"
                        name="currentCity"
                        value={profileData.currentCity}
                        onChange={handleInputChange}
                        placeholder="e.g., Bangalore"
                        className={errors.currentCity ? styles.inputError : ''}
                      />
                      {errors.currentCity && (
                        <span className={styles.errorText}>{errors.currentCity}</span>
                      )}
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor="currentState">
                        State <span className={styles.required}>*</span>
                      </label>
                      <input
                        type="text"
                        id="currentState"
                        name="currentState"
                        value={profileData.currentState}
                        onChange={handleInputChange}
                        placeholder="e.g., Karnataka"
                        className={errors.currentState ? styles.inputError : ''}
                      />
                      {errors.currentState && (
                        <span className={styles.errorText}>{errors.currentState}</span>
                      )}
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor="currentCountry">
                        Country <span className={styles.required}>*</span>
                      </label>
                      <input
                        type="text"
                        id="currentCountry"
                        name="currentCountry"
                        value={profileData.currentCountry}
                        onChange={handleInputChange}
                        placeholder="e.g., India"
                        className={errors.currentCountry ? styles.inputError : ''}
                      />
                      {errors.currentCountry && (
                        <span className={styles.errorText}>{errors.currentCountry}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Employment Information */}
                <div className={styles.section}>
                  <h4>Employment Information</h4>
                  <div className={styles.formGroup}>
                    <label htmlFor="employmentStatus">
                      Employment Status <span className={styles.required}>*</span>
                    </label>
                    <select
                      id="employmentStatus"
                      name="employmentStatus"
                      value={profileData.employmentStatus}
                      onChange={handleInputChange}
                      className={errors.employmentStatus ? styles.inputError : ''}
                    >
                      <option value="">Select Employment Status</option>
                      {EMPLOYMENT_STATUS_OPTIONS.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                    {errors.employmentStatus && (
                      <span className={styles.errorText}>{errors.employmentStatus}</span>
                    )}
                  </div>

                  {/* Conditional Fields Based on Employment Status */}
                  {profileData.employmentStatus === 'Employed Full-time' && (
                    <>
                      <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                          <label htmlFor="currentCompany">
                            Company Name <span className={styles.required}>*</span>
                          </label>
                          <input
                            type="text"
                            id="currentCompany"
                            name="currentCompany"
                            value={profileData.currentCompany}
                            onChange={handleInputChange}
                            placeholder="e.g., Google, Microsoft"
                            className={errors.currentCompany ? styles.inputError : ''}
                          />
                          {errors.currentCompany && (
                            <span className={styles.errorText}>{errors.currentCompany}</span>
                          )}
                        </div>
                        <div className={styles.formGroup}>
                          <label htmlFor="currentPosition">
                            Job Title/Position <span className={styles.required}>*</span>
                          </label>
                          <input
                            type="text"
                            id="currentPosition"
                            name="currentPosition"
                            value={profileData.currentPosition}
                            onChange={handleInputChange}
                            placeholder="e.g., Software Engineer"
                            className={errors.currentPosition ? styles.inputError : ''}
                          />
                          {errors.currentPosition && (
                            <span className={styles.errorText}>{errors.currentPosition}</span>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {profileData.employmentStatus === 'Self-Employed / Entrepreneur' && (
                    <>
                      <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                          <label htmlFor="currentCompany">
                            Company/Venture Name <span className={styles.required}>*</span>
                          </label>
                          <input
                            type="text"
                            id="currentCompany"
                            name="currentCompany"
                            value={profileData.currentCompany}
                            onChange={handleInputChange}
                            placeholder="e.g., Your Startup Name"
                            className={errors.currentCompany ? styles.inputError : ''}
                          />
                          {errors.currentCompany && (
                            <span className={styles.errorText}>{errors.currentCompany}</span>
                          )}
                        </div>
                        <div className={styles.formGroup}>
                          <label htmlFor="currentPosition">
                            Your Role <span className={styles.required}>*</span>
                          </label>
                          <input
                            type="text"
                            id="currentPosition"
                            name="currentPosition"
                            value={profileData.currentPosition}
                            onChange={handleInputChange}
                            placeholder="e.g., Founder, Co-founder"
                            className={errors.currentPosition ? styles.inputError : ''}
                          />
                          {errors.currentPosition && (
                            <span className={styles.errorText}>{errors.currentPosition}</span>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {profileData.employmentStatus === 'Freelancing / Consulting' && (
                    <div className={styles.formGroup}>
                      <label htmlFor="targetRole">
                        Primary Service Area <span className={styles.required}>*</span>
                      </label>
                      <input
                        type="text"
                        id="targetRole"
                        name="targetRole"
                        value={profileData.targetRole}
                        onChange={handleInputChange}
                        placeholder="e.g., Software Development, Design Consulting"
                        className={errors.targetRole ? styles.inputError : ''}
                      />
                      {errors.targetRole && (
                        <span className={styles.errorText}>{errors.targetRole}</span>
                      )}
                    </div>
                  )}

                  {profileData.employmentStatus === 'Looking for Opportunities' && (
                    <div className={styles.formGroup}>
                      <label htmlFor="targetRole">
                        Target Role <span className={styles.required}>*</span>
                      </label>
                      <input
                        type="text"
                        id="targetRole"
                        name="targetRole"
                        value={profileData.targetRole}
                        onChange={handleInputChange}
                        placeholder="e.g., Software Engineer, Product Manager"
                        className={errors.targetRole ? styles.inputError : ''}
                      />
                      {errors.targetRole && (
                        <span className={styles.errorText}>{errors.targetRole}</span>
                      )}
                    </div>
                  )}

                  {profileData.employmentStatus === 'Pursuing Higher Education' && (
                    <>
                      <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                          <label htmlFor="institutionName">
                            Institution Name <span className={styles.required}>*</span>
                          </label>
                          <input
                            type="text"
                            id="institutionName"
                            name="institutionName"
                            value={profileData.institutionName}
                            onChange={handleInputChange}
                            placeholder="e.g., MIT, Stanford University"
                            className={errors.institutionName ? styles.inputError : ''}
                          />
                          {errors.institutionName && (
                            <span className={styles.errorText}>{errors.institutionName}</span>
                          )}
                        </div>
                        <div className={styles.formGroup}>
                          <label htmlFor="currentPosition">
                            Program/Degree <span className={styles.required}>*</span>
                          </label>
                          <input
                            type="text"
                            id="currentPosition"
                            name="currentPosition"
                            value={profileData.currentPosition}
                            onChange={handleInputChange}
                            placeholder="e.g., MS in Computer Science"
                            className={errors.currentPosition ? styles.inputError : ''}
                          />
                          {errors.currentPosition && (
                            <span className={styles.errorText}>{errors.currentPosition}</span>
                          )}
                        </div>
                      </div>
                      <div className={styles.formGroup}>
                        <label htmlFor="expectedCompletionYear">
                          Expected Completion Year
                        </label>
                        <input
                          type="number"
                          id="expectedCompletionYear"
                          name="expectedCompletionYear"
                          value={profileData.expectedCompletionYear}
                          onChange={handleInputChange}
                          min="2024"
                          max="2030"
                          placeholder="e.g., 2026"
                        />
                      </div>
                    </>
                  )}

                  <div className={styles.formGroup}>
                    <label htmlFor="industry">
                      Industry/Domain <span className={styles.required}>*</span>
                    </label>
                    <select
                      id="industry"
                      name="industry"
                      value={profileData.industry}
                      onChange={handleInputChange}
                      className={errors.industry ? styles.inputError : ''}
                    >
                      <option value="">Select Industry/Domain</option>
                      {INDUSTRY_OPTIONS.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                    {errors.industry && (
                      <span className={styles.errorText}>{errors.industry}</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Interests & Goals Tab */}
            {activeTab === 'interests' && (
              <div className={styles.tabContent}>
                <h3>Professional Interests & Career Goals</h3>

                {/* Professional Interests */}
                <div className={styles.section}>
                  <h4>
                    Professional Interests <span className={styles.required}>*</span>
                  </h4>
                  <p className={styles.helpText}>
                    Select 1-7 areas that match your expertise and interests
                  </p>
                  <div className={styles.chipContainer}>
                    {PROFESSIONAL_INTERESTS.map(interest => (
                      <button
                        key={interest}
                        type="button"
                        className={`${styles.chip} ${
                          profileData.professionalInterests.includes(interest)
                            ? styles.chipActive
                            : ''
                        }`}
                        onClick={() => handleInterestToggle(interest)}
                      >
                        {interest}
                      </button>
                    ))}
                  </div>
                  {errors.professionalInterests && (
                    <span className={styles.errorText}>{errors.professionalInterests}</span>
                  )}
                  <p className={styles.countText}>
                    Selected: {profileData.professionalInterests.length} / 7
                  </p>
                </div>

                {/* Career Aspirations */}
                <div className={styles.section}>
                  <h4>Career Aspirations</h4>
                  <p className={styles.helpText}>
                    Select all that apply to your career goals
                  </p>
                  <div className={styles.chipContainer}>
                    {CAREER_GOALS.map(goal => (
                      <button
                        key={goal}
                        type="button"
                        className={`${styles.chip} ${
                          profileData.careerGoals.includes(goal)
                            ? styles.chipActive
                            : ''
                        }`}
                        onClick={() => handleCareerGoalToggle(goal)}
                      >
                        {goal}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Social & Community Tab */}
            {activeTab === 'social' && (
              <div className={styles.tabContent}>
                <h3>{isCurrentStudent ? 'Social Profiles' : 'Social Profiles & Community Engagement'}</h3>

                {/* Social Profiles */}
                <div className={styles.section}>
                  <h4>Social Profiles</h4>
                  
                  <div className={styles.formGroup}>
                    <label htmlFor="linkedinUrl">
                      LinkedIn Profile <span className={styles.required}>*</span>
                    </label>
                    <input
                      type="url"
                      id="linkedinUrl"
                      name="linkedinUrl"
                      value={profileData.linkedinUrl}
                      onChange={handleInputChange}
                      placeholder="https://linkedin.com/in/yourprofile"
                      className={errors.linkedinUrl ? styles.inputError : ''}
                    />
                    {errors.linkedinUrl && (
                      <span className={styles.errorText}>{errors.linkedinUrl}</span>
                    )}
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="githubUrl">GitHub Profile</label>
                    <input
                      type="url"
                      id="githubUrl"
                      name="githubUrl"
                      value={profileData.githubUrl}
                      onChange={handleInputChange}
                      placeholder="https://github.com/yourusername"
                      className={errors.githubUrl ? styles.inputError : ''}
                    />
                    {errors.githubUrl && (
                      <span className={styles.errorText}>{errors.githubUrl}</span>
                    )}
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="twitterUrl">Twitter/X Profile</label>
                    <input
                      type="url"
                      id="twitterUrl"
                      name="twitterUrl"
                      value={profileData.twitterUrl}
                      onChange={handleInputChange}
                      placeholder="https://twitter.com/yourusername"
                      className={errors.twitterUrl ? styles.inputError : ''}
                    />
                    {errors.twitterUrl && (
                      <span className={styles.errorText}>{errors.twitterUrl}</span>
                    )}
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="portfolioUrl">Portfolio/Personal Website</label>
                    <input
                      type="url"
                      id="portfolioUrl"
                      name="portfolioUrl"
                      value={profileData.portfolioUrl}
                      onChange={handleInputChange}
                      placeholder="https://yourportfolio.com"
                    />
                  </div>
                </div>

                {/* Community Engagement - Alumni Only */}
                {!isCurrentStudent && (
                  <div className={styles.section}>
                    <h4>Community Engagement</h4>
                    <p className={styles.helpText}>
                      Let us know how you'd like to contribute to the alumni community
                    </p>

                    <div className={styles.toggleGroup}>
                      <label className={styles.toggleLabel}>
                        <input
                          type="checkbox"
                          name="interestedInMentoring"
                          checked={profileData.interestedInMentoring}
                          onChange={handleInputChange}
                        />
                        <span className={styles.toggleSwitch}></span>
                        <span className={styles.toggleText}>
                          Interested in Mentoring Juniors
                        </span>
                      </label>
                    </div>

                    <div className={styles.toggleGroup}>
                      <label className={styles.toggleLabel}>
                        <input
                          type="checkbox"
                          name="openToReferrals"
                          checked={profileData.openToReferrals}
                          onChange={handleInputChange}
                        />
                        <span className={styles.toggleSwitch}></span>
                        <span className={styles.toggleText}>
                          Open to Providing Job Referrals
                        </span>
                      </label>
                    </div>

                    <div className={styles.toggleGroup}>
                      <label className={styles.toggleLabel}>
                        <input
                          type="checkbox"
                          name="availableForSpeaking"
                          checked={profileData.availableForSpeaking}
                          onChange={handleInputChange}
                        />
                        <span className={styles.toggleSwitch}></span>
                        <span className={styles.toggleText}>
                          Available for Guest Lectures/Talks
                        </span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Submit Button */}
            <div className={styles.submitSection}>
              <button 
                type="submit" 
                className={styles.submitButton}
                disabled={saving}
              >
                {saving ? 'Saving Changes...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

export default Profile

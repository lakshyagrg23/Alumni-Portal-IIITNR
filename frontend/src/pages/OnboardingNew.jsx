import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useAuth } from '@hooks/useAuth'
import { authService } from '../services/authService'
import axios from 'axios'
import styles from './OnboardingNew.module.css'

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
  'Employed',
  'Self-employed',
  'Higher Studies',
  'Entrepreneur',
  'Unemployed',
  'Not specified',
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

const OnboardingNew = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingPicture, setUploadingPicture] = useState(false)
  const fileInputRef = useRef(null)

  const [instituteData, setInstituteData] = useState({
    firstName: '',
    lastName: '',
    rollNumber: '',
    degree: '',
    branch: '',
    graduationYear: '',
    email: '',
    profilePicture: '',
  })

  const [isCurrentStudent, setIsCurrentStudent] = useState(false)

  const [formData, setFormData] = useState({
    professionalInterests: [],
    linkedinUrl: '',
    careerGoals: [],
    // Alumni only
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
  })

  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    // Redirect admins - they don't need onboarding
    if (user?.role === 'admin' || user?.role === 'superadmin') {
      navigate('/admin')
      return
    }
    loadUserData()
  }, [user, navigate])

  const loadUserData = async () => {
    try {
      setLoading(true)
      const response = await authService.getProfile()
      
      console.log('Profile response:', response)
      
      if (response.success) {
        const { data } = response
        const alumni = data.alumniProfile || {}

        console.log('User data:', data)
        console.log('Alumni profile:', alumni)

        const gradYear = alumni.graduationYear || data.graduationYear || new Date().getFullYear() + 1
        const currentYear = new Date().getFullYear()
        const isStudent = gradYear > currentYear

        const instituteInfo = {
          firstName: data.firstName || alumni.firstName || '',
          lastName: data.lastName || alumni.lastName || '',
          rollNumber: data.rollNumber || alumni.studentId || '',
          degree: data.degree || alumni.degree || '',
          branch: data.branch || alumni.branch || '',
          graduationYear: data.graduationYear || alumni.graduationYear || '',
          email: data.email || '',
          profilePicture: alumni.profilePictureUrl || '',
        }

        console.log('Setting institute data:', instituteInfo)

        setInstituteData(instituteInfo)

        setIsCurrentStudent(isStudent)

        // Load existing data if any
        setFormData({
          professionalInterests: alumni.professionalInterests || [],
          linkedinUrl: alumni.linkedinUrl || '',
          careerGoals: alumni.careerGoals || [],
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
        })
      }
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePictureSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setMessage({ type: 'error', text: 'Please upload a JPEG, PNG, or WebP image' })
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
        setMessage({ type: 'success', text: 'Profile picture uploaded!' })
        setTimeout(() => setMessage({ type: '', text: '' }), 3000)
      }
    } catch (error) {
      console.error('Picture upload error:', error)
      setMessage({ type: 'error', text: 'Failed to upload picture' })
    } finally {
      setUploadingPicture(false)
    }
  }

  const handleInterestToggle = (interest) => {
    setFormData(prev => ({
      ...prev,
      professionalInterests: prev.professionalInterests.includes(interest)
        ? prev.professionalInterests.filter(i => i !== interest)
        : [...prev.professionalInterests, interest]
    }))
  }

  const handleCareerGoalToggle = (goal) => {
    setFormData(prev => ({
      ...prev,
      careerGoals: prev.careerGoals.includes(goal)
        ? prev.careerGoals.filter(g => g !== goal)
        : [...prev.careerGoals, goal]
    }))
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const validateForm = () => {
    const newErrors = {}

    // Profile picture
    if (!instituteData.profilePicture) {
      newErrors.profilePicture = 'Profile picture is required'
    }

    // Professional interests
    if (formData.professionalInterests.length < 1) {
      newErrors.professionalInterests = 'Please select at least 1 professional interest'
    }
    if (formData.professionalInterests.length > 7) {
      newErrors.professionalInterests = 'Please select at most 7 professional interests'
    }

    // LinkedIn URL
    if (!formData.linkedinUrl.trim()) {
      newErrors.linkedinUrl = 'LinkedIn profile URL is required'
    } else if (!formData.linkedinUrl.includes('linkedin.com')) {
      newErrors.linkedinUrl = 'Please enter a valid LinkedIn URL'
    }

    // Career goals
    if (formData.careerGoals.length === 0) {
      newErrors.careerGoals = 'Please select at least one career goal'
    }

    // Alumni-only validation
    if (!isCurrentStudent) {
      if (!formData.currentCity.trim()) {
        newErrors.currentCity = 'City is required'
      }
      if (!formData.currentState.trim()) {
        newErrors.currentState = 'State is required'
      }
      if (!formData.employmentStatus) {
        newErrors.employmentStatus = 'Employment status is required'
      }
      if (!formData.industry) {
        newErrors.industry = 'Industry is required'
      }

      // Conditional validation based on employment status
      if (formData.employmentStatus === 'Employed' ||
          formData.employmentStatus === 'Self-employed' ||
          formData.employmentStatus === 'Entrepreneur') {
        if (!formData.currentCompany.trim()) {
          newErrors.currentCompany = 'Company name is required'
        }
        if (!formData.currentPosition.trim()) {
          newErrors.currentPosition = 'Position/role is required'
        }
      } else if (formData.employmentStatus === 'Higher Studies') {
        if (!formData.institutionName.trim()) {
          newErrors.institutionName = 'Institution name is required'
        }
        if (!formData.currentPosition.trim()) {
          newErrors.currentPosition = 'Program/degree is required'
        }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      setMessage({ type: 'error', text: 'Please fix the errors below' })
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    try {
      setSaving(true)
      setMessage({ type: '', text: '' })

      const submitData = {
        firstName: instituteData.firstName,
        lastName: instituteData.lastName,
        studentId: instituteData.rollNumber,
        degree: instituteData.degree,
        branch: instituteData.branch,
        graduationYear: parseInt(instituteData.graduationYear),
        professionalInterests: formData.professionalInterests,
        linkedinUrl: formData.linkedinUrl,
        careerGoals: formData.careerGoals,
      }

      if (!isCurrentStudent) {
        submitData.currentCity = formData.currentCity
        submitData.currentState = formData.currentState
        submitData.currentCountry = formData.currentCountry
        submitData.employmentStatus = formData.employmentStatus
        submitData.currentCompany = formData.currentCompany || null
        submitData.currentPosition = formData.currentPosition || null
        submitData.targetRole = formData.targetRole || null
        submitData.institutionName = formData.institutionName || null
        submitData.expectedCompletionYear = formData.expectedCompletionYear || null
        submitData.industry = formData.industry
      }

      console.log('Submitting data:', submitData)

      const response = await authService.updateProfile(submitData)

      if (response.success) {
        // Navigate to optional page
        navigate('/onboarding/optional')
      } else {
        setMessage({ type: 'error', text: response.message || 'Failed to save profile' })
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      console.error('Error response:', error.response?.data)
      setMessage({ type: 'error', text: error.response?.data?.message || 'An error occurred while saving' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading...</p>
      </div>
    )
  }

  const getProfileImageUrl = (url) => {
    if (!url) return '/default-avatar.svg'
    if (url.startsWith('http')) return url
    return `${API_BASE_URL}${url}`
  }

  return (
    <>
      <Helmet>
        <title>Complete Your Profile - IIIT Naya Raipur Alumni Portal</title>
      </Helmet>

      <div className={styles.onboardingPage}>
        <div className={styles.container}>
          {/* Welcome Card */}
          <div className={styles.welcomeCard}>
            <h1>Welcome, {instituteData.firstName}!</h1>
            <div className={styles.userInfo}>
              <h2>{instituteData.firstName} {instituteData.lastName}</h2>
              <p className={styles.infoRow}>
                <span>Roll: {instituteData.rollNumber}</span>
                <span>•</span>
                <span>{instituteData.degree} - {instituteData.branch}</span>
                <span>•</span>
                <span>{isCurrentStudent ? `Expected ${instituteData.graduationYear}` : `Class of ${instituteData.graduationYear}`}</span>
              </p>
            </div>
          </div>

          {/* Message */}
          {message.text && (
            <div className={`${styles.message} ${styles[message.type]}`}>
              {message.text}
            </div>
          )}

          {/* Onboarding Form */}
          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Profile Picture */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3>Profile Picture</h3>
                <span className={styles.required}>*</span>
              </div>
              <p className={styles.helpText}>Upload a clear photo of yourself</p>
              
              <div className={styles.pictureUpload}>
                <img 
                  src={getProfileImageUrl(instituteData.profilePicture)} 
                  alt="Profile"
                  className={styles.previewImage}
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
                  {uploadingPicture ? '⟳ Uploading...' : instituteData.profilePicture ? '📷 Change Picture' : '📷 Upload Picture'}
                </button>
              </div>
              {errors.profilePicture && (
                <span className={styles.errorText}>{errors.profilePicture}</span>
              )}
            </div>

            {/* Professional Interests */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3>Professional Interests</h3>
                <span className={styles.required}>*</span>
              </div>
              <p className={styles.helpText}>
                Select 1-7 areas you're passionate about ({formData.professionalInterests.length}/7 selected)
              </p>
              
              <div className={styles.chipsGrid}>
                {PROFESSIONAL_INTERESTS.map((interest) => (
                  <button
                    key={interest}
                    type="button"
                    className={`${styles.chip} ${formData.professionalInterests.includes(interest) ? styles.selected : ''}`}
                    onClick={() => handleInterestToggle(interest)}
                  >
                    {interest}
                  </button>
                ))}
              </div>
              {errors.professionalInterests && (
                <span className={styles.errorText}>{errors.professionalInterests}</span>
              )}
            </div>

            {/* Alumni Only: Location and Employment */}
            {!isCurrentStudent && (
              <>
                {/* Location */}
                <div className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <h3>Current Location</h3>
                    <span className={styles.required}>*</span>
                  </div>
                  <p className={styles.helpText}>Where are you based now?</p>
                  
                  <div className={styles.inputGrid}>
                    <div>
                      <input
                        type="text"
                        name="currentCity"
                        value={formData.currentCity}
                        onChange={handleInputChange}
                        placeholder="City"
                        className={errors.currentCity ? styles.inputError : ''}
                      />
                      {errors.currentCity && (
                        <span className={styles.errorText}>{errors.currentCity}</span>
                      )}
                    </div>
                    <div>
                      <input
                        type="text"
                        name="currentState"
                        value={formData.currentState}
                        onChange={handleInputChange}
                        placeholder="State"
                        className={errors.currentState ? styles.inputError : ''}
                      />
                      {errors.currentState && (
                        <span className={styles.errorText}>{errors.currentState}</span>
                      )}
                    </div>
                    <div>
                      <input
                        type="text"
                        name="currentCountry"
                        value={formData.currentCountry}
                        onChange={handleInputChange}
                        placeholder="Country"
                      />
                    </div>
                  </div>
                </div>

                {/* Employment Status */}
                <div className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <h3>Employment Status</h3>
                    <span className={styles.required}>*</span>
                  </div>
                  <p className={styles.helpText}>What are you currently doing?</p>
                  
                  <select
                    name="employmentStatus"
                    value={formData.employmentStatus}
                    onChange={handleInputChange}
                    className={errors.employmentStatus ? styles.inputError : ''}
                  >
                    <option value="">Select employment status</option>
                    {EMPLOYMENT_STATUS_OPTIONS.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                  {errors.employmentStatus && (
                    <span className={styles.errorText}>{errors.employmentStatus}</span>
                  )}

                  {/* Conditional fields based on employment status */}
                  {(formData.employmentStatus === 'Employed' || 
                    formData.employmentStatus === 'Self-employed' ||
                    formData.employmentStatus === 'Entrepreneur') && (
                    <div className={styles.conditionalFields}>
                      <input
                        type="text"
                        name="currentCompany"
                        value={formData.currentCompany}
                        onChange={handleInputChange}
                        placeholder={formData.employmentStatus === 'Self-employed' || formData.employmentStatus === 'Entrepreneur' ? 'Company/Venture Name' : 'Company Name'}
                        className={errors.currentCompany ? styles.inputError : ''}
                      />
                      {errors.currentCompany && (
                        <span className={styles.errorText}>{errors.currentCompany}</span>
                      )}
                      <input
                        type="text"
                        name="currentPosition"
                        value={formData.currentPosition}
                        onChange={handleInputChange}
                        placeholder="Position/Role"
                        className={errors.currentPosition ? styles.inputError : ''}
                      />
                      {errors.currentPosition && (
                        <span className={styles.errorText}>{errors.currentPosition}</span>
                      )}
                    </div>
                  )}

                  {formData.employmentStatus === 'Higher Studies' && (
                    <div className={styles.conditionalFields}>
                      <input
                        type="text"
                        name="institutionName"
                        value={formData.institutionName}
                        onChange={handleInputChange}
                        placeholder="Institution Name"
                        className={errors.institutionName ? styles.inputError : ''}
                      />
                      {errors.institutionName && (
                        <span className={styles.errorText}>{errors.institutionName}</span>
                      )}
                      <input
                        type="text"
                        name="currentPosition"
                        value={formData.currentPosition}
                        onChange={handleInputChange}
                        placeholder="Program/Degree"
                        className={errors.currentPosition ? styles.inputError : ''}
                      />
                      {errors.currentPosition && (
                        <span className={styles.errorText}>{errors.currentPosition}</span>
                      )}
                    </div>
                  )}

                  <select
                    name="industry"
                    value={formData.industry}
                    onChange={handleInputChange}
                    className={errors.industry ? styles.inputError : ''}
                  >
                    <option value="">Select industry/domain</option>
                    {INDUSTRY_OPTIONS.map(industry => (
                      <option key={industry} value={industry}>{industry}</option>
                    ))}
                  </select>
                  {errors.industry && (
                    <span className={styles.errorText}>{errors.industry}</span>
                  )}
                </div>
              </>
            )}

            {/* LinkedIn URL */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3>LinkedIn Profile</h3>
                <span className={styles.required}>*</span>
              </div>
              <p className={styles.helpText}>Your professional networking profile</p>
              
              <input
                type="url"
                name="linkedinUrl"
                value={formData.linkedinUrl}
                onChange={handleInputChange}
                placeholder="https://www.linkedin.com/in/yourprofile"
                className={errors.linkedinUrl ? styles.inputError : ''}
              />
              {errors.linkedinUrl && (
                <span className={styles.errorText}>{errors.linkedinUrl}</span>
              )}
            </div>

            {/* Career Goals */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3>Career Goals</h3>
                <span className={styles.required}>*</span>
              </div>
              <p className={styles.helpText}>What are you working towards? (Select at least 1)</p>
              
              <div className={styles.checkboxList}>
                {CAREER_GOALS.map((goal) => (
                  <label key={goal} className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={formData.careerGoals.includes(goal)}
                      onChange={() => handleCareerGoalToggle(goal)}
                    />
                    <span>{goal}</span>
                  </label>
                ))}
              </div>
              {errors.careerGoals && (
                <span className={styles.errorText}>{errors.careerGoals}</span>
              )}
            </div>



            {/* Submit Buttons */}
            <div className={styles.actions}>
              <button 
                type="submit" 
                className={styles.submitButton}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Next →'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

export default OnboardingNew

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useAuth } from '@hooks/useAuth'
import API from '../../services/authService'
import ProfilePictureUpload from '../../components/profile/ProfilePictureUpload'
import styles from './ProfileCompletion.module.css'

const ProfileCompletion = () => {
  const navigate = useNavigate()
  const { user, updateProfile, completeOnboarding } = useAuth()
  const [loading, setLoading] = useState(false)
  const [fetchingData, setFetchingData] = useState(true)
  const [errors, setErrors] = useState({})
  const [rollNumberLocked, setRollNumberLocked] = useState(false)
  const [preFillInfo, setPreFillInfo] = useState(null)
  
  const [formData, setFormData] = useState({
    // Basic Information
    first_name: user?.firstName || '',
    last_name: user?.lastName || '',
    roll_number: '',
    profile_picture_url: user?.profilePicture || user?.profilePictureUrl || '',
    
    // Academic Information
    degree: '',
    branch: '',
    graduation_year: '',
    
    // Current Status
    employment_status: '',
    currently_at: '', // Company or University name
    current_position: '',
    current_city: '',
    
    // Privacy (always true; not user editable)
    is_profile_public: true,
  })

  // Fetch onboarding pre-fill data on component mount
  useEffect(() => {
    const fetchOnboardingData = async () => {
      try {
        setFetchingData(true)
        const response = await API.get('/auth/onboarding-data')
        
        if (response.data.success && response.data.data) {
          const data = response.data.data
          
          // Update form with pre-filled data
          setFormData(prev => ({
            ...prev,
            first_name: data.firstName || prev.first_name,
            last_name: data.lastName || prev.last_name,
            roll_number: data.rollNumber || prev.roll_number,
            degree: data.degree || prev.degree,
            branch: data.branch || prev.branch,
            graduation_year: data.graduationYear || prev.graduation_year,
          }))
          
          // Set roll number lock state
          setRollNumberLocked(data.rollNumberLocked || false)
          
          // Store pre-fill info for display
          if (data.registrationPath === 'personal_email' && data.rollNumber) {
            setPreFillInfo({
              path: 'personal_email',
              message: 'Your information has been pre-filled from verified institute records'
            })
          }
        }
      } catch (error) {
        console.error('Error fetching onboarding data:', error)
        // Continue with normal flow if fetch fails
      } finally {
        setFetchingData(false)
      }
    }

    fetchOnboardingData()
  }, [])

  const employmentStatusOptions = [
    { value: 'Employed', label: 'Employed' },
    { value: 'Higher Studies', label: 'Higher Studies' },
    { value: 'Entrepreneur', label: 'Entrepreneur' },
    { value: 'Looking for Opportunities', label: 'Looking for Opportunities' },
    { value: 'Other', label: 'Other' },
  ]

  const degreeOptions = ['B.Tech', 'M.Tech', 'PhD', 'Integrated M.Tech']
  
  const branchOptions = [
    'Computer Science & Engineering',
    'Electronics & Communication Engineering',
    'Data Science & Artificial Intelligence',
  ]

  const currentYear = new Date().getFullYear()
  const graduationYearNum = parseInt(formData.graduation_year, 10)
  const isFutureGraduation = Number.isFinite(graduationYearNum) && graduationYearNum > currentYear

  const showCurrentOrgField =
    !isFutureGraduation &&
    formData.employment_status &&
    formData.employment_status !== 'Looking for Opportunities'

  // If graduation year is in the future, clear and hide current status fields
  useEffect(() => {
    if (!isFutureGraduation) return

    setFormData(prev => ({
      ...prev,
      employment_status: '',
      currently_at: '',
      current_position: '',
      current_city: '',
    }))

    setErrors(prev => {
      const { employment_status, currently_at, current_position, current_city, ...rest } = prev
      return rest
    })
  }, [isFutureGraduation])

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors = {}
    
    // Required fields
    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required'
    }
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required'
    }
    if (!formData.roll_number.trim()) {
      newErrors.roll_number = 'Roll number is required'
    }
    if (!formData.degree) {
      newErrors.degree = 'Degree is required'
    }
    if (!formData.branch) {
      newErrors.branch = 'Branch is required'
    }
    if (!formData.graduation_year) {
      newErrors.graduation_year = 'Graduation year is required'
    } else if (formData.graduation_year < 2010 || formData.graduation_year > new Date().getFullYear() + 5) {
      newErrors.graduation_year = 'Please enter a valid graduation year'
    }
    if (!formData.profile_picture_url) {
      newErrors.profile_picture_url = 'Profile picture is required'
    }
    if (!isFutureGraduation) {
      if (!formData.employment_status) {
        newErrors.employment_status = 'Current status is required'
      }
      const requiresPosition = formData.employment_status === 'Employed' || formData.employment_status === 'Entrepreneur'
      const requiresProgram = formData.employment_status === 'Higher Studies'
      if (requiresPosition && !formData.current_position.trim()) {
        newErrors.current_position = 'Current position is required'
      }
      if (requiresProgram && !formData.current_position.trim()) {
        newErrors.current_position = 'Degree/qualification is required'
      }
      if (showCurrentOrgField && !formData.currently_at.trim()) {
        newErrors.currently_at = 'Please enter your current company/university'
      }
      if (!formData.current_city.trim()) {
        newErrors.current_city = 'Current city is required'
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    try {
      setLoading(true)
      
      // Prepare profile data based on employment status
      const isEmployed = formData.employment_status === 'Employed' || formData.employment_status === 'Entrepreneur'
      const isStudying = formData.employment_status === 'Higher Studies'
      const currentPosition = formData.current_position?.trim()
      
      const profileData = {
        firstName: formData.first_name,
        lastName: formData.last_name,
        studentId: formData.roll_number || null,
        profilePicture: formData.profile_picture_url,
        degree: formData.degree,
        branch: formData.branch,
        graduationYear: parseInt(formData.graduation_year),
        isProfilePublic: formData.is_profile_public,
      
        // Set defaults for optional fields
        interests: [],
        skills: [],
        showContactInfo: false,
        showWorkInfo: true,
        showAcademicInfo: true,
        workExperienceYears: 0,
      }

      if (!isFutureGraduation) {
        profileData.employmentStatus = formData.employment_status
        profileData.currentCity = formData.current_city

        // Conditionally set company or university based on status
        if (isEmployed) {
          profileData.currentCompany = formData.currently_at
          profileData.currentPosition = currentPosition || (formData.employment_status === 'Entrepreneur' ? 'Founder' : null)
        } else if (isStudying) {
          profileData.higherStudyInstitution = formData.currently_at
          profileData.higherStudyProgram = currentPosition || null
        } else if (showCurrentOrgField && formData.currently_at.trim()) {
          profileData.currentCompany = formData.currently_at
        }
      }
      
      // Update the profile using the auth profile endpoint
      await API.put('/auth/profile', profileData)
      
      // Update auth context
      await updateProfile(formData)
      
      // Mark onboarding as completed
      await completeOnboarding()
      
      // Navigate to dashboard
      navigate('/dashboard', { 
        state: { 
          message: 'Welcome to IIIT NR Alumni Portal! Your profile has been created successfully.' 
        }
      })
      
    } catch (error) {
      console.error('Error completing profile:', error)
      setErrors({ 
        submit: error.response?.data?.message || error.message || 'Failed to save profile. Please try again.' 
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Helmet>
        <title>Complete Your Profile | IIIT Naya Raipur Alumni</title>
      </Helmet>

      <div className={styles.container}>
          <div className={styles.formWrapper}>
            <div className={styles.header}>
              <h1>Complete Your Profile</h1>
              <p>Help us know you better by filling in these essential details</p>
            </div>

          {/* Pre-fill notification */}
          {preFillInfo && (
            <div className={styles.infoNotification}>
              <div className={styles.notificationIcon}>✓</div>
              <p>{preFillInfo.message}</p>
            </div>
          )}

          {/* Loading state */}
          {fetchingData ? (
            <div className={styles.loadingState}>
              <p>Loading your information...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className={styles.form}>
            {/* Basic Information Section */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Basic Information</h3>
              
              <div className={styles.formGroup}>
                <label>Profile Picture *</label>
                <ProfilePictureUpload
                  currentPictureUrl={formData.profile_picture_url}
                  onUploadSuccess={(url) => {
                    setFormData(prev => ({ ...prev, profile_picture_url: url || '' }))
                    setErrors(prev => ({ ...prev, profile_picture_url: '' }))
                  }}
                  allowDelete={false}
                />
                {errors.profile_picture_url && (
                  <span className={styles.errorText}>{errors.profile_picture_url}</span>
                )}
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="first_name">First Name *</label>
                  <input
                    type="text"
                    id="first_name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    className={errors.first_name ? styles.error : ''}
                    placeholder="e.g., Rahul"
                  />
                  {errors.first_name && (
                    <span className={styles.errorText}>{errors.first_name}</span>
                  )}
                </div>
                
                <div className={styles.formGroup}>
                  <label htmlFor="last_name">Last Name *</label>
                  <input
                    type="text"
                    id="last_name"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    className={errors.last_name ? styles.error : ''}
                    placeholder="e.g., Sharma"
                  />
                  {errors.last_name && (
                    <span className={styles.errorText}>{errors.last_name}</span>
                  )}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="roll_number">
                  Roll Number *
                  {rollNumberLocked && <span className={styles.lockedBadge}>✓ Verified</span>}
                </label>
                <input
                  type="text"
                  id="roll_number"
                  name="roll_number"
                  value={formData.roll_number}
                  onChange={handleInputChange}
                  placeholder="e.g., 19115001"
                  readOnly={rollNumberLocked}
                  className={rollNumberLocked ? styles.readOnly : ''}
                />
                <small className={styles.helpText}>
                  {rollNumberLocked 
                    ? 'Roll number verified from institute records'
                    : 'Your institute roll number'}
                </small>
                {errors.roll_number && (
                  <span className={styles.errorText}>{errors.roll_number}</span>
                )}
              </div>
            </div>

            {/* Academic Information Section */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Academic Information</h3>
              
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="degree">Degree *</label>
                  <select
                    id="degree"
                    name="degree"
                    value={formData.degree}
                    onChange={handleInputChange}
                    className={errors.degree ? styles.error : ''}
                  >
                    <option value="">Select Degree</option>
                    {degreeOptions.map(degree => (
                      <option key={degree} value={degree}>{degree}</option>
                    ))}
                  </select>
                  {errors.degree && (
                    <span className={styles.errorText}>{errors.degree}</span>
                  )}
                </div>
                
                <div className={styles.formGroup}>
                  <label htmlFor="branch">Branch *</label>
                  <select
                    id="branch"
                    name="branch"
                    value={formData.branch}
                    onChange={handleInputChange}
                    className={errors.branch ? styles.error : ''}
                  >
                    <option value="">Select Branch</option>
                    {branchOptions.map(branch => (
                      <option key={branch} value={branch}>{branch}</option>
                    ))}
                  </select>
                  {errors.branch && (
                    <span className={styles.errorText}>{errors.branch}</span>
                  )}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="graduation_year">Graduation Year *</label>
                <input
                  type="number"
                  id="graduation_year"
                  name="graduation_year"
                  value={formData.graduation_year}
                  onChange={handleInputChange}
                  min="2019"
                  max={new Date().getFullYear() + 6}
                  className={errors.graduation_year ? styles.error : ''}
                  placeholder="e.g., 2023"
                />
                {errors.graduation_year && (
                  <span className={styles.errorText}>{errors.graduation_year}</span>
                )}
              </div>
            </div>

            {/* Current Status Section */}
            {!isFutureGraduation && (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Current Status</h3>
                
                <div className={styles.formGroup}>
                  <label htmlFor="employment_status">What are you currently doing? *</label>
                  <select
                    id="employment_status"
                    name="employment_status"
                    value={formData.employment_status}
                    onChange={handleInputChange}
                    className={errors.employment_status ? styles.error : ''}
                  >
                    <option value="">Select Status</option>
                    {employmentStatusOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.employment_status && (
                    <span className={styles.errorText}>{errors.employment_status}</span>
                  )}
                </div>

                {showCurrentOrgField && (
                  <div className={styles.formGroup}>
                    <label htmlFor="currently_at">
                      {formData.employment_status === 'Higher Studies' 
                        ? 'University/Institution Name *' 
                        : formData.employment_status === 'Employed' || formData.employment_status === 'Entrepreneur'
                        ? 'Company Name *'
                        : 'Current Organization/Status *'}
                    </label>
                    <input
                      type="text"
                      id="currently_at"
                      name="currently_at"
                      value={formData.currently_at}
                      onChange={handleInputChange}
                      className={errors.currently_at ? styles.error : ''}
                      placeholder={
                        formData.employment_status === 'Higher Studies' 
                          ? 'e.g., IIT Delhi, Stanford University' 
                          : formData.employment_status === 'Employed'
                          ? 'e.g., Google, Microsoft, Accenture'
                          : formData.employment_status === 'Entrepreneur'
                          ? 'e.g., My Startup Name'
                          : 'e.g., Freelancing, Self-employed'
                      }
                    />
                    {errors.currently_at && (
                      <span className={styles.errorText}>{errors.currently_at}</span>
                    )}
                  </div>
                )}

                {(formData.employment_status === 'Employed' || formData.employment_status === 'Entrepreneur' || formData.employment_status === 'Higher Studies') && (
                  <div className={styles.formGroup}>
                    <label htmlFor="current_position">
                      {formData.employment_status === 'Higher Studies'
                        ? 'Degree/Qualification Pursued *'
                        : 'Current Position *'}
                    </label>
                    <input
                      type="text"
                      id="current_position"
                      name="current_position"
                      value={formData.current_position}
                      onChange={handleInputChange}
                      className={errors.current_position ? styles.error : ''}
                      placeholder={
                        formData.employment_status === 'Entrepreneur'
                          ? 'e.g., Founder, CEO'
                          : formData.employment_status === 'Higher Studies'
                          ? 'e.g., M.Tech CSE, MBA, MS in CS'
                          : 'e.g., Software Engineer, Product Manager'
                      }
                    />
                    {errors.current_position && (
                      <span className={styles.errorText}>{errors.current_position}</span>
                    )}
                  </div>
                )}

                <div className={styles.formGroup}>
                  <label htmlFor="current_city">Current City *</label>
                  <input
                    type="text"
                    id="current_city"
                    name="current_city"
                    value={formData.current_city}
                    onChange={handleInputChange}
                    className={errors.current_city ? styles.error : ''}
                    placeholder="e.g., Bangalore, Mumbai, Raipur"
                  />
                  {errors.current_city && (
                    <span className={styles.errorText}>{errors.current_city}</span>
                  )}
                </div>
              </div>
            )}

            {/* Error Message */}
            {errors.submit && (
              <div className={styles.errorMessage}>
                {errors.submit}
              </div>
            )}

            {/* Submit Button */}
            <div className={styles.actions}>
              <button 
                type="submit" 
                className={styles.submitBtn}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Complete Profile'}
              </button>
            </div>

            <p className={styles.note}>
              * Required fields. You can add more details to your profile later.
            </p>
          </form>
          )}
        </div>
      </div>
    </>
  )
}

export default ProfileCompletion

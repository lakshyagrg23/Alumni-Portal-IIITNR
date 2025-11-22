import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useAuth } from '@hooks/useAuth'
import API from '../../services/authService'
import styles from './ProfileCompletion.module.css'

const ProfileCompletion = () => {
  const navigate = useNavigate()
  const { user, updateProfile, completeOnboarding } = useAuth()
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [errors, setErrors] = useState({})
  const [formData, setFormData] = useState({
    // Personal Information
    first_name: user?.firstName || '',
    last_name: user?.lastName || '',
    
    // Academic Information
    graduation_year: '',
    branch: '',
    degree: '',
    roll_number: '',
    
    // Current Information
    current_company: '',
    current_position: '',
    current_city: '',
    current_state: '',
    current_country: 'India',
    
    // Professional Information
    bio: '',
    skills: '',
    linkedin_url: '',
    github_url: '',
    
    // Privacy Settings
    is_profile_public: true,
  })

  const totalSteps = 4

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

  const validateStep = (step) => {
    const newErrors = {}
    
    switch (step) {
      case 1: // Personal Information
        if (!formData.first_name.trim()) {
          newErrors.first_name = 'First name is required'
        }
        if (!formData.last_name.trim()) {
          newErrors.last_name = 'Last name is required'
        }
        break
        
      case 2: // Academic Information
        if (!formData.graduation_year) {
          newErrors.graduation_year = 'Graduation year is required'
        } else if (formData.graduation_year < 2000 || formData.graduation_year > new Date().getFullYear() + 5) {
          newErrors.graduation_year = 'Please enter a valid graduation year'
        }
        if (!formData.branch) {
          newErrors.branch = 'Branch is required'
        }
        if (!formData.degree) {
          newErrors.degree = 'Degree is required'
        }
        break
        
      case 3: // Current Information
        if (!formData.current_city.trim()) {
          newErrors.current_city = 'Current city is required'
        }
        if (!formData.current_state.trim()) {
          newErrors.current_state = 'Current state is required'
        }
        break
        
      case 4: // Professional Information
        if (!formData.bio.trim()) {
          newErrors.bio = 'Please write a brief bio'
        }
        // URL validation for optional fields
        if (formData.linkedin_url && !isValidUrl(formData.linkedin_url)) {
          newErrors.linkedin_url = 'Please enter a valid LinkedIn URL'
        }
        if (formData.github_url && !isValidUrl(formData.github_url)) {
          newErrors.github_url = 'Please enter a valid GitHub URL'
        }
        break
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const isValidUrl = (string) => {
    try {
      new URL(string)
      return true
    } catch (_) {
      return false
    }
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps))
    }
  }

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateStep(currentStep)) {
      return
    }
    
    try {
      setLoading(true)
      
      // Prepare skills array - split by comma and clean up
      const skillsArray = formData.skills 
        ? formData.skills.split(',').map(skill => skill.trim()).filter(skill => skill.length > 0)
        : []
      
      // Get current user's alumni profile first
      const profileResponse = await API.get('/auth/profile')
      
      if (!profileResponse.success) {
        throw new Error('Could not load your profile. Please contact support.')
      }
      
      // Create alumni profile update data - use camelCase as expected by the model
      const profileData = {
        firstName: formData.first_name,
        lastName: formData.last_name,
        graduationYear: parseInt(formData.graduation_year),
        branch: formData.branch,
        degree: formData.degree,
        studentId: formData.roll_number, // This maps to student_id in the database
        currentCompany: formData.current_company,
        currentPosition: formData.current_position,
        currentCity: formData.current_city,
        currentState: formData.current_state,
        currentCountry: formData.current_country,
        bio: formData.bio,
        skills: skillsArray, // Send as array
        linkedinUrl: formData.linkedin_url,
        githubUrl: formData.github_url,
        isProfilePublic: formData.is_profile_public, // This is the key field!
        // Add missing fields that the backend expects
        interests: [],
        showContactInfo: false,
        showWorkInfo: true,
        showAcademicInfo: true,
        workExperienceYears: 0
      }
      
      // Update the profile using the auth profile endpoint
      await API.put('/auth/profile', profileData)
      
      // Update auth context
      await updateProfile(formData)
      
      // Mark onboarding as completed on the backend
      await completeOnboarding()
      
      // Navigate to dashboard
      navigate('/dashboard', { 
        state: { message: 'Profile completed successfully! Welcome to IIIT NR Alumni Portal.' }
      })
      
    } catch (error) {
      console.error('Error completing profile:', error)
      setErrors({ submit: error.message || 'Failed to save profile. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className={styles.stepContent}>
            <h3>Personal Information</h3>
            <p className={styles.stepDescription}>Let's start with your basic information</p>
            
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
                  required
                />
                {errors.first_name && <span className={styles.errorText}>{errors.first_name}</span>}
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
                  required
                />
                {errors.last_name && <span className={styles.errorText}>{errors.last_name}</span>}
              </div>
            </div>
          </div>
        )
        
      case 2:
        return (
          <div className={styles.stepContent}>
            <h3>Academic Information</h3>
            <p className={styles.stepDescription}>Tell us about your time at IIIT Naya Raipur</p>
            
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="graduation_year">Graduation Year *</label>
                <input
                  type="number"
                  id="graduation_year"
                  name="graduation_year"
                  value={formData.graduation_year}
                  onChange={handleInputChange}
                  min="2000"
                  max={new Date().getFullYear() + 5}
                  className={errors.graduation_year ? styles.error : ''}
                  required
                />
                {errors.graduation_year && <span className={styles.errorText}>{errors.graduation_year}</span>}
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="roll_number">Roll Number</label>
                <input
                  type="text"
                  id="roll_number"
                  name="roll_number"
                  value={formData.roll_number}
                  onChange={handleInputChange}
                  placeholder="e.g., 19115001"
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="branch">Branch *</label>
                <select
                  id="branch"
                  name="branch"
                  value={formData.branch}
                  onChange={handleInputChange}
                  className={errors.branch ? styles.error : ''}
                  required
                >
                  <option value="">Select Branch</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Electronics & Communication">Electronics & Communication</option>
                  <option value="Data Science">Data Science</option>
                </select>
                {errors.branch && <span className={styles.errorText}>{errors.branch}</span>}
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="degree">Degree *</label>
                <select
                  id="degree"
                  name="degree"
                  value={formData.degree}
                  onChange={handleInputChange}
                  className={errors.degree ? styles.error : ''}
                  required
                >
                  <option value="">Select Degree</option>
                  <option value="B.Tech">B.Tech</option>
                  <option value="M.Tech">M.Tech</option>
                  <option value="PhD">PhD</option>
                </select>
                {errors.degree && <span className={styles.errorText}>{errors.degree}</span>}
              </div>
            </div>
          </div>
        )
        
      case 3:
        return (
          <div className={styles.stepContent}>
            <h3>Current Location & Work</h3>
            <p className={styles.stepDescription}>Where are you now and what are you doing?</p>
            
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="current_city">Current City *</label>
                <input
                  type="text"
                  id="current_city"
                  name="current_city"
                  value={formData.current_city}
                  onChange={handleInputChange}
                  className={errors.current_city ? styles.error : ''}
                  placeholder="e.g., Bangalore"
                  required
                />
                {errors.current_city && <span className={styles.errorText}>{errors.current_city}</span>}
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="current_state">Current State *</label>
                <input
                  type="text"
                  id="current_state"
                  name="current_state"
                  value={formData.current_state}
                  onChange={handleInputChange}
                  className={errors.current_state ? styles.error : ''}
                  placeholder="e.g., Karnataka"
                  required
                />
                {errors.current_state && <span className={styles.errorText}>{errors.current_state}</span>}
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="current_country">Current Country</label>
                <input
                  type="text"
                  id="current_country"
                  name="current_country"
                  value={formData.current_country}
                  onChange={handleInputChange}
                  placeholder="e.g., India"
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="current_company">Current Company</label>
                <input
                  type="text"
                  id="current_company"
                  name="current_company"
                  value={formData.current_company}
                  onChange={handleInputChange}
                  placeholder="e.g., Google, Microsoft, or leave blank if unemployed/student"
                />
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="current_position">Current Position</label>
                <input
                  type="text"
                  id="current_position"
                  name="current_position"
                  value={formData.current_position}
                  onChange={handleInputChange}
                  placeholder="e.g., Software Engineer, Student"
                />
              </div>
            </div>
          </div>
        )
        
      case 4:
        return (
          <div className={styles.stepContent}>
            <h3>Professional Information</h3>
            <p className={styles.stepDescription}>Tell us more about yourself and your interests</p>
            
            <div className={styles.formGroup}>
              <label htmlFor="bio">Bio *</label>
              <textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                rows="4"
                className={errors.bio ? styles.error : ''}
                placeholder="Write a brief bio about yourself, your interests, and what you're passionate about..."
                required
              />
              {errors.bio && <span className={styles.errorText}>{errors.bio}</span>}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="skills">Skills</label>
              <textarea
                id="skills"
                name="skills"
                value={formData.skills}
                onChange={handleInputChange}
                rows="3"
                placeholder="JavaScript, Python, React, Machine Learning, Data Analysis... (comma separated)"
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="linkedin_url">LinkedIn Profile</label>
                <input
                  type="url"
                  id="linkedin_url"
                  name="linkedin_url"
                  value={formData.linkedin_url}
                  onChange={handleInputChange}
                  className={errors.linkedin_url ? styles.error : ''}
                  placeholder="https://linkedin.com/in/yourprofile"
                />
                {errors.linkedin_url && <span className={styles.errorText}>{errors.linkedin_url}</span>}
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="github_url">GitHub Profile</label>
                <input
                  type="url"
                  id="github_url"
                  name="github_url"
                  value={formData.github_url}
                  onChange={handleInputChange}
                  className={errors.github_url ? styles.error : ''}
                  placeholder="https://github.com/yourusername"
                />
                {errors.github_url && <span className={styles.errorText}>{errors.github_url}</span>}
              </div>
            </div>

            <div className={styles.privacySection}>
              <h4>Privacy & Visibility</h4>
              
              <div className={styles.checkboxGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    name="is_profile_public"
                    checked={formData.is_profile_public}
                    onChange={handleInputChange}
                  />
                  <span className={styles.checkmark}></span>
                  Make my profile visible in the alumni directory
                </label>
              </div>

            </div>
          </div>
        )
        
      default:
        return null
    }
  }

  return (
    <>
      <Helmet>
        <title>Complete Your Profile - IIIT Naya Raipur Alumni Portal</title>
      </Helmet>
      
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Complete Your Alumni Profile</h1>
          <p className={styles.subtitle}>
            Help us build a stronger alumni community by sharing your information
          </p>
        </div>

        <div className={styles.progressContainer}>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill}
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            ></div>
          </div>
          <p className={styles.progressText}>Step {currentStep} of {totalSteps}</p>
        </div>

        <div className={styles.formContainer}>
          <form onSubmit={handleSubmit}>
            {renderStep()}
            
            {errors.submit && (
              <div className={styles.submitError}>
                {errors.submit}
              </div>
            )}

            <div className={styles.navigationButtons}>
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className={styles.prevButton}
                  disabled={loading}
                >
                  Previous
                </button>
              )}
              
              {currentStep < totalSteps ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className={styles.nextButton}
                  disabled={loading}
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={loading}
                >
                  {loading ? 'Completing Profile...' : 'Complete Profile'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

export default ProfileCompletion

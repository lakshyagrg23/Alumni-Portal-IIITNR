import React, { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useAuth } from '@hooks/useAuth'
import { authService } from '../services/authService'
import styles from './Profile.module.css'

const Profile = () => {
  const { user, updateProfile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profileData, setProfileData] = useState({
    // Basic user info
    firstName: '',
    lastName: '',
    email: '',
    profilePicture: '',
    
    // Alumni profile info
    graduation_year: '',
    branch: '',
    degree: '',
    roll_number: '',
    bio: '',
    current_company: '',
    current_position: '',
    current_city: '',
    current_state: '',
    current_country: '',
    linkedin_url: '',
    github_url: '',
    portfolio_url: '',
    skills: '',
    achievements: '',
    is_profile_public: true,
    is_open_to_work: false,
    is_available_for_mentorship: false,
  })
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState('basic')
  const [hasAlumniProfile, setHasAlumniProfile] = useState(false)

  // Load profile data on component mount
  useEffect(() => {
    loadProfileData()
  }, [])

  const loadProfileData = async () => {
    try {
      setLoading(true)
      const response = await authService.getProfile()
      
      if (response.success) {
        const { data } = response
        setHasAlumniProfile(!!data.alumniProfile)
        setProfileData({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          profilePicture: data.profilePicture || '',
          
          // Alumni profile data
          graduation_year: data.alumniProfile?.graduation_year || '',
          branch: data.alumniProfile?.branch || '',
          degree: data.alumniProfile?.degree || '',
          roll_number: data.alumniProfile?.student_id || '', // student_id from DB maps to roll_number in frontend
          bio: data.alumniProfile?.bio || '',
          current_company: data.alumniProfile?.current_company || '',
          current_position: data.alumniProfile?.current_position || '',
          current_city: data.alumniProfile?.current_city || '',
          current_state: data.alumniProfile?.current_state || '',
          current_country: data.alumniProfile?.current_country || '',
          linkedin_url: data.alumniProfile?.linkedin_url || '',
          github_url: data.alumniProfile?.github_url || '',
          portfolio_url: data.alumniProfile?.portfolio_url || '',
          skills: Array.isArray(data.alumniProfile?.skills) 
            ? data.alumniProfile.skills.join(', ') 
            : data.alumniProfile?.skills || '',
          achievements: data.alumniProfile?.achievements || '',
          is_profile_public: data.alumniProfile?.is_profile_public ?? true,
          is_open_to_work: data.alumniProfile?.is_open_to_work ?? false,
          is_available_for_mentorship: data.alumniProfile?.is_available_for_mentorship ?? false,
        })
      }
    } catch (error) {
      console.error('Error loading profile:', error)
      setMessage('Error loading profile data')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setProfileData(prev => ({
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
    
    if (!profileData.firstName.trim()) {
      newErrors.firstName = 'First name is required'
    }
    
    if (!profileData.lastName.trim()) {
      newErrors.lastName = 'Last name is required'
    }
    
    if (profileData.graduation_year && 
        (profileData.graduation_year < 2000 || profileData.graduation_year > new Date().getFullYear() + 5)) {
      newErrors.graduation_year = 'Please enter a valid graduation year'
    }
    
    // Validate URLs if provided
    const urlFields = ['linkedin_url', 'github_url', 'portfolio_url']
    urlFields.forEach(field => {
      if (profileData[field] && !isValidUrl(profileData[field])) {
        newErrors[field] = 'Please enter a valid URL'
      }
    })
    
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    try {
      setSaving(true)
      setMessage('')
      
      // Prepare the data with proper array handling
      const updateData = { ...profileData }
      
      // Convert skills string to array if it's a string
      if (typeof updateData.skills === 'string' && updateData.skills.trim()) {
        updateData.skills = updateData.skills.split(',').map(skill => skill.trim()).filter(skill => skill.length > 0)
      } else if (!updateData.skills) {
        updateData.skills = []
      }
      
      await updateProfile(updateData)
      setMessage('Profile updated successfully!')
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Error updating profile:', error)
      setMessage('Error updating profile. Please try again.')
    } finally {
      setSaving(false)
    }
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

  return (
    <>
      <Helmet>
        <title>My Profile - IIIT Naya Raipur Alumni Portal</title>
      </Helmet>
      
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>My Profile</h1>
          <p className={styles.subtitle}>Manage your profile information and alumni details</p>
        </div>

        {message && (
          <div className={`${styles.message} ${message.includes('Error') ? styles.error : styles.success}`}>
            {message}
          </div>
        )}

        {!hasAlumniProfile && (
          <div className={styles.noProfileNotice}>
            <div className={styles.noticeContent}>
              <h3>Complete Your Alumni Profile</h3>
              <p>
                It looks like you haven't completed your alumni profile yet. 
                Complete your profile to connect with other alumni and showcase your journey.
              </p>
              <Link to="/complete-profile" className={styles.completeProfileButton}>
                Complete Profile
              </Link>
            </div>
          </div>
        )}

        <div className={styles.profileCard}>
          {/* Profile Header */}
          <div className={styles.profileHeader}>
            <div className={styles.avatarSection}>
              <img 
                src={profileData.profilePicture || '/default-avatar.svg'}
                alt={`${profileData.firstName} ${profileData.lastName}`}
                className={styles.avatar}
                onError={(e) => {
                  e.target.src = '/default-avatar.svg'
                }}
              />
              <div className={styles.userInfo}>
                <h2>{profileData.firstName} {profileData.lastName}</h2>
                <p className={styles.email}>{profileData.email}</p>
                {profileData.current_position && profileData.current_company && (
                  <p className={styles.position}>
                    {profileData.current_position} at {profileData.current_company}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className={styles.tabNav}>
            <button 
              className={`${styles.tab} ${activeTab === 'basic' ? styles.active : ''}`}
              onClick={() => setActiveTab('basic')}
            >
              Basic Info
            </button>
            <button 
              className={`${styles.tab} ${activeTab === 'academic' ? styles.active : ''}`}
              onClick={() => setActiveTab('academic')}
            >
              Academic
            </button>
            <button 
              className={`${styles.tab} ${activeTab === 'professional' ? styles.active : ''}`}
              onClick={() => setActiveTab('professional')}
            >
              Professional
            </button>
            <button 
              className={`${styles.tab} ${activeTab === 'social' ? styles.active : ''}`}
              onClick={() => setActiveTab('social')}
            >
              Social & Links
            </button>
            <button 
              className={`${styles.tab} ${activeTab === 'privacy' ? styles.active : ''}`}
              onClick={() => setActiveTab('privacy')}
            >
              Privacy
            </button>
          </div>

          {/* Profile Form */}
          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Basic Info Tab */}
            {activeTab === 'basic' && (
              <div className={styles.tabContent}>
                <h3>Basic Information</h3>
                
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="firstName">First Name *</label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={profileData.firstName}
                      onChange={handleInputChange}
                      className={errors.firstName ? styles.error : ''}
                      required
                    />
                    {errors.firstName && <span className={styles.errorText}>{errors.firstName}</span>}
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label htmlFor="lastName">Last Name *</label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={profileData.lastName}
                      onChange={handleInputChange}
                      className={errors.lastName ? styles.error : ''}
                      required
                    />
                    {errors.lastName && <span className={styles.errorText}>{errors.lastName}</span>}
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="bio">Bio</label>
                  <textarea
                    id="bio"
                    name="bio"
                    value={profileData.bio}
                    onChange={handleInputChange}
                    rows="4"
                    placeholder="Tell us about yourself..."
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="profilePicture">Profile Picture URL</label>
                  <input
                    type="url"
                    id="profilePicture"
                    name="profilePicture"
                    value={profileData.profilePicture}
                    onChange={handleInputChange}
                    placeholder="https://example.com/your-photo.jpg"
                  />
                </div>
              </div>
            )}

            {/* Academic Tab */}
            {activeTab === 'academic' && (
              <div className={styles.tabContent}>
                <h3>Academic Information</h3>
                
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="graduation_year">Graduation Year</label>
                    <input
                      type="number"
                      id="graduation_year"
                      name="graduation_year"
                      value={profileData.graduation_year}
                      onChange={handleInputChange}
                      min="2000"
                      max={new Date().getFullYear() + 5}
                      className={errors.graduation_year ? styles.error : ''}
                    />
                    {errors.graduation_year && <span className={styles.errorText}>{errors.graduation_year}</span>}
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label htmlFor="roll_number">Roll Number</label>
                    <input
                      type="text"
                      id="roll_number"
                      name="roll_number"
                      value={profileData.roll_number}
                      onChange={handleInputChange}
                      placeholder="e.g., 19115001"
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="branch">Branch</label>
                    <select
                      id="branch"
                      name="branch"
                      value={profileData.branch}
                      onChange={handleInputChange}
                    >
                      <option value="">Select Branch</option>
                      <option value="Computer Science">Computer Science</option>
                      <option value="Electronics & Communication">Electronics & Communication</option>
                      <option value="Data Science">Data Science</option>
                      <option value="Information Technology">Information Technology</option>
                    </select>
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label htmlFor="degree">Degree</label>
                    <select
                      id="degree"
                      name="degree"
                      value={profileData.degree}
                      onChange={handleInputChange}
                    >
                      <option value="">Select Degree</option>
                      <option value="B.Tech">B.Tech</option>
                      <option value="M.Tech">M.Tech</option>
                      <option value="PhD">PhD</option>
                    </select>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="achievements">Achievements</label>
                  <textarea
                    id="achievements"
                    name="achievements"
                    value={profileData.achievements}
                    onChange={handleInputChange}
                    rows="3"
                    placeholder="Academic achievements, awards, honors..."
                  />
                </div>
              </div>
            )}

            {/* Professional Tab */}
            {activeTab === 'professional' && (
              <div className={styles.tabContent}>
                <h3>Professional Information</h3>
                
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="current_company">Current Company</label>
                    <input
                      type="text"
                      id="current_company"
                      name="current_company"
                      value={profileData.current_company}
                      onChange={handleInputChange}
                      placeholder="e.g., Google, Microsoft"
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label htmlFor="current_position">Current Position</label>
                    <input
                      type="text"
                      id="current_position"
                      name="current_position"
                      value={profileData.current_position}
                      onChange={handleInputChange}
                      placeholder="e.g., Software Engineer, Product Manager"
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="current_city">City</label>
                    <input
                      type="text"
                      id="current_city"
                      name="current_city"
                      value={profileData.current_city}
                      onChange={handleInputChange}
                      placeholder="e.g., Bangalore"
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label htmlFor="current_state">State</label>
                    <input
                      type="text"
                      id="current_state"
                      name="current_state"
                      value={profileData.current_state}
                      onChange={handleInputChange}
                      placeholder="e.g., Karnataka"
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label htmlFor="current_country">Country</label>
                    <input
                      type="text"
                      id="current_country"
                      name="current_country"
                      value={profileData.current_country}
                      onChange={handleInputChange}
                      placeholder="e.g., India"
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="skills">Skills</label>
                  <textarea
                    id="skills"
                    name="skills"
                    value={profileData.skills}
                    onChange={handleInputChange}
                    rows="3"
                    placeholder="JavaScript, Python, React, Node.js, Machine Learning..."
                  />
                </div>
              </div>
            )}

            {/* Social & Links Tab */}
            {activeTab === 'social' && (
              <div className={styles.tabContent}>
                <h3>Social Media & Links</h3>
                
                <div className={styles.formGroup}>
                  <label htmlFor="linkedin_url">LinkedIn Profile</label>
                  <input
                    type="url"
                    id="linkedin_url"
                    name="linkedin_url"
                    value={profileData.linkedin_url}
                    onChange={handleInputChange}
                    placeholder="https://linkedin.com/in/yourprofile"
                    className={errors.linkedin_url ? styles.error : ''}
                  />
                  {errors.linkedin_url && <span className={styles.errorText}>{errors.linkedin_url}</span>}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="github_url">GitHub Profile</label>
                  <input
                    type="url"
                    id="github_url"
                    name="github_url"
                    value={profileData.github_url}
                    onChange={handleInputChange}
                    placeholder="https://github.com/yourusername"
                    className={errors.github_url ? styles.error : ''}
                  />
                  {errors.github_url && <span className={styles.errorText}>{errors.github_url}</span>}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="portfolio_url">Portfolio Website</label>
                  <input
                    type="url"
                    id="portfolio_url"
                    name="portfolio_url"
                    value={profileData.portfolio_url}
                    onChange={handleInputChange}
                    placeholder="https://yourportfolio.com"
                    className={errors.portfolio_url ? styles.error : ''}
                  />
                  {errors.portfolio_url && <span className={styles.errorText}>{errors.portfolio_url}</span>}
                </div>
              </div>
            )}

            {/* Privacy Tab */}
            {activeTab === 'privacy' && (
              <div className={styles.tabContent}>
                <h3>Privacy & Visibility Settings</h3>
                
                <div className={styles.checkboxGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      name="is_profile_public"
                      checked={profileData.is_profile_public}
                      onChange={handleInputChange}
                    />
                    <span className={styles.checkmark}></span>
                    Make my profile visible in the alumni directory
                  </label>
                  <p className={styles.helpText}>
                    When enabled, other alumni can discover and view your profile in the directory.
                  </p>
                </div>

                <div className={styles.checkboxGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      name="is_open_to_work"
                      checked={profileData.is_open_to_work}
                      onChange={handleInputChange}
                    />
                    <span className={styles.checkmark}></span>
                    Open to work opportunities
                  </label>
                  <p className={styles.helpText}>
                    Show that you're actively looking for new job opportunities.
                  </p>
                </div>

                <div className={styles.checkboxGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      name="is_available_for_mentorship"
                      checked={profileData.is_available_for_mentorship}
                      onChange={handleInputChange}
                    />
                    <span className={styles.checkmark}></span>
                    Available for mentorship
                  </label>
                  <p className={styles.helpText}>
                    Let junior alumni know you're available to provide guidance and mentorship.
                  </p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className={styles.submitSection}>
              <button 
                type="submit" 
                className={styles.submitButton}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

export default Profile

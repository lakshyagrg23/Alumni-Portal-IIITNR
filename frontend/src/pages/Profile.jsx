import React, { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useAuth } from '@hooks/useAuth'
import { authService } from '../services/authService'
import ProfilePictureUpload from '../components/profile/ProfilePictureUpload'
import styles from './Profile.module.css'

const Profile = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formKey, setFormKey] = useState(0) // Add form key for forced re-renders
  const [profileData, setProfileData] = useState({
    // Basic user info
    firstName: '',
    lastName: '',
    email: '',
    profilePicture: '',
    
    // Alumni profile info - using camelCase
    graduationYear: '',
    branch: '',
    degree: '',
    studentId: '',  // Changed from roll_number to studentId
    bio: '',
    currentCompany: '',
    currentPosition: '',
    currentCity: '',
    currentState: '',
    currentCountry: '',
    linkedinUrl: '',
    githubUrl: '',
    portfolioUrl: '',
    skills: '',
    interests: '',
    isProfilePublic: true,
  })
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState('basic')
  const [hasAlumniProfile, setHasAlumniProfile] = useState(false)

  // Use the same branch values as onboarding so saved selections render correctly
  const branchOptions = [
    'Computer Science & Engineering',
    'Electronics & Communication Engineering',
    'Data Science & Artificial Intelligence',
  ]
  const displayedBranchOptions =
    profileData.branch && !branchOptions.includes(profileData.branch)
      ? [profileData.branch, ...branchOptions]
      : branchOptions

  // Load profile data on component mount
  useEffect(() => {
    loadProfileData()
  }, [])

  // Handle profile picture upload success
  const handlePictureUploadSuccess = (newPictureUrl) => {
    setProfileData(prev => ({
      ...prev,
      profilePicture: newPictureUrl
    }))
    setMessage('Profile picture updated successfully!')
    setTimeout(() => setMessage(''), 3000)
  }

  const loadProfileData = async () => {
    try {
      setLoading(true)
      console.log('Loading profile data...')
      const response = await authService.getProfile()
      console.log('Profile response:', response)
      
      if (response.success) {
        const { data } = response
        console.log('Profile data:', data)
        
        const alumni = data.alumniProfile || {}
        const gradYear = alumni.graduationYear ?? alumni.graduation_year
        const branch = alumni.branch
        const degree = alumni.degree
        const bio = alumni.bio
        
        // Check if profile is complete (has essential alumni information)
        const profileComplete = Boolean(
          gradYear &&
          branch &&
          degree &&
          bio &&
          bio.trim().length > 0
        );
        
        console.log('Profile complete:', profileComplete)
        setHasAlumniProfile(profileComplete)
        
        const newProfileData = {
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          profilePicture: alumni.profilePictureUrl ?? alumni.profile_picture_url ?? data.profilePicture ?? '',
          
          // Alumni profile data - convert to camelCase
          graduationYear: gradYear || '',
          branch: branch || '',
          degree: degree || '',
          studentId: alumni.studentId ?? alumni.student_id ?? '',
          bio: bio || '',
          currentCompany: alumni.currentCompany ?? alumni.currentEmployer ?? alumni.current_company ?? '',
          currentPosition: alumni.currentPosition ?? alumni.currentJobTitle ?? alumni.current_position ?? '',
          currentCity: alumni.currentCity ?? alumni.current_city ?? '',
          currentState: alumni.currentState ?? alumni.current_state ?? '',
          currentCountry: alumni.currentCountry ?? alumni.current_country ?? '',
          linkedinUrl: alumni.linkedinUrl ?? alumni.linkedin_url ?? '',
          githubUrl: alumni.githubUrl ?? alumni.github_url ?? '',
          portfolioUrl: alumni.portfolioUrl ?? alumni.portfolio_url ?? '',
          skills: Array.isArray(alumni?.skills) 
            ? alumni.skills.join(', ') 
            : alumni?.skills || '',
          interests: Array.isArray(alumni?.interests) 
            ? alumni.interests.join(', ') 
            : alumni?.interests || '',
          isProfilePublic: alumni.isProfilePublic ?? alumni.is_profile_public ?? true,
        }
        
        console.log('Setting new profile data:', newProfileData)
        setProfileData(newProfileData)
      } else {
        console.error('Profile response not successful:', response)
        setMessage('Failed to load profile data')
      }
    } catch (error) {
      console.error('Error loading profile:', error)
      setMessage(`Error loading profile data: ${error.message}`)
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
    
    if (profileData.graduationYear && 
        (profileData.graduationYear < 2000 || profileData.graduationYear > new Date().getFullYear() + 5)) {
      newErrors.graduationYear = 'Please enter a valid graduation year'
    }
    
    // Validate URLs if provided
    const urlFields = ['linkedinUrl', 'githubUrl', 'portfolioUrl']
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
      console.log('Original profile data:', profileData)
      
      // Remove any snake_case duplicates to avoid confusion
      delete updateData.linkedin_url;
      delete updateData.github_url;
      delete updateData.portfolio_url;
      delete updateData.profile_picture;
      
      // Convert array fields (skills, interests) from strings to arrays
      const arrayFields = ['skills', 'interests'];
      arrayFields.forEach(field => {
        if (typeof updateData[field] === 'string') {
          if (updateData[field].trim() === '') {
            updateData[field] = [];
          } else {
            updateData[field] = updateData[field]
              .split(',')
              .map(item => item.trim())
              .filter(item => item.length > 0);
          }
        } else if (!updateData[field] || !Array.isArray(updateData[field])) {
          updateData[field] = [];
        }
      });
      
      console.log('Data being sent to API:', updateData)
      
      // Call the API directly instead of using AuthContext
      const result = await authService.updateProfile(updateData)
      console.log('Update result:', result)
      
      setMessage('Profile updated successfully!')
      
      // Immediately reload the profile data
      console.log('Reloading profile data after update...')
      setLoading(true)
      await loadProfileData()
      setLoading(false)
      setFormKey(prev => prev + 1) // Force form re-render
      console.log('Profile data reloaded')
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Error updating profile:', error)
      setMessage(`Error updating profile: ${error.message}`)
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
                Complete your essential alumni information (graduation year, branch, degree, and bio) 
                to fully unlock all portal features and connect with other alumni.
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
                src={profileData.profilePicture 
                  ? (profileData.profilePicture.startsWith('http') 
                      ? profileData.profilePicture 
                      : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${profileData.profilePicture}`)
                  : '/default-avatar.svg'}
                alt={`${profileData.firstName} ${profileData.lastName}`}
                className={styles.avatar}
                onError={(e) => {
                  e.target.src = '/default-avatar.svg'
                }}
              />
              <div className={styles.userInfo}>
                <h2>{profileData.firstName} {profileData.lastName}</h2>
                <p className={styles.email}>{profileData.email}</p>
                {profileData.currentPosition && profileData.currentCompany && (
                  <p className={styles.position}>
                    {profileData.currentPosition} at {profileData.currentCompany}
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
          <form key={formKey} onSubmit={handleSubmit} className={styles.form}>
            {/* Basic Info Tab */}
            {activeTab === 'basic' && (
              <div className={styles.tabContent}>
                <h3>Basic Information</h3>
                
                {/* Profile Picture Upload Section */}
                <div className={styles.formGroup}>
                  <label>Profile Picture</label>
                  <ProfilePictureUpload
                    currentPictureUrl={profileData.profilePicture}
                    onUploadSuccess={handlePictureUploadSuccess}
                    allowDelete={false}
                  />
                </div>

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
              </div>
            )}

            {/* Academic Tab */}
            {activeTab === 'academic' && (
              <div className={styles.tabContent}>
                <h3>Academic Information</h3>
                
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="graduationYear">Graduation Year</label>
                    <input
                      type="number"
                      id="graduationYear"
                      name="graduationYear"
                      value={profileData.graduationYear}
                      onChange={handleInputChange}
                      min="2000"
                      max={new Date().getFullYear() + 5}
                      className={errors.graduationYear ? styles.error : ''}
                    />
                    {errors.graduationYear && <span className={styles.errorText}>{errors.graduationYear}</span>}
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label htmlFor="studentId">Roll Number</label>
                    <input
                      type="text"
                      id="studentId"
                      name="studentId"
                      value={profileData.studentId}
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
                      {displayedBranchOptions.map(branch => (
                        <option key={branch} value={branch}>
                          {branch}
                        </option>
                      ))}
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
              </div>
            )}

            {/* Professional Tab */}
            {activeTab === 'professional' && (
              <div className={styles.tabContent}>
                <h3>Professional Information</h3>
                
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="currentCompany">Current Company</label>
                    <input
                      type="text"
                      id="currentCompany"
                      name="currentCompany"
                      value={profileData.currentCompany}
                      onChange={handleInputChange}
                      placeholder="e.g., Google, Microsoft"
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label htmlFor="currentPosition">Current Position</label>
                    <input
                      type="text"
                      id="currentPosition"
                      name="currentPosition"
                      value={profileData.currentPosition}
                      onChange={handleInputChange}
                      placeholder="e.g., Software Engineer, Product Manager"
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="currentCity">City</label>
                    <input
                      type="text"
                      id="currentCity"
                      name="currentCity"
                      value={profileData.currentCity}
                      onChange={handleInputChange}
                      placeholder="e.g., Bangalore"
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label htmlFor="currentState">State</label>
                    <input
                      type="text"
                      id="currentState"
                      name="currentState"
                      value={profileData.currentState}
                      onChange={handleInputChange}
                      placeholder="e.g., Karnataka"
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label htmlFor="currentCountry">Country</label>
                    <input
                      type="text"
                      id="currentCountry"
                      name="currentCountry"
                      value={profileData.currentCountry}
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
                  <label htmlFor="linkedinUrl">LinkedIn Profile</label>
                  <input
                    type="url"
                    id="linkedinUrl"
                    name="linkedinUrl"
                    value={profileData.linkedinUrl}
                    onChange={handleInputChange}
                    placeholder="https://linkedin.com/in/yourprofile"
                    className={errors.linkedinUrl ? styles.error : ''}
                  />
                  {errors.linkedinUrl && <span className={styles.errorText}>{errors.linkedinUrl}</span>}
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
                    className={errors.githubUrl ? styles.error : ''}
                  />
                  {errors.githubUrl && <span className={styles.errorText}>{errors.githubUrl}</span>}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="portfolioUrl">Portfolio Website</label>
                  <input
                    type="url"
                    id="portfolioUrl"
                    name="portfolioUrl"
                    value={profileData.portfolioUrl}
                    onChange={handleInputChange}
                    placeholder="https://yourportfolio.com"
                    className={errors.portfolioUrl ? styles.error : ''}
                  />
                  {errors.portfolioUrl && <span className={styles.errorText}>{errors.portfolioUrl}</span>}
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
                      name="isProfilePublic"
                      checked={profileData.isProfilePublic}
                      onChange={handleInputChange}
                    />
                    <span className={styles.checkmark}></span>
                    Make my profile visible in the alumni directory
                  </label>
                  <p className={styles.helpText}>
                    When enabled, other alumni can discover and view your profile in the directory.
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

export default Profile;

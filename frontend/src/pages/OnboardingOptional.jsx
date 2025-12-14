import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useAuth } from '@hooks/useAuth'
import { authService } from '../services/authService'
import styles from './OnboardingOptional.module.css'

const OnboardingOptional = () => {
  const { user, completeOnboarding } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isCurrentStudent, setIsCurrentStudent] = useState(false)

  const [formData, setFormData] = useState({
    personalEmail: '',
    githubUrl: '',
    twitterUrl: '',
    portfolioUrl: '',
    // Alumni only
    interestedInMentoring: false,
    openToReferrals: false,
    availableForSpeaking: false,
  })

  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    try {
      setLoading(true)
      const response = await authService.getProfile()
      
      if (response.success) {
        const { data } = response
        const alumni = data.alumniProfile || {}

        const gradYear = alumni.graduationYear || 0
        const currentYear = new Date().getFullYear()
        const isStudent = gradYear > currentYear
        setIsCurrentStudent(isStudent)

        // Load existing data if any
        setFormData({
          personalEmail: alumni.personalEmail || '',
          githubUrl: alumni.githubUrl || '',
          twitterUrl: alumni.twitterUrl || '',
          portfolioUrl: alumni.portfolioUrl || '',
          interestedInMentoring: alumni.interestedInMentoring || false,
          openToReferrals: alumni.openToReferrals || false,
          availableForSpeaking: alumni.availableForSpeaking || false,
        })
      }
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleToggleChange = (field) => {
    setFormData(prev => ({ ...prev, [field]: !prev[field] }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      setSaving(true)
      setMessage({ type: '', text: '' })

      const submitData = {
        personalEmail: formData.personalEmail || null,
        githubUrl: formData.githubUrl || null,
        twitterUrl: formData.twitterUrl || null,
        portfolioUrl: formData.portfolioUrl || null,
      }

      if (!isCurrentStudent) {
        submitData.interestedInMentoring = formData.interestedInMentoring
        submitData.openToReferrals = formData.openToReferrals
        submitData.availableForSpeaking = formData.availableForSpeaking
      }

      const response = await authService.updateProfile(submitData)

      if (response.success) {
        // Mark onboarding as complete
        await completeOnboarding()
        navigate('/dashboard')
      } else {
        setMessage({ type: 'error', text: response.message || 'Failed to save profile' })
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      setMessage({ type: 'error', text: 'An error occurred while saving' })
    } finally {
      setSaving(false)
    }
  }

  const handleSkip = async () => {
    try {
      // Mark onboarding as complete even when skipping
      await completeOnboarding()
      navigate('/dashboard')
    } catch (error) {
      console.error('Error completing onboarding:', error)
      // Still navigate even if marking complete fails
      navigate('/dashboard')
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

  return (
    <>
      <Helmet>
        <title>Add More Details (Optional) - IIIT Naya Raipur Alumni Portal</title>
      </Helmet>

      <div className={styles.onboardingPage}>
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.header}>
            <h1>One More Thing...</h1>
            <p>Add more ways for the community to connect with you (completely optional)</p>
          </div>

          {/* Message */}
          {message.text && (
            <div className={`${styles.message} ${styles[message.type]}`}>
              {message.text}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Secondary Email */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3>Secondary Email Address</h3>
              </div>
              <p className={styles.helpText}>
                Add a secondary email for account recovery and important updates.
                This will NOT be visible on your public profile.
              </p>
              <input
                type="email"
                name="personalEmail"
                value={formData.personalEmail}
                onChange={handleInputChange}
                placeholder="your.secondary.email@gmail.com"
              />
            </div>

            {/* Additional Social Links */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3>Additional Social Profiles</h3>
              </div>
              <p className={styles.helpText}>
                Share your other online profiles (all optional)
              </p>
              
              <div className={styles.inputGroup}>
                <label>
                  <span className={styles.label}>
                    <svg className={styles.labelIcon} viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    GitHub Profile
                  </span>
                  <input
                    type="url"
                    name="githubUrl"
                    value={formData.githubUrl}
                    onChange={handleInputChange}
                    placeholder="https://github.com/yourusername"
                  />
                </label>

                <label>
                  <span className={styles.label}>
                    <svg className={styles.labelIcon} viewBox="0 0 24 24" fill="currentColor">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                    </svg>
                    Twitter/X Profile
                  </span>
                  <input
                    type="url"
                    name="twitterUrl"
                    value={formData.twitterUrl}
                    onChange={handleInputChange}
                    placeholder="https://twitter.com/yourusername"
                  />
                </label>

                <label>
                  <span className={styles.label}>
                    <svg className={styles.labelIcon} viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20 3H4c-1.103 0-2 .897-2 2v14c0 1.103.897 2 2 2h16c1.103 0 2-.897 2-2V5c0-1.103-.897-2-2-2zM4 19V7h16l.002 12H4z"/>
                      <path d="M9.293 9.293 5.586 13l3.707 3.707 1.414-1.414L8.414 13l2.293-2.293zm5.414 0-1.414 1.414L15.586 13l-2.293 2.293 1.414 1.414L18.414 13z"/>
                    </svg>
                    Portfolio/Personal Website
                  </span>
                  <input
                    type="url"
                    name="portfolioUrl"
                    value={formData.portfolioUrl}
                    onChange={handleInputChange}
                    placeholder="https://yourwebsite.com"
                  />
                </label>
              </div>
            </div>

            {/* Community Engagement (Alumni Only) */}
            {!isCurrentStudent && (
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h3>Community Engagement</h3>
                </div>
                <p className={styles.helpText}>
                  Help other alumni by offering your expertise
                </p>
                
                <div className={styles.toggleList}>
                  <label className={styles.toggleLabel}>
                    <div className={styles.toggleInfo}>
                      <span className={styles.toggleTitle}>Mentorship</span>
                      <span className={styles.toggleDesc}>Guide students or junior alumni in their career journey</span>
                    </div>
                    <div className={styles.toggle}>
                      <input
                        type="checkbox"
                        checked={formData.interestedInMentoring}
                        onChange={() => handleToggleChange('interestedInMentoring')}
                      />
                      <span className={styles.slider}></span>
                    </div>
                  </label>

                  <label className={styles.toggleLabel}>
                    <div className={styles.toggleInfo}>
                      <span className={styles.toggleTitle}>Job Referrals</span>
                      <span className={styles.toggleDesc}>Provide referrals at your company for suitable candidates</span>
                    </div>
                    <div className={styles.toggle}>
                      <input
                        type="checkbox"
                        checked={formData.openToReferrals}
                        onChange={() => handleToggleChange('openToReferrals')}
                      />
                      <span className={styles.slider}></span>
                    </div>
                  </label>

                  <label className={styles.toggleLabel}>
                    <div className={styles.toggleInfo}>
                      <span className={styles.toggleTitle}>Guest Speaking</span>
                      <span className={styles.toggleDesc}>Share your experiences at college events or sessions</span>
                    </div>
                    <div className={styles.toggle}>
                      <input
                        type="checkbox"
                        checked={formData.availableForSpeaking}
                        onChange={() => handleToggleChange('availableForSpeaking')}
                      />
                      <span className={styles.slider}></span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className={styles.actions}>
              <button
                type="button"
                onClick={() => navigate('/onboarding')}
                className={styles.backButton}
              >
                ← Back
              </button>
              <button 
                type="submit" 
                className={styles.submitButton}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Complete & Go to Dashboard'}
              </button>
            </div>
          </form>

          {/* Progress Indicator */}
          <div className={styles.progress}>
            <div className={styles.progressStep}>
              <div className={`${styles.progressDot} ${styles.completed}`}>✓</div>
              <span>Essential Details</span>
            </div>
            <div className={styles.progressLine}></div>
            <div className={styles.progressStep}>
              <div className={`${styles.progressDot} ${styles.active}`}>2</div>
              <span>Optional Extras</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default OnboardingOptional

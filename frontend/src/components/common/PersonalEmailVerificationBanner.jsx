import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@hooks/useAuth'
import styles from './PersonalEmailVerificationBanner.module.css'

const PersonalEmailVerificationBanner = () => {
  const { user } = useAuth()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (!user) return

    // Check if user has personal email and it's not verified
    const hasUnverifiedEmail = user.personalEmail && !user.personalEmailVerified

    if (!hasUnverifiedEmail) {
      setIsVisible(false)
      return
    }

    // Check if banner was dismissed
    const dismissedUntil = localStorage.getItem('personalEmailBannerDismissed')
    if (dismissedUntil) {
      const dismissedDate = new Date(dismissedUntil)
      const now = new Date()
      
      // Show banner again after 7 days
      if (now < dismissedDate) {
        setIsVisible(false)
        return
      }
    }

    // Check account age - only show after 3 days
    if (user.createdAt) {
      const createdDate = new Date(user.createdAt)
      const now = new Date()
      const daysSinceCreation = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24))

      if (daysSinceCreation < 3) {
        setIsVisible(false)
        return
      }
    }

    // All conditions met, show banner
    setIsVisible(true)
  }, [user])

  const handleDismiss = () => {
    // Dismiss for 7 days
    const dismissUntil = new Date()
    dismissUntil.setDate(dismissUntil.getDate() + 7)
    localStorage.setItem('personalEmailBannerDismissed', dismissUntil.toISOString())
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <div className={styles.banner}>
      <div className={styles.content}>
        <div className={styles.icon}>!</div>
        <div className={styles.message}>
          <strong>Verify Your Secondary Email</strong>
          <p>
            Keep your account secure! Your secondary email ({user.personalEmail}) is not verified yet. 
            It will be used for account recovery and important updates.
          </p>
        </div>
        <div className={styles.actions}>
          <Link to="/profile" className={styles.verifyButton}>
            Verify Now
          </Link>
          <button onClick={handleDismiss} className={styles.dismissButton}>
            Remind Me Later
          </button>
        </div>
      </div>
    </div>
  )
}

export default PersonalEmailVerificationBanner

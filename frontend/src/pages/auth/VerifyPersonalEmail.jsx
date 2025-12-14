import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { authService } from '../../services/authService'
import styles from './VerifyPersonalEmail.module.css'

const VerifyPersonalEmail = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('verifying') // verifying, success, error
  const [message, setMessage] = useState('')

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token')

      if (!token) {
        setStatus('error')
        setMessage('No verification token provided.')
        return
      }

      try {
        const response = await authService.verifyPersonalEmail(token)

        if (response.success) {
          setStatus('success')
          setMessage(response.message || 'Secondary email verified successfully!')
          
          // Redirect to profile after 3 seconds
          setTimeout(() => {
            navigate('/profile')
          }, 3000)
        } else {
          setStatus('error')
          setMessage(response.message || 'Verification failed.')
        }
      } catch (error) {
        setStatus('error')
        setMessage(
          error.response?.data?.message || 
          'Verification failed. The link may be expired or invalid.'
        )
      }
    }

    verifyEmail()
  }, [searchParams, navigate])

  return (
    <>
      <Helmet>
        <title>Verify Personal Email | IIIT Naya Raipur Alumni</title>
      </Helmet>

      <div className={styles.container}>
        <div className={styles.card}>
          {status === 'verifying' && (
            <>
              <div className={styles.spinner}></div>
              <h2>Verifying Your Email...</h2>
              <p>Please wait while we verify your secondary email address.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className={styles.successIcon}>✓</div>
              <h2>Email Verified Successfully!</h2>
              <p>{message}</p>
              <p className={styles.subText}>
                Redirecting you to your profile...
              </p>
              <button 
                onClick={() => navigate('/profile')} 
                className={styles.button}
              >
                Go to Profile Now
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <div className={styles.errorIcon}>✕</div>
              <h2>Verification Failed</h2>
              <p>{message}</p>
              <div className={styles.actions}>
                <button 
                  onClick={() => navigate('/profile')} 
                  className={styles.button}
                >
                  Go to Profile
                </button>
                <button 
                  onClick={() => navigate('/dashboard')} 
                  className={styles.buttonSecondary}
                >
                  Go to Dashboard
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

export default VerifyPersonalEmail

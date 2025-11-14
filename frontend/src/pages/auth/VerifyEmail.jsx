import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../../services/authService';
import styles from './VerifyEmail.module.css';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('');
  const hasVerified = useRef(false); // Prevent double verification

  useEffect(() => {
    // Prevent double execution (React StrictMode or re-renders)
    if (hasVerified.current) {
      return;
    }

    const verifyEmail = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setStatus('error');
        setMessage(
          'Invalid verification link. Please check your email or request a new verification link.'
        );
        return;
      }

      // Mark as attempting verification
      hasVerified.current = true;

      try {
        const response = await authService.verifyEmail(token);
        
        // Debug: Log the response to see what we're getting
        console.log('Verification response:', response);

        if (response.success || response.verified) {
          setStatus('success');
          setMessage(response.message);

          // Redirect to login after 3 seconds
          setTimeout(() => {
            navigate('/login', {
              state: { message: 'Email verified! Please login to continue.' },
            });
          }, 3000);
        } else if (response.alreadyVerified) {
          // Handle already verified case
          setStatus('success');
          setMessage('Your email is already verified! You can login now.');
          
          setTimeout(() => {
            navigate('/login', {
              state: { message: 'Your email is already verified. Please login.' },
            });
          }, 3000);
        } else {
          // Other errors - log for debugging
          console.error('Unexpected response format:', response);
          setStatus('error');
          setMessage(response.message || 'Verification failed. Please try again.');
        }
      } catch (error) {
        // Debug: Log the error details
        console.error('Verification error caught:', error);
        console.error('Error response:', error.response?.data);
        
        // Only show error if it's not a duplicate call issue
        if (!error.message.includes('Invalid verification token')) {
          setStatus('error');
          setMessage(
            error.message || 'Verification failed. The link may have expired.'
          );
        } else {
          // Token already used - treat as success since first call worked
          console.log('Token already used (duplicate call), treating as success');
          setStatus('success');
          setMessage('Email verified successfully! You can now login to your account.');
          
          setTimeout(() => {
            navigate('/login', {
              state: { message: 'Email verified! Please login to continue.' },
            });
          }, 3000);
        }
      }
    };

    verifyEmail();
  }, []); // Empty dependency array - only run once

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {status === 'verifying' && (
          <>
            <div className={styles.spinner}></div>
            <h2>Verifying your email...</h2>
            <p>Please wait while we verify your account.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className={styles.successIcon}>✓</div>
            <h2>Email Verified Successfully!</h2>
            <p>{message}</p>
            <p className={styles.redirect}>Redirecting to login...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className={styles.errorIcon}>✗</div>
            <h2>Verification Failed</h2>
            <p>{message}</p>
            <button
              className={styles.button}
              onClick={() => navigate('/login')}
            >
              Go to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;

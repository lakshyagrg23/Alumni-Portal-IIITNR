import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { authService } from '../../services/authService';
import styles from './EmailSent.module.css';

const EmailSent = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState('');

  // Redirect if no email in state
  if (!email) {
    navigate('/register');
    return null;
  }

  const handleResend = async () => {
    setResending(true);
    setMessage('');

    try {
      const response = await authService.resendVerification(email);
      setMessage({ type: 'success', text: response.message });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.emailIcon}>📧</div>
        <h1>Check Your Email</h1>
        <p className={styles.mainText}>We've sent a verification link to:</p>
        <p className={styles.email}>{email}</p>

        <div className={styles.instructions}>
          <h3>What's next?</h3>
          <ol>
            <li>Open your email inbox</li>
            <li>Find the email from IIIT Naya Raipur Alumni Portal</li>
            <li>Click the verification link</li>
            <li>Login to your account</li>
          </ol>
        </div>

        <div className={styles.note}>
          <strong>Note:</strong> The verification link expires in 24 hours.
        </div>

        {message && (
          <div className={`${styles.message} ${styles[message.type]}`}>
            {message.text}
          </div>
        )}

        <div className={styles.actions}>
          <button
            onClick={handleResend}
            disabled={resending}
            className={styles.resendButton}
          >
            {resending ? 'Sending...' : 'Resend Verification Email'}
          </button>

          <Link to="/login" className={styles.loginLink}>
            Already verified? Login
          </Link>
        </div>

        <p className={styles.spam}>
          Can't find the email? Check your spam or junk folder.
        </p>
      </div>
    </div>
  );
};

export default EmailSent;

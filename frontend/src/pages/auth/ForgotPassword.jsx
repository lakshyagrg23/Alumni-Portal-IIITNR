import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { authService } from '../../services/authService';
import toast from 'react-hot-toast';
import styles from './Register.module.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate email
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      const response = await authService.forgotPassword(email);

      if (response.success) {
        setEmailSent(true);
        toast.success('Password reset link sent! Please check your email.');
      } else {
        toast.error(response.message || 'Failed to send reset link');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to send reset link. Please try again.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <>
        <Helmet>
          <title>Check Your Email - IIIT Naya Raipur Alumni Portal</title>
        </Helmet>
        <div className={styles.registerContainer}>
          <div className={styles.registerCard}>
            <div className={styles.headerSection}>
              <img src="/iiit-logo.png" alt="IIIT-NR Logo" className={styles.logo} />
              <h1 className={styles.title}>Check Your Email</h1>
              <p className={styles.subtitle}>
                If an account exists with <strong>{email}</strong>, we've sent a password reset link.
              </p>
            </div>

            <div className={styles.infoBox}>
              <p>Please check your email inbox and click on the reset link.</p>
              <p className={styles.infoText}>
                The link will expire in 1 hour for security reasons.
              </p>
              <p className={styles.infoText}>
                Don't see the email? Check your spam folder.
              </p>
            </div>

            <div className={styles.footerText}>
              <Link to="/login" className={styles.link}>
                ← Back to Login
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Forgot Password - IIIT Naya Raipur Alumni Portal</title>
      </Helmet>
      <div className={styles.registerContainer}>
        <div className={styles.registerCard}>
          <div className={styles.headerSection}>
            <img src="/iiit-logo.png" alt="IIIT-NR Logo" className={styles.logo} />
            <h1 className={styles.title}>Reset Your Password</h1>
            <p className={styles.subtitle}>
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.inputGroup}>
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your registered email"
                required
                autoFocus
              />
            </div>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <div className={styles.footerText}>
            <Link to="/login" className={styles.link}>
              ← Back to Login
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default ForgotPassword;

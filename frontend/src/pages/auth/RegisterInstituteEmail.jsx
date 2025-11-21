import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, Link } from 'react-router-dom';
import API from '../../services/authService';
import styles from './RegisterNew.module.css';
import GoogleLogin from '../../services/google_login';

const RegisterInstituteEmail = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    } else if (!formData.email.toLowerCase().endsWith('@iiitnr.edu.in') && 
               !formData.email.toLowerCase().endsWith('@iiitnr.ac.in')) {
      newErrors.email = 'Please use your institute email (@iiitnr.edu.in or @iiitnr.ac.in)';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      setLoading(true);

      const response = await API.post('/auth/register/institute-email', {
        email: formData.email,
        password: formData.password,
      });

      if (response.success) {
        setSuccessMessage(response.message);
        // Redirect to email sent page after 2 seconds
        setTimeout(() => {
          navigate('/email-sent', { 
            state: { 
              email: formData.email,
              message: 'Please check your email to verify your account'
            }
          });
        }, 2000);
      }
    } catch (error) {
      console.error('Registration error:', error);
      setErrors({
        submit: error.message || 'Registration failed. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setLoading(true);

      // Decode JWT to get email
      const decoded = JSON.parse(atob(credentialResponse.credential.split('.')[1]));
      
      // Check if it's institute email
      if (!decoded.email.toLowerCase().endsWith('@iiitnr.edu.in') && 
          !decoded.email.toLowerCase().endsWith('@iiitnr.ac.in')) {
        setErrors({
          submit: 'Please use your institute Google account (@iiitnr.edu.in or @iiitnr.ac.in)'
        });
        setLoading(false);
        return;
      }

      const response = await API.post('/auth/google', {
        email: decoded.email,
        googleId: decoded.sub,
        name: decoded.name,
      });

      if (response.success) {
        // Store token
        localStorage.setItem('token', response.token);
        
        // Redirect based on onboarding status
        if (response.user.onboardingCompleted) {
          navigate('/dashboard');
        } else {
          navigate('/complete-profile');
        }
      }
    } catch (error) {
      console.error('Google auth error:', error);
      setErrors({
        submit: error.message || 'Google sign-in failed. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Register with Institute Email | IIIT Naya Raipur</title>
      </Helmet>

      <div className={styles.container}>
        <div className={styles.wrapper}>
          <Link to="/register" className={styles.backLink}>
            ← Back to registration options
          </Link>

          <div className={styles.header}>
            <h1>Register with Institute Email</h1>
            <p>Use your @iiitnr.edu.in or @iiitnr.ac.in email address</p>
          </div>

          <div className={styles.formContainer}>
            {successMessage && (
              <div className={styles.successMessage}>
                {successMessage}
              </div>
            )}

            {errors.submit && (
              <div className={styles.errorMessage}>
                {errors.submit}
              </div>
            )}

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="email">Institute Email *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="yourname@iiitnr.edu.in"
                  className={errors.email ? styles.error : ''}
                />
                {errors.email && (
                  <span className={styles.errorText}>{errors.email}</span>
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="password">Password *</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter password (min 6 characters)"
                  className={errors.password ? styles.error : ''}
                />
                {errors.password && (
                  <span className={styles.errorText}>{errors.password}</span>
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="confirmPassword">Confirm Password *</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter password"
                  className={errors.confirmPassword ? styles.error : ''}
                />
                {errors.confirmPassword && (
                  <span className={styles.errorText}>{errors.confirmPassword}</span>
                )}
              </div>

              <button 
                type="submit" 
                className={styles.submitBtn}
                disabled={loading}
              >
                {loading ? 'Registering...' : 'Register'}
              </button>
            </form>

            <div className={styles.divider}>
              <span>OR</span>
            </div>

            <div className={styles.oauthButtons}>
              <GoogleLogin 
                onSuccess={handleGoogleSuccess}
                buttonText="Sign up with Institute Google Account"
              />
            </div>

            <div className={styles.footer}>
              <p>
                Already have an account?{' '}
                <Link to="/login" className={styles.link}>
                  Login here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default RegisterInstituteEmail;

import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import API from '../../services/authService';
import styles from './RegisterNew.module.css';

// Step 1: Verify Identity
const VerifyIdentityStep = ({ onVerified }) => {
  const [formData, setFormData] = useState({
    rollNumber: '',
    name: '',
    dateOfBirth: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const getFriendlyError = (error) => {
    if (error?.response?.status === 404) {
      return (
        error.response?.data?.message ||
        'We could not find a matching record. Please double-check your roll number, full name, and date of birth.'
      );
    }
    return (
      error?.response?.data?.message ||
      error?.message ||
      'Verification failed. Please check your details and try again.'
    );
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.rollNumber.trim()) {
      newErrors.rollNumber = 'Roll number is required';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required';
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

      const response = await API.post('/auth/verify-identity', {
        roll_number: formData.rollNumber,
        full_name: formData.name,
        date_of_birth: formData.dateOfBirth,
      });

      if (response.success) {
        onVerified({
          verificationToken: response.verificationToken,
          userData: response.userData,
        });
      }
    } catch (error) {
      console.error('Verification error:', error);
      setErrors({
        submit: getFriendlyError(error),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.formContainer}>
      <div className={styles.stepIndicator}>
        <span className={styles.activeStep}>
          <span className={styles.stepBadge} aria-hidden="true"></span>
          Step 1: Verify Identity
        </span>
        <span className={styles.inactiveStep}>
          <span className={styles.stepBadgeMuted} aria-hidden="true"></span>
          Step 2: Create Account
        </span>
      </div>

      {errors.submit && (
        <div className={styles.errorMessage}>
          {errors.submit}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="rollNumber">Roll Number *</label>
          <input
            type="text"
            id="rollNumber"
            name="rollNumber"
            value={formData.rollNumber}
            onChange={handleChange}
            placeholder="e.g., 20121001"
            className={errors.rollNumber ? styles.error : ''}
          />
          {errors.rollNumber && (
            <span className={styles.errorText}>{errors.rollNumber}</span>
          )}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="name">Full Name (as per records) *</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g., John Doe"
            className={errors.name ? styles.error : ''}
          />
          {errors.name && (
            <span className={styles.errorText}>{errors.name}</span>
          )}
          <span className={styles.helperText}>
            Enter your name exactly as it appears in institute records
          </span>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="dateOfBirth">Date of Birth *</label>
          <input
            type="date"
            id="dateOfBirth"
            name="dateOfBirth"
            value={formData.dateOfBirth}
            onChange={handleChange}
            className={errors.dateOfBirth ? styles.error : ''}
          />
          {errors.dateOfBirth && (
            <span className={styles.errorText}>{errors.dateOfBirth}</span>
          )}
        </div>

        <button 
          type="submit" 
          className={styles.submitBtn}
          disabled={loading}
        >
          {loading ? 'Verifying...' : 'Verify Identity'}
        </button>
      </form>

      <div className={styles.infoBox}>
        <h4>Need help?</h4>
        <p>If your details don't match our records, please contact the alumni office at alumni@iiitnr.edu.in</p>
      </div>
    </div>
  );
};

// Step 2: Create Account
const CreateAccountStep = ({ verificationToken, userData, onBack }) => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const getFriendlyError = (error, fallback) => {
    if (error?.response?.status === 404) {
      return (
        error.response?.data?.message ||
        'We could not find a matching record. Please double-check your roll number, full name, and date of birth.'
      );
    }
    return error?.response?.data?.message || error?.message || fallback;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

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

      const response = await API.post('/auth/register/personal-email', {
        email: formData.email,
        password: formData.password,
        verificationToken: verificationToken,
      });

      if (response.success) {
        setSuccessMessage(response.message);
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
        submit: getFriendlyError(error, 'Registration failed. Please try again.'),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setLoading(true);

      const decoded = JSON.parse(atob(credentialResponse.credential.split('.')[1]));

      const response = await API.post('/auth/google', {
        email: decoded.email,
        googleId: decoded.sub,
        name: decoded.name,
        verificationToken: verificationToken,
      });

      if (response.success) {
        localStorage.setItem('token', response.token);
        
        if (response.user.onboardingCompleted) {
          navigate('/dashboard');
        } else {
          navigate('/onboarding');
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
    <div className={styles.formContainer}>
      <div className={styles.stepIndicator}>
        <span className={styles.completedStep}>
          <span className={styles.stepBadge} aria-hidden="true"></span>
          Step 1: Verify Identity
        </span>
        <span className={styles.activeStep}>
          <span className={styles.stepBadge} aria-hidden="true"></span>
          Step 2: Create Account
        </span>
      </div>

      <div className={styles.verifiedBadge}>
        <div className={styles.badgeIcon}>
          <span className={styles.checkIcon} aria-hidden="true"></span>
        </div>
        <div className={styles.badgeContent}>
          <h3>Identity Verified</h3>
          <p><strong>{userData.full_name}</strong></p>
          <p>Roll Number: {userData.roll_number}</p>
          <p>{userData.degree} in {userData.branch} • Class of {userData.graduation_year}</p>
        </div>
      </div>

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
          <label htmlFor="email">Email Address *</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="your.email@example.com"
            className={errors.email ? styles.error : ''}
          />
          {errors.email && (
            <span className={styles.errorText}>{errors.email}</span>
          )}
          <span className={styles.helperText}>
            You can use any email address (Gmail, Outlook, etc.)
          </span>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="password">Password *</label>
          <div className={styles.passwordWrapper}>
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter password (min 6 characters)"
              className={errors.password ? styles.error : ''}
            />
            <button
              type="button"
              className={styles.togglePassword}
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          {errors.password && (
            <span className={styles.errorText}>{errors.password}</span>
          )}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="confirmPassword">Confirm Password *</label>
          <div className={styles.passwordWrapper}>
            <input
              type={showConfirmPassword ? "text" : "password"}
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Re-enter password"
              className={errors.confirmPassword ? styles.error : ''}
            />
            <button
              type="button"
              className={styles.togglePassword}
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <span className={styles.errorText}>{errors.confirmPassword}</span>
          )}
        </div>

        <div className={styles.buttonGroup}>
          <button 
            type="button"
            onClick={onBack}
            className={styles.secondaryBtn}
            disabled={loading}
          >
            <span className={styles.backCaret} aria-hidden="true"></span>
            Back
          </button>
          <button 
            type="submit" 
            className={styles.submitBtn}
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </div>
      </form>

      <div className={styles.divider}>
        <span>OR</span>
      </div>

      <div className={styles.oauthButtons}>
        <GoogleLogin 
          verificationToken={verificationToken}
          buttonText="Sign up with Google"
        />
      </div>
    </div>
  );
};

// Main Component
const RegisterPersonalEmail = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [verificationData, setVerificationData] = useState(null);

  const handleVerified = (data) => {
    setVerificationData(data);
    setCurrentStep(2);
  };

  const handleBack = () => {
    setCurrentStep(1);
    setVerificationData(null);
  };

  return (
    <>
      <Helmet>
        <title>Register with Personal Email | IIIT Naya Raipur</title>
      </Helmet>

      <div className={styles.container}>
        <div className={styles.wrapper}>
          <Link to="/register" className={styles.backLink}>
            <span className={styles.backCaret} aria-hidden="true"></span>
            Back to registration options
          </Link>

          <div className={styles.header}>
            <h1>Register with Personal Email</h1>
            <p>Verify your identity using institute records</p>
          </div>

          {currentStep === 1 ? (
            <VerifyIdentityStep onVerified={handleVerified} />
          ) : (
            <CreateAccountStep 
              verificationToken={verificationData.verificationToken}
              userData={verificationData.userData}
              onBack={handleBack}
            />
          )}

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
    </>
  );
};

// Import GoogleLogin at top of file
import GoogleLogin from '../../services/google_login';

export default RegisterPersonalEmail;

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
        submit: error.message || 'Verification failed. Please check your details and try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.formContainer}>
      <div className={styles.stepIndicator}>
        <span className={styles.activeStep}>Step 1: Verify Identity</span>
        <span className={styles.inactiveStep}>Step 2: Create Account</span>
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
        submit: error.message || 'Registration failed. Please try again.'
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
    <div className={styles.formContainer}>
      <div className={styles.stepIndicator}>
        <span className={styles.completedStep}>✓ Step 1: Verify Identity</span>
        <span className={styles.activeStep}>Step 2: Create Account</span>
      </div>

      <div className={styles.verifiedBadge}>
        <div className={styles.badgeIcon}>✓</div>
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

        <div className={styles.buttonGroup}>
          <button 
            type="button"
            onClick={onBack}
            className={styles.secondaryBtn}
            disabled={loading}
          >
            ← Back
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
          onSuccess={handleGoogleSuccess}
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
            ← Back to registration options
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

import React from 'react';
import axios from 'axios';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '@hooks/useAuth';
import styles from './Register.module.css';
import GoogleLogin from '../../services/google_login';
import LinkedInLogin from '../../services/linked_in';
import Recaptcha from '../../services/recaptcha';

// Validation schema
const schema = yup.object().shape({
  firstName: yup
    .string()
    .required('First name is required')
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must not exceed 50 characters'),
  lastName: yup
    .string()
    .required('Last name is required')
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must not exceed 50 characters'),
  email: yup
    .string()
    .required('Email is required')
    .email('Please enter a valid email')
    .matches(
      /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/,
      'Invalid email format'
    ),
  password: yup
    .string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),
  confirmPassword: yup
    .string()
    .required('Please confirm your password')
    .oneOf([yup.ref('password')], 'Passwords must match'),
});

const Register = () => {
  const navigate = useNavigate();
  const { register: registerUser } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: yupResolver(schema),
    mode: 'onChange',
  });

  const [captcha, setCaptcha] = React.useState(null);

  const onSubmit = async (data) => {
    if (!captcha) {
      toast.error('Please complete the reCAPTCHA.');
      return;
    }
    try {
      // Register user
      const response = await registerUser({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
      });
      
      toast.success('Registration successful! Please complete your profile.');
      
      // Redirect to profile completion
      navigate('/complete-profile');
      
    } catch (error) {
      toast.error(error.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <>
      <Helmet>
        <title>Register - IIIT Naya Raipur Alumni Portal</title>
      </Helmet>
      
      <div className={styles.registerContainer}>
        <div className={styles.registerCard}>
          <div className={styles.headerSection}>
            <img 
              src="/iiit-logo.png" 
              alt="IIIT-NR Logo" 
              className={styles.logo} 
            />
            <h1 className={styles.title}>Create Account</h1>
            <p className={styles.subtitle}>
              Join the IIIT-NR Alumni Network
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
            <div className={styles.nameFields}>
              <div className={styles.inputGroup}>
                <label htmlFor="firstName">First Name</label>
                <input
                  type="text"
                  id="firstName"
                  {...register('firstName')}
                  className={errors.firstName ? styles.errorInput : ''}
                />
                {errors.firstName && (
                  <span className={styles.errorMessage}>
                    {errors.firstName.message}
                  </span>
                )}
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="lastName">Last Name</label>
                <input
                  type="text"
                  id="lastName"
                  {...register('lastName')}
                  className={errors.lastName ? styles.errorInput : ''}
                />
                {errors.lastName && (
                  <span className={styles.errorMessage}>
                    {errors.lastName.message}
                  </span>
                )}
              </div>
            </div>
            <div className={styles.inputGroup}>
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                {...register('email')}
                className={errors.email ? styles.errorInput : ''}
              />
              {errors.email && (
                <span className={styles.errorMessage}>
                  {errors.email.message}
                </span>
              )}
            </div>
            <div className={styles.inputGroup}>
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                {...register('password')}
                className={errors.password ? styles.errorInput : ''}
              />
              {errors.password && (
                <span className={styles.errorMessage}>
                  {errors.password.message}
                </span>
              )}
            </div>
            <div className={styles.inputGroup}>
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                {...register('confirmPassword')}
                className={errors.confirmPassword ? styles.errorInput : ''}
              />
              {errors.confirmPassword && (
                <span className={styles.errorMessage}>
                  {errors.confirmPassword.message}
                </span>
              )}
            </div>
            {/* reCAPTCHA aligned and styled */}
            <Recaptcha onChange={setCaptcha} />
            <button
              type="submit"
              className={styles.submitButton}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className={styles.footerText}>
            Already have an account?{' '}
            <Link to="/login" className={styles.link}>
              Sign In
            </Link>
          </div>
          <div className={styles.socialLoginContainer}>
            <div className={styles.socialLoginTitle}>Or register with</div>
            <div className={styles.socialLoginButtons}>
              <GoogleLogin />
              <LinkedInLogin />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Register;

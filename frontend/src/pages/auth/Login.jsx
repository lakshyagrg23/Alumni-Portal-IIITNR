import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import styles from './Register.module.css';
import GoogleLogin from '../../services/google_login';
import LinkedInLogin from '../../services/linked_in';
import { useAuth } from '../../context/AuthContext';

const schema = yup.object().shape({
  email: yup.string().required('Email is required').email('Enter a valid email'),
  password: yup.string().required('Password is required'),
});


const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
    mode: 'onChange',
  });
  const navigate = useNavigate();
  const { login } = useAuth();

  const onSubmit = async (data) => {
    try {
      const response = await login(data);
      toast.success('Login successful!');
      const userRole = response?.user?.role;
      if (userRole === 'admin') {
        navigate('/admin');
      } else if (!response?.user?.hasAlumniProfile) {
        navigate('/complete-profile');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
      const errorData = error?.response?.data;
      
      // Check if user needs to verify email
      if (errorData?.requiresVerification) {
        toast.error(
          <div>
            {errorData.message}
            <br />
            <button
              onClick={() =>
                navigate('/email-sent', {
                  state: { email: errorData.email || data.email },
                })
              }
              style={{
                marginTop: '8px',
                padding: '4px 12px',
                background: '#f97316',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              Resend verification email
            </button>
          </div>,
          { duration: 6000 }
        );
      } else if (error?.response?.status === 401) {
        // Unauthorized - incorrect credentials
        toast.error('Incorrect email or password. Please try again.');
      } else if (error?.response?.status === 404) {
        // User not found
        toast.error('No account found with this email address.');
      } else {
        // Generic error
        toast.error(errorData?.message || error?.message || 'Login failed. Please check your credentials and try again.');
      }
    }
  };

  return (
    <>
      <Helmet>
        <title>Login - IIIT Naya Raipur Alumni Portal</title>
      </Helmet>
      <div className={styles.registerContainer}>
        <div className={styles.registerCard}>
          <div className={styles.headerSection}>
            <img src="/iiit-logo.png" alt="IIIT-NR Logo" className={styles.logo} />
            <h1 className={styles.title}>Sign In</h1>
            <p className={styles.subtitle}>Welcome back to IIIT-NR Alumni Portal</p>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
            <div className={styles.inputGroup}>
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                {...register('email')}
                className={errors.email ? styles.errorInput : ''}
              />
              {errors.email && (
                <span className={styles.errorMessage}>{errors.email.message}</span>
              )}
            </div>
            <div className={styles.inputGroup}>
              <label htmlFor="password">Password</label>
              <div className={styles.passwordWrapper}>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  {...register('password')}
                  className={errors.password ? styles.errorInput : ''}
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
                <span className={styles.errorMessage}>{errors.password.message}</span>
              )}
            </div>
            
            <div className={styles.forgotPasswordLink}>
              <Link to="/forgot-password" className={styles.link}>
                Forgot password?
              </Link>
            </div>
            
            <button
              type="submit"
              className={styles.submitButton}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
          <div className={styles.footerText}>
            Don't have an account?{' '}
            <Link to="/register" className={styles.link}>
              Register
            </Link>
          </div>
          <div className={styles.socialLoginContainer}>
            <div className={styles.socialLoginTitle}>Or sign in with</div>
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

export default Login;

import React from 'react';
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
      } else {
        toast.error(errorData?.message || error?.message || 'Login failed. Please try again.');
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
              <input
                type="password"
                id="password"
                {...register('password')}
                className={errors.password ? styles.errorInput : ''}
              />
              {errors.password && (
                <span className={styles.errorMessage}>{errors.password.message}</span>
              )}
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

import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';
import styles from './Register.module.css';
import { authService } from '../../services/authService';

const schema = yup.object({
  email: yup.string().required('Email is required').email('Enter a valid email'),
});

const ForgotPassword = () => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(schema),
    mode: 'onChange',
  });

  const onSubmit = async ({ email }) => {
    try {
      await authService.requestPasswordReset(email);
      toast.success('If an account exists, a reset link was sent.');
    } catch (e) {
      toast.error(e.message || 'Failed to request password reset');
    }
  };

  return (
    <>
      <Helmet>
        <title>Forgot Password - IIIT NR Alumni Portal</title>
      </Helmet>
      <div className={styles.registerContainer}>
        <div className={styles.registerCard}>
          <div className={styles.headerSection}>
            <img src="/iiit-logo.png" alt="IIIT-NR Logo" className={styles.logo} />
            <h1 className={styles.title}>Forgot Password</h1>
            <p className={styles.subtitle}>Enter your email to receive a reset link</p>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
            <div className={styles.inputGroup}>
              <label htmlFor="email">Email Address</label>
              <input type="email" id="email" {...register('email')} className={errors.email ? styles.errorInput : ''} />
              {errors.email && <span className={styles.errorMessage}>{errors.email.message}</span>}
            </div>
            <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
          <div className={styles.footerText}>
            Remembered your password? <Link to="/login" className={styles.link}>Login</Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default ForgotPassword;
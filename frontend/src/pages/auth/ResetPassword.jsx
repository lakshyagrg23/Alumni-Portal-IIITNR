import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import styles from './Register.module.css';
import { authService } from '../../services/authService';

const schema = yup.object({
  password: yup.string().required('Password is required').min(6, 'At least 6 characters'),
  confirm: yup.string().oneOf([yup.ref('password'), null], 'Passwords must match'),
});

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const ResetPassword = () => {
  const query = useQuery();
  const token = query.get('token') || '';
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(schema),
    mode: 'onChange',
  });

  const onSubmit = async ({ password }) => {
    if (!token) {
      toast.error('Missing reset token');
      return;
    }
    try {
      await authService.resetPassword(token, password);
      toast.success('Password reset successful');
      navigate('/login');
    } catch (e) {
      toast.error(e.message || 'Failed to reset password');
    }
  };

  return (
    <>
      <Helmet>
        <title>Reset Password - IIIT NR Alumni Portal</title>
      </Helmet>
      <div className={styles.registerContainer}>
        <div className={styles.registerCard}>
          <div className={styles.headerSection}>
            <img src="/iiit-logo.png" alt="IIIT-NR Logo" className={styles.logo} />
            <h1 className={styles.title}>Reset Password</h1>
            <p className={styles.subtitle}>Enter a new password to complete the reset</p>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
            <div className={styles.inputGroup}>
              <label htmlFor="password">New Password</label>
              <input type="password" id="password" {...register('password')} className={errors.password ? styles.errorInput : ''} />
              {errors.password && <span className={styles.errorMessage}>{errors.password.message}</span>}
            </div>
            <div className={styles.inputGroup}>
              <label htmlFor="confirm">Confirm Password</label>
              <input type="password" id="confirm" {...register('confirm')} className={errors.confirm ? styles.errorInput : ''} />
              {errors.confirm && <span className={styles.errorMessage}>{errors.confirm.message}</span>}
            </div>
            <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
              {isSubmitting ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
          <div className={styles.footerText}>
            Back to <Link to="/login" className={styles.link}>Login</Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default ResetPassword;
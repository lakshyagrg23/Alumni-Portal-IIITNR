import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import styles from './RegisterNew.module.css';

const RegisterMethodSelection = () => {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>Register | IIIT Naya Raipur Alumni</title>
      </Helmet>

      <div className={styles.container}>
        <div className={styles.wrapper}>
          <div className={styles.header}>
            <h1>Join IIIT Naya Raipur Alumni Network</h1>
            <p>Choose your preferred registration method</p>
          </div>

          <div className={styles.methodGrid}>
            {/* Institute Email Registration */}
            <div className={styles.methodCard}>
              <div className={`${styles.methodIcon} ${styles.primaryIcon}`} aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3>Institute Email</h3>
              <p className={styles.methodDesc}>
                Use your @iiitnr.edu.in or @iiitnr.ac.in email address
              </p>
              <ul className={styles.methodFeatures}>
                <li>
                  <span className={styles.featureCheck} aria-hidden="true"></span>
                  <span>Direct registration</span>
                </li>
                <li>
                  <span className={styles.featureCheck} aria-hidden="true"></span>
                  <span>Email verification required</span>
                </li>
                <li>
                  <span className={styles.featureCheck} aria-hidden="true"></span>
                  <span>Fastest process</span>
                </li>
              </ul>
              <button
                className={styles.selectBtn}
                onClick={() => navigate('/register/institute-email')}
              >
                Continue with Institute Email
              </button>
            </div>

            {/* Personal Email Registration */}
            <div className={styles.methodCard}>
              <div className={`${styles.methodIcon} ${styles.secondaryIcon}`} aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3>Personal Email</h3>
              <p className={styles.methodDesc}>
                Verify with roll number and use any email address
              </p>
              <ul className={styles.methodFeatures}>
                <li>
                  <span className={styles.featureCheck} aria-hidden="true"></span>
                  <span>Use any email (Gmail, Outlook, etc.)</span>
                </li>
                <li>
                  <span className={styles.featureCheck} aria-hidden="true"></span>
                  <span>Identity verification required</span>
                </li>
                <li>
                  <span className={styles.featureCheck} aria-hidden="true"></span>
                  <span>Secure process</span>
                </li>
              </ul>
              <button
                className={`${styles.selectBtn} ${styles.secondary}`}
                onClick={() => navigate('/register/personal-email')}
              >
                Continue with Personal Email
              </button>
            </div>
          </div>

          <div className={styles.footer}>
            <p>
              Already have an account?{' '}
              <a href="/login" className={styles.link}>
                Login here
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default RegisterMethodSelection;

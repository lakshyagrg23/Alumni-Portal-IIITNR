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
                <span className={styles.iconInitial}>IE</span>
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
                <span className={styles.iconInitial}>PE</span>
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

import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '@hooks/useAuth';
import axios from 'axios';
import styles from './Register.module.css';

const LinkedInCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithLinkedIn } = useAuth();
  const [processing, setProcessing] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleLinkedInCallback = async () => {
      try {
        // Extract authorization code from URL
        const params = new URLSearchParams(location.search);
        const code = params.get('code');
        const state = params.get('state');
        const errorParam = params.get('error');
        const errorDescription = params.get('error_description');

        // Handle errors from LinkedIn
        if (errorParam) {
          console.error('LinkedIn OAuth error:', errorParam, errorDescription);
          setError(errorDescription || 'LinkedIn authorization was cancelled or failed');
          toast.error('LinkedIn authorization failed');
          setTimeout(() => navigate('/login'), 2000);
          return;
        }

        // Verify state parameter for security (CSRF protection)
        const storedState = sessionStorage.getItem('linkedin_oauth_state');
        if (state && storedState && state !== storedState) {
          console.error('State mismatch - possible CSRF attack');
          setError('Security verification failed. Please try again.');
          toast.error('Security verification failed');
          setTimeout(() => navigate('/login'), 2000);
          return;
        }
        
        // Retrieve verification token if exists (for personal email registration path)
        const verificationToken = sessionStorage.getItem('linkedin_verification_token');
        
        // Clear stored state and verification token
        sessionStorage.removeItem('linkedin_oauth_state');
        sessionStorage.removeItem('linkedin_verification_token');

        // Validate authorization code
        if (!code) {
          setError('No authorization code received from LinkedIn');
          toast.error('LinkedIn authorization incomplete');
          setTimeout(() => navigate('/login'), 2000);
          return;
        }

        console.log('LinkedIn authorization code received, exchanging for access token...');

        // Get the exact same redirect URI that was used for authorization
        const redirectUri = sessionStorage.getItem('linkedin_redirect_uri') || 
                           import.meta.env.VITE_LINKEDIN_REDIRECT_URI || 
                           'http://localhost:3000/linkedin';
        
        // Check if this code has already been processed (prevent reuse)
        const processedCode = sessionStorage.getItem('linkedin_processed_code');
        if (processedCode === code) {
          console.warn('Authorization code already processed, redirecting...');
        //   toast('Login already in progress...', { icon: 'ℹ️' });
          setTimeout(() => navigate('/dashboard'), 1000);
          return;
        }
        
        // Mark this code as being processed
        sessionStorage.setItem('linkedin_processed_code', code);

        // Send authorization code to backend for secure token exchange
        // Backend handles LinkedIn API calls to avoid CORS issues
        const backendResponse = await axios.post(
          `${import.meta.env.VITE_API_URL}/auth/linkedin/callback`,
          {
            code: code,
            redirectUri: redirectUri, // Use the EXACT same URI from authorization
          }
        );

        if (!backendResponse.data.success) {
          throw new Error(backendResponse.data.message || 'Failed to get user data from LinkedIn');
        }

        const linkedinData = backendResponse.data.data;
        console.log('LinkedIn user data received:', linkedinData);

        // Add verification token to LinkedIn data if available
        if (verificationToken) {
          linkedinData.verificationToken = verificationToken;
        }

        // Login with backend
        const response = await loginWithLinkedIn(linkedinData);
        
        toast.success('LinkedIn login successful!');
        
        // Clean up stored values
        sessionStorage.removeItem('linkedin_redirect_uri');
        sessionStorage.removeItem('linkedin_processed_code');
        
        // Admin users go to admin panel
        const userRole = response.user?.role;
        if (userRole === 'admin' || userRole === 'superadmin') {
          navigate('/admin');
          return;
        }
        
        // Alumni users: check if they need to complete profile
        if (response.isNewUser || !response.user.hasAlumniProfile) {
          navigate('/onboarding');
        } else {
          navigate('/dashboard');
        }
      } catch (err) {
        console.error('LinkedIn callback error:', err);
        const errorMessage = err.response?.data?.message || err.message || 'Failed to complete LinkedIn login';
        setError(errorMessage);
        toast.error(errorMessage);
        setTimeout(() => navigate('/login'), 3000);
      } finally {
        setProcessing(false);
      }
    };

    handleLinkedInCallback();
  }, [location, navigate, loginWithLinkedIn]);

  return (
    <div className={styles.registerContainer}>
      <div className={styles.registerCard} style={{ textAlign: 'center', padding: '3rem' }}>
        <img 
          src="/iiit-logo.png" 
          alt="IIIT-NR Logo" 
          className={styles.logo}
          style={{ marginBottom: '2rem' }}
        />
        
        {processing && !error && (
          <>
            <div style={{ 
              margin: '0 auto 1.5rem',
              width: '50px',
              height: '50px',
              border: '4px solid #f3f4f6',
              borderTop: '4px solid #1e3a8a',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <h2 style={{ color: '#1e3a8a', marginBottom: '0.5rem' }}>
              Processing LinkedIn Login...
            </h2>
            <p style={{ color: '#6b7280' }}>
              Please wait while we complete your authentication
            </p>
          </>
        )}

        {error && (
          <>
            <div style={{ 
              fontSize: '3rem',
              marginBottom: '1rem'
            }}>
              ⚠️
            </div>
            <h2 style={{ color: '#dc2626', marginBottom: '0.5rem' }}>
              Authentication Failed
            </h2>
            <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
              {error}
            </p>
            <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
              Redirecting to login page...
            </p>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LinkedInCallback;

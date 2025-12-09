import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function LinkedInLoginButton({ verificationToken = null }) {
  const navigate = useNavigate();

  const handleLinkedInLogin = () => {
    // Build LinkedIn OAuth URL manually for redirect flow (no popup)
    const clientId = import.meta.env.VITE_LINKEDIN_CLIENT_ID;
    
    // Use redirect URI from env or fallback to localhost
    const redirectUri = import.meta.env.VITE_LINKEDIN_REDIRECT_URI || 'http://localhost:3000/linkedin';
    const encodedRedirectUri = encodeURIComponent(redirectUri);
    
    const scope = encodeURIComponent('openid profile email');
    const state = Math.random().toString(36).substring(7); // Random state for security
    
    // Store both state and redirect URI for callback to use
    sessionStorage.setItem('linkedin_oauth_state', state);
    sessionStorage.setItem('linkedin_redirect_uri', redirectUri);
    
    // Store verification token if provided (for personal email registration path)
    if (verificationToken) {
      sessionStorage.setItem('linkedin_verification_token', verificationToken);
    }
    
    // Redirect to LinkedIn authorization (same window)
    const linkedInAuthUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodedRedirectUri}&scope=${scope}&state=${state}`;
    
    window.location.href = linkedInAuthUrl;
  };

  return (
    <button
      className="linkedin-login-btn"
      onClick={handleLinkedInLogin}
      type="button"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        background: '#0a66c2',
        color: '#fff',
        border: 'none',
        padding: '0.5rem 1.2rem',
        borderRadius: '6px',
        fontWeight: 500,
        fontSize: '1rem',
        cursor: 'pointer',
        minWidth: '140px',
        height: '40px',
        boxShadow: '0 2px 8px rgba(30, 58, 138, 0.08)',
        transition: 'all 0.2s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#084d8c';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = '#0a66c2';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="6" fill="#fff"/>
        <path d="M12.5 13.5H9.5V22.5H12.5V13.5ZM11 12.25C11.8284 12.25 12.5 11.5784 12.5 10.75C12.5 9.92157 11.8284 9.25 11 9.25C10.1716 9.25 9.5 9.92157 9.5 10.75C9.5 11.5784 10.1716 12.25 11 12.25ZM22.5 17.25C22.5 15.1789 21.0711 13.5 18.75 13.5C17.5 13.5 16.75 14.25 16.5 14.75V13.5H13.5V22.5H16.5V17.75C16.5 16.75 17.25 16.25 18 16.25C18.75 16.25 19.5 16.75 19.5 17.75V22.5H22.5V17.25Z" fill="#0a66c2"/>
      </svg>
      <span>Login with LinkedIn</span>
    </button>
  );
}
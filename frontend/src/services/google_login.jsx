
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import React from 'react';

export default function GoogleLoginButton({ verificationToken = null, registrationPath = null, isLoginAttempt = false, onSuccess, buttonText = "Continue with Google" }) {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSuccess = async (credentialResponse) => {
    try {
      const decoded = jwtDecode(credentialResponse.credential);
      
      // Build payload with verification token if provided
      const payload = {
        email: decoded.email,
        googleId: decoded.sub,
        name: decoded.name,
        isLoginAttempt, // Pass whether this is a login attempt or registration
      };

      // Add verification token if provided (for personal email registration path)
      if (verificationToken) {
        payload.verificationToken = verificationToken;
      }

      // Add registration path if provided (for institute email registration)
      if (registrationPath) {
        payload.registrationPath = registrationPath;
      }

      const response = await loginWithGoogle(payload);
      toast.success('Google login successful!');
      
      // If custom onSuccess handler provided, use it
      if (onSuccess) {
        onSuccess(response);
        return;
      }

      // Default navigation logic
      const userRole = response.user?.role;
      
      // Admin users go to admin panel
      if (userRole === 'admin' || userRole === 'superadmin') {
        navigate('/admin');
        return;
      }
      
      // Alumni users: check if they need onboarding
      const hasProfile = response.user?.hasAlumniProfile;
      const onboardingDone = response.user?.onboardingCompleted;
      if (response.isNewUser || !hasProfile || !onboardingDone) {
        navigate('/complete-profile');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Google login error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Google login failed.';
      toast.error(errorMessage);
    }
  };

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => {
          toast.error('Google authorization failed. Please try again.');
        }}
        text={buttonText}
      />
    </GoogleOAuthProvider>
  );
}


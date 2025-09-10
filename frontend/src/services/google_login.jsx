
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import React from 'react';

export default function GoogleLoginButton() {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  return (
    <GoogleOAuthProvider clientId="531367954621-ep7nrnul0laar0qlsmicau1kg216nc7m.apps.googleusercontent.com">
      <GoogleLogin
        onSuccess={async (credentialResponse) => {
          try {
            const decoded = jwtDecode(credentialResponse.credential);
            // Send only required fields to backend
            const payload = {
              email: decoded.email,
              googleId: decoded.sub,
              name: decoded.name,
            };
            const response = await loginWithGoogle(payload);
            toast.success('Google login successful!');
            
            // Check if user has completed their profile
            if (response.isNewUser || !response.user.hasAlumniProfile) {
              navigate('/complete-profile');
            } else {
              navigate('/dashboard');
            }
          } catch (err) {
            toast.error('Google login failed.');
          }
        }}
        onError={() => {
          toast.error('Google authorization failed. Please try again.');
        }}
      />
    </GoogleOAuthProvider>
  );
}


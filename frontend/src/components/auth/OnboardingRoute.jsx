import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@hooks/useAuth'

/**
 * OnboardingRoute - Ensures user has completed onboarding before accessing protected routes
 * Redirects to /complete-profile if onboarding is not completed
 */
const OnboardingRoute = ({ children }) => {
  const { isAuthenticated, onboardingCompleted, loading, user } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '50vh' 
      }}>
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }

  // Must be authenticated first
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Admin users bypass onboarding requirement
  if (user?.role === 'admin') {
    return children
  }

  // Check if onboarding is completed
  if (!onboardingCompleted) {
    // Allow access to the profile completion page itself
    if (location.pathname === '/complete-profile') {
      return children
    }
    
    // Redirect to onboarding for all other routes
    return <Navigate to="/complete-profile" state={{ from: location }} replace />
  }

  // Onboarding completed, allow access
  return children
}

export default OnboardingRoute

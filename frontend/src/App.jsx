import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'

// Layout Components
import Header from '@components/layout/Header'
import Footer from '@components/layout/Footer'

// Page Components
import Home from '@pages/Home'
import About from '@pages/About'
import Login from '@pages/auth/Login'
import Register from '@pages/auth/Register'
import RegisterMethodSelection from '@pages/auth/RegisterMethodSelection'
import RegisterInstituteEmail from '@pages/auth/RegisterInstituteEmail'
import RegisterPersonalEmail from '@pages/auth/RegisterPersonalEmail'
import ProfileCompletion from '@pages/auth/ProfileCompletion'
import LinkedInCallback from '@pages/auth/LinkedInCallback'
import VerifyEmail from '@pages/auth/VerifyEmail'
import EmailSent from '@pages/auth/EmailSent'
import ForgotPassword from '@pages/auth/ForgotPassword'
import ResetPassword from '@pages/auth/ResetPassword'
import Dashboard from '@pages/Dashboard'
import AlumniDirectory from '@pages/AlumniDirectory'
import AlumniProfileNew from '@pages/AlumniProfileNew'
import News from '@pages/News'
import NewsDetail from '@pages/NewsDetail'
import Events from '@pages/Events'
import Connect from '@pages/Connect'
import Messages from '@pages/Messages'
import Profile from '@pages/ProfileNew'
import AdminPanel from '@pages/admin/AdminPanel'
import NotFound from '@pages/NotFound'

// Protected Route Component
import ProtectedRoute from '@components/auth/ProtectedRoute'
import AdminRoute from '@components/auth/AdminRoute'
import OnboardingRoute from '@components/auth/OnboardingRoute'

// Hooks
import { useAuth } from '@hooks/useAuth'

// Styles
import styles from './App.module.css'
import { MessagingProvider } from './context/MessagingContext'

function App() {
  const { user, initializing } = useAuth()

  // Decide where to send already-authenticated users who hit auth routes
  const authRedirectPath = user?.role === 'admin'
    ? '/admin'
    : (user?.onboardingCompleted ? '/dashboard' : '/complete-profile')

  if (initializing) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading IIIT NR Alumni Portal...</p>
      </div>
    )
  }

  return (
    <MessagingProvider>
    <div className={styles.app}>
      <Helmet>
        <title>IIIT Naya Raipur Alumni Portal</title>
        <meta 
          name="description" 
          content="Connect with fellow alumni, discover opportunities, and engage with the IIIT NR community" 
        />
      </Helmet>

      <Header />
      
      <main className={styles.main}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/news" element={<News />} />
          <Route path="/news/:id" element={<NewsDetail />} />
          <Route path="/events" element={<Events />} />
          
          {/* Alumni Directory - Temporarily Public for Development */}
          <Route path="/directory" element={<AlumniDirectory />} />
          
          {/* Alumni Profile - Temporarily Public for Development */}
          <Route path="/alumni/:id" element={<AlumniProfileNew />} />
          
          {/* Auth Routes */}
          <Route 
            path="/login" 
            element={
              user ? <Navigate to={authRedirectPath} replace /> : <Login />
            } 
          />
          <Route 
            path="/register" 
            element={
              user ? <Navigate to={authRedirectPath} replace /> : <RegisterMethodSelection />
            } 
          />
          <Route 
            path="/register/institute-email" 
            element={
              user ? <Navigate to={authRedirectPath} replace /> : <RegisterInstituteEmail />
            } 
          />
          <Route 
            path="/register/personal-email" 
            element={
              user ? <Navigate to={authRedirectPath} replace /> : <RegisterPersonalEmail />
            } 
          />
          <Route 
            path="/register-old" 
            element={
              user ? <Navigate to={authRedirectPath} replace /> : <Register />
            } 
          />
          
          {/* Email Verification Routes */}
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/email-sent" element={<EmailSent />} />
          
          {/* Password Reset Routes */}
          <Route 
            path="/forgot-password" 
            element={
              user ? <Navigate to={authRedirectPath} replace /> : <ForgotPassword />
            } 
          />
          <Route 
            path="/reset-password" 
            element={
              user ? <Navigate to={authRedirectPath} replace /> : <ResetPassword />
            } 
          />
          
          {/* LinkedIn OAuth Callback */}
          <Route path="/linkedin" element={<LinkedInCallback />} />
          
          {/* Profile Completion - Protected but allows incomplete profiles */}
          <Route 
            path="/complete-profile" 
            element={
              <ProtectedRoute>
                <ProfileCompletion />
              </ProtectedRoute>
            } 
          />
          
          {/* Protected Routes - Require Authentication and Completed Onboarding */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <OnboardingRoute>
                  <Dashboard />
                </OnboardingRoute>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/connect" 
            element={
              <ProtectedRoute>
                <OnboardingRoute>
                  <Connect />
                </OnboardingRoute>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/messages" 
            element={
              <ProtectedRoute>
                <OnboardingRoute>
                  <Messages />
                </OnboardingRoute>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <OnboardingRoute>
                  <Profile />
                </OnboardingRoute>
              </ProtectedRoute>
            } 
          />
          
          {/* Admin Routes - Require Admin Role */}
          <Route 
            path="/admin/*" 
            element={
              <AdminRoute>
                <AdminPanel />
              </AdminRoute>
            } 
          />
          
          {/* 404 Not Found */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      
      <Footer />
    </div>
    </MessagingProvider>
  )
}

export default App

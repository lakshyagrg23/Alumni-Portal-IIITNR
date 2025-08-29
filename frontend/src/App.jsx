import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'

// Layout Components
import Header from '@components/layout/Header'
import Footer from '@components/layout/Footer'

// Page Components
import Home from '@pages/Home'
import About from '@pages/About'
import Login from '@pages/auth/Login'
import Register from '@pages/auth/Register'
import Dashboard from '@pages/Dashboard'
import AlumniDirectory from '@pages/AlumniDirectory'
import AlumniProfile from '@pages/AlumniProfile'
import News from '@pages/News'
import Events from '@pages/Events'
import Connect from '@pages/Connect'
import Messages from '@pages/Messages'
import Profile from '@pages/Profile'
import AdminPanel from '@pages/admin/AdminPanel'
import NotFound from '@pages/NotFound'

// Protected Route Component
import ProtectedRoute from '@components/auth/ProtectedRoute'
import AdminRoute from '@components/auth/AdminRoute'

// Hooks
import { useAuth } from '@hooks/useAuth'

// Styles
import styles from './App.module.css'

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading IIIT NR Alumni Portal...</p>
      </div>
    )
  }

  return (
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
          <Route path="/events" element={<Events />} />
          
          {/* Auth Routes */}
          <Route 
            path="/login" 
            element={
              user ? <Dashboard /> : <Login />
            } 
          />
          <Route 
            path="/register" 
            element={
              user ? <Dashboard /> : <Register />
            } 
          />
          
          {/* Protected Routes - Require Authentication */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/directory" 
            element={
              <ProtectedRoute>
                <AlumniDirectory />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/alumni/:id" 
            element={
              <ProtectedRoute>
                <AlumniProfile />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/connect" 
            element={
              <ProtectedRoute>
                <Connect />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/messages" 
            element={
              <ProtectedRoute>
                <Messages />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Profile />
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
  )
}

export default App

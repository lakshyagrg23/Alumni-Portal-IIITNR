import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@hooks/useAuth'

const AdminRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth()

  // Debug logging
  console.log('AdminRoute Debug:', {
    user,
    isAuthenticated,
    loading,
    userRole: user?.role,
    userType: typeof user,
  })

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '50vh' 
      }}>
        <div className="spinner"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    console.log('AdminRoute: Not authenticated, redirecting to /login')
    return <Navigate to="/login" replace />
  }

  if (user?.role !== 'admin' && user?.role !== 'superadmin') {
    console.log('AdminRoute: User role is not admin, role:', user?.role, 'redirecting to /dashboard')
    return <Navigate to="/dashboard" replace />
  }

  console.log('AdminRoute: Admin access granted')
  return children
}

export default AdminRoute

import React, { createContext, useContext, useReducer, useEffect } from 'react'
import { authService } from '../services/authService'

// Initial state
const initialState = {
  user: null,
  initializing: true, // For initial app load only
  authLoading: false, // For login/logout operations
  isAuthenticated: false,
  onboardingCompleted: false,
  token: localStorage.getItem('token'),
}

// Auth actions
const authActions = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  LOAD_USER: 'LOAD_USER',
  UPDATE_PROFILE: 'UPDATE_PROFILE',
  CLEAR_LOADING: 'CLEAR_LOADING',
  COMPLETE_ONBOARDING: 'COMPLETE_ONBOARDING',
}

// Auth reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case authActions.LOGIN_START:
      return {
        ...state,
        authLoading: true,
      }
    case authActions.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        // Only set onboarding for non-admin users
        onboardingCompleted: (action.payload.user?.role === 'admin' || action.payload.user?.role === 'superadmin') 
          ? true 
          : (action.payload.user?.onboardingCompleted || false),
        initializing: false,
        authLoading: false,
      }
    case authActions.LOGIN_FAILURE:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        initializing: false,
        authLoading: false,
      }
    case authActions.LOGOUT:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        onboardingCompleted: false,
        initializing: false,
        authLoading: false,
      }
    case authActions.LOAD_USER:
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        // Only set onboarding for non-admin users
        onboardingCompleted: (action.payload?.role === 'admin' || action.payload?.role === 'superadmin')
          ? true
          : (action.payload?.onboardingCompleted || false),
        initializing: false,
      }
    case authActions.UPDATE_PROFILE:
      return {
        ...state,
        user: { ...state.user, ...action.payload },
      }
    case authActions.COMPLETE_ONBOARDING:
      return {
        ...state,
        onboardingCompleted: true,
        user: { ...state.user, onboardingCompleted: true },
      }
    case authActions.CLEAR_LOADING:
      return {
        ...state,
        initializing: false,
      }
    default:
      return state
  }
}

// Create context
const AuthContext = createContext()

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState)

  // Fetch full user profile (including alumni profile) and merge with basic auth data
  const hydrateUserWithProfile = async (baseUser = null) => {
    let userData = baseUser

    // Always start from /auth/me if we don't already have user data
    if (!userData) {
      const response = await authService.getCurrentUser()
      userData = response?.data || response
    }

    if (!userData) {
      return null
    }

    // Admins/superadmins don't have alumni profiles
    const isAdmin = userData.role === 'admin' || userData.role === 'superadmin'
    if (isAdmin) {
      return userData
    }

    // Try to enrich with full alumni profile details
    try {
      const profileResponse = await authService.getProfile()
      if (profileResponse?.success && profileResponse?.data) {
        const profileData = profileResponse.data
        const alumniProfile = profileData.alumniProfile || profileData.alumni_profile || null

        // Merge basic flags from /auth/me with richer profile data
        return {
          ...userData,
          ...profileData,
          alumniProfile,
          hasAlumniProfile: userData.hasAlumniProfile ?? Boolean(alumniProfile),
          onboardingCompleted: profileData.onboardingCompleted ?? userData.onboardingCompleted,
        }
      }
    } catch (err) {
      // If profile fetch fails (e.g., 403 for admins), continue with basic user data
      console.warn('Profile fetch failed, using basic user data', err?.message || err)
    }

    return userData
  }

  // Load user on app start
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('token')
      
      if (token) {
        try {
          // Set token in auth service
          authService.setToken(token)
          
          // Get user info and enrich with alumni profile (if available)
          const response = await hydrateUserWithProfile()

          if (response) {
            dispatch({
              type: authActions.LOAD_USER,
              payload: response, // Already normalized
            })
          } else {
            localStorage.removeItem('token')
            dispatch({ type: authActions.LOGIN_FAILURE })
          }
        } catch (error) {
          console.error('Error loading user:', error)
          // Remove invalid token
          localStorage.removeItem('token')
          dispatch({ type: authActions.LOGIN_FAILURE })
        }
      } else {
        dispatch({ type: authActions.CLEAR_LOADING })
      }
    }

    loadUser()
  }, [])

  // Login function
  const login = async (credentials) => {
    try {
      dispatch({ type: authActions.LOGIN_START })
      
      const response = await authService.login(credentials)
      
      // Store token
      localStorage.setItem('token', response.token)
      authService.setToken(response.token)
      
      dispatch({
        type: authActions.LOGIN_SUCCESS,
        payload: response,
      })

      // Eagerly load full user data (including alumni profile for dashboard)
      try {
        const userData = await hydrateUserWithProfile(response.user)
        if (userData) {
          dispatch({ type: authActions.LOAD_USER, payload: userData })
        }
      } catch (e) {
        // non-fatal; components can still use basic user info
        console.warn('Post-login user data fetch failed', e?.message || e)
      }
      
      return response
    } catch (error) {
      dispatch({ type: authActions.LOGIN_FAILURE })
      throw error
    }
  }

  // Register function
  const register = async (userData) => {
    try {
      dispatch({ type: authActions.LOGIN_START })
      
      const response = await authService.register(userData)
      
      // If registration includes token (auto-approved)
      if (response.token) {
        localStorage.setItem('token', response.token)
        authService.setToken(response.token)
        
        // Generate encryption keys for messaging immediately after registration
        try {
          const crypto = await import('../utils/crypto.js')
          const keyPair = await crypto.generateKeyPair()
          const publicKey = await crypto.exportPublicKey(keyPair.publicKey)
          const privateKey = await crypto.exportPrivateKey(keyPair.privateKey)
          
          // Store keys in localStorage
          localStorage.setItem('e2e_pub_raw', publicKey)
          localStorage.setItem('e2e_priv_jwk', privateKey)
          
          // Upload public key to server
          const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
          await fetch(`${API}/messages/public-key`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${response.token}`
            },
            body: JSON.stringify({ publicKey })
          })
          
          console.log('✅ Encryption keys generated and uploaded during registration')
        } catch (cryptoError) {
          console.error('⚠️ Failed to generate encryption keys during registration:', cryptoError)
          // Don't fail registration if key generation fails
        }
        
        dispatch({
          type: authActions.LOGIN_SUCCESS,
          payload: response,
        })
      } else {
        dispatch({ type: authActions.CLEAR_LOADING })
      }
      
      return response
    } catch (error) {
      dispatch({ type: authActions.LOGIN_FAILURE })
      throw error
    }
  }

  // Logout function
  const logout = () => {
    localStorage.removeItem('token')
    authService.removeToken()
    dispatch({ type: authActions.LOGOUT })
  }

  // Update profile function
  const updateProfile = async (profileData) => {
    try {
      const updatedUser = await authService.updateProfile(profileData)
      const updatedUserData = updatedUser?.data || updatedUser

      // Keep the auth state in sync with the backend response (includes alumniProfile)
      dispatch({
        type: authActions.UPDATE_PROFILE,
        payload: updatedUserData,
      })
      
      return updatedUserData
    } catch (error) {
      throw error
    }
  }

  // Google OAuth login
  const loginWithGoogle = async (googleData) => {
    try {
      dispatch({ type: authActions.LOGIN_START })
      
      const response = await authService.googleLogin(googleData)
      
      localStorage.setItem('token', response.token)
      authService.setToken(response.token)
      
      dispatch({
        type: authActions.LOGIN_SUCCESS,
        payload: response,
      })

      // Load full profile details post-login
      try {
        const userData = await hydrateUserWithProfile(response.user)
        if (userData) dispatch({ type: authActions.LOAD_USER, payload: userData })
      } catch (e) {
        console.warn('Post-Google-login profile fetch failed', e?.message || e)
      }
      
      return response
    } catch (error) {
      dispatch({ type: authActions.LOGIN_FAILURE })
      throw error
    }
  }

  // LinkedIn OAuth login
  const loginWithLinkedIn = async (linkedinData) => {
    try {
      dispatch({ type: authActions.LOGIN_START })
      
      const response = await authService.linkedinLogin(linkedinData)
      
      localStorage.setItem('token', response.token)
      authService.setToken(response.token)
      
      dispatch({
        type: authActions.LOGIN_SUCCESS,
        payload: response,
      })

      // Load profile details post-login
      try {
        const userData = await hydrateUserWithProfile(response.user)
        if (userData) dispatch({ type: authActions.LOAD_USER, payload: userData })
      } catch (e) {
        console.warn('Post-LinkedIn-login profile fetch failed', e?.message || e)
      }
      
      return response
    } catch (error) {
      dispatch({ type: authActions.LOGIN_FAILURE })
      throw error
    }
  }

  // Complete onboarding function
  const completeOnboarding = async () => {
    try {
      // Prevent admins from completing onboarding
      if (state.user?.role === 'admin' || state.user?.role === 'superadmin') {
        console.warn('Admin users do not require onboarding')
        return { success: true }
      }

      const response = await authService.completeOnboarding()
      
      if (response.success) {
        dispatch({ type: authActions.COMPLETE_ONBOARDING })
      }
      
      return response
    } catch (error) {
      console.error('Complete onboarding error:', error)
      throw error
    }
  }

  const value = {
    ...state,
    login,
    register,
    logout,
    updateProfile,
    loginWithGoogle,
    loginWithLinkedIn,
    completeOnboarding,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext

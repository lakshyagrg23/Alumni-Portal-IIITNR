import React, { createContext, useContext, useReducer, useEffect } from 'react'
import { authService } from '../services/authService'

// Initial state
const initialState = {
  user: null,
  loading: true,
  isAuthenticated: false,
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
}

// Auth reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case authActions.LOGIN_START:
      return {
        ...state,
        loading: true,
      }
    case authActions.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false,
      }
    case authActions.LOGIN_FAILURE:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
      }
    case authActions.LOGOUT:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
      }
    case authActions.LOAD_USER:
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        loading: false,
      }
    case authActions.UPDATE_PROFILE:
      return {
        ...state,
        user: { ...state.user, ...action.payload },
      }
    case authActions.CLEAR_LOADING:
      return {
        ...state,
        loading: false,
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

  // Load user on app start
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('token')
      
      if (token) {
        try {
          // Set token in auth service
          authService.setToken(token)
          
          // Get user profile - the service returns response.data
          const response = await authService.getProfile()
          
          dispatch({
            type: authActions.LOAD_USER,
            payload: response, // response already contains the user data
          })
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
      
      dispatch({
        type: authActions.UPDATE_PROFILE,
        payload: updatedUser,
      })
      
      return updatedUser
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
      
      return response
    } catch (error) {
      dispatch({ type: authActions.LOGIN_FAILURE })
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

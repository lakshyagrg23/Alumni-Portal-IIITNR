import React, { createContext, useContext, useReducer } from 'react'

// Initial theme state
const initialState = {
  theme: 'light', // 'light' | 'dark'
  primaryColor: '#1e3a8a',
  secondaryColor: '#f97316',
  accentColor: '#10b981',
}

// Theme actions
const themeActions = {
  TOGGLE_THEME: 'TOGGLE_THEME',
  SET_THEME: 'SET_THEME',
  SET_PRIMARY_COLOR: 'SET_PRIMARY_COLOR',
  SET_SECONDARY_COLOR: 'SET_SECONDARY_COLOR',
  SET_ACCENT_COLOR: 'SET_ACCENT_COLOR',
  RESET_THEME: 'RESET_THEME',
}

// Theme reducer
const themeReducer = (state, action) => {
  switch (action.type) {
    case themeActions.TOGGLE_THEME:
      return {
        ...state,
        theme: state.theme === 'light' ? 'dark' : 'light',
      }
    case themeActions.SET_THEME:
      return {
        ...state,
        theme: action.payload,
      }
    case themeActions.SET_PRIMARY_COLOR:
      return {
        ...state,
        primaryColor: action.payload,
      }
    case themeActions.SET_SECONDARY_COLOR:
      return {
        ...state,
        secondaryColor: action.payload,
      }
    case themeActions.SET_ACCENT_COLOR:
      return {
        ...state,
        accentColor: action.payload,
      }
    case themeActions.RESET_THEME:
      return initialState
    default:
      return state
  }
}

// Create context
const ThemeContext = createContext()

// Theme provider component
export const ThemeProvider = ({ children }) => {
  const [state, dispatch] = useReducer(themeReducer, initialState)

  // Apply theme to document root
  React.useEffect(() => {
    const root = document.documentElement
    
    // Apply theme class
    root.className = state.theme
    
    // Apply custom colors
    root.style.setProperty('--color-primary', state.primaryColor)
    root.style.setProperty('--color-secondary', state.secondaryColor)
    root.style.setProperty('--color-accent', state.accentColor)
  }, [state])

  // Theme functions
  const toggleTheme = () => {
    dispatch({ type: themeActions.TOGGLE_THEME })
  }

  const setTheme = (theme) => {
    dispatch({ type: themeActions.SET_THEME, payload: theme })
  }

  const setPrimaryColor = (color) => {
    dispatch({ type: themeActions.SET_PRIMARY_COLOR, payload: color })
  }

  const setSecondaryColor = (color) => {
    dispatch({ type: themeActions.SET_SECONDARY_COLOR, payload: color })
  }

  const setAccentColor = (color) => {
    dispatch({ type: themeActions.SET_ACCENT_COLOR, payload: color })
  }

  const resetTheme = () => {
    dispatch({ type: themeActions.RESET_THEME })
  }

  const value = {
    ...state,
    toggleTheme,
    setTheme,
    setPrimaryColor,
    setSecondaryColor,
    setAccentColor,
    resetTheme,
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

// Custom hook to use theme context
export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export default ThemeContext

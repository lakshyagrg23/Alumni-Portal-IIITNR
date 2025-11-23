import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@hooks/useAuth'
import { getAvatarUrl, handleAvatarError } from '@utils/avatarUtils'
import { initSocket, getSocket } from '@utils/socketClient'
import axios from 'axios'
import { useMessaging } from '../../context/MessagingContext'
import styles from './Header.module.css'

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false)
  const { user, logout, isAuthenticated, token } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { totalUnread } = useMessaging()
  // Toast queue for multiple incoming messages while user away from /messages
  const [toastQueue, setToastQueue] = useState([]) // [{ id, text, senderId, ts }]
  const [activeToast, setActiveToast] = useState(null)
  const toastTimerRef = useRef(null)

  const handleLogout = () => {
    logout()
    navigate('/')
    setIsMobileMenuOpen(false)
    setIsUserDropdownOpen(false)
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
    setIsUserDropdownOpen(false) // Close user dropdown when opening mobile menu
  }

  const toggleUserDropdown = () => {
    setIsUserDropdownOpen(!isUserDropdownOpen)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  const closeUserDropdown = () => {
    setIsUserDropdownOpen(false)
  }

  const closeAllMenus = () => {
    setIsMobileMenuOpen(false)
    setIsUserDropdownOpen(false)
  }

  const isActiveLink = (path) => {
    return location.pathname === path
  }

  const userAvatar = getAvatarUrl(
    user?.profilePicture ||
    user?.profilePictureUrl ||
    user?.alumniProfile?.profilePictureUrl
  )

  // Helper: push toast removed (alerts disabled per rebuild spec)
  const enqueueToast = () => {}

  // Effect: manage active toast display lifecycle
  useEffect(() => {
    if (!activeToast && toastQueue.length > 0) {
      setActiveToast(toastQueue[0])
    }
    if (activeToast) {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
      toastTimerRef.current = setTimeout(() => {
        setToastQueue((q) => q.filter((t) => t.id !== activeToast.id))
        setActiveToast(null)
      }, 3000)
    }
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [activeToast, toastQueue])

  // Clear toasts when user views messages (any conversation)
  useEffect(() => {
    if (location.pathname.startsWith('/messages')) {
      setToastQueue([])
      setActiveToast(null)
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [location.pathname])

  // Unread messages badge: fetch on load and update on socket events
  // Removed internal unread logic; now driven entirely by MessagingContext.

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        {/* Logo and Institute Name */}
        <div className={styles.logo}>
          <Link to="/" className={styles.logoLink} onClick={closeAllMenus}>
            <img 
              src="/iiit-logo.png" 
              alt="IIIT Naya Raipur Logo" 
              className={styles.logoImage}
              onError={(e) => {
                // If logo fails to load, hide it gracefully
                e.target.style.display = 'none'
              }}
            />
            <div className={styles.logoText}>
              <h1 className={styles.instituteName}>IIIT Naya Raipur</h1>
              <p className={styles.portalName}>Alumni Portal</p>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className={styles.desktopNav}>
          {!isAuthenticated && (
            <Link 
              to="/" 
              className={`${styles.navLink} ${isActiveLink('/') ? styles.active : ''}`}
            >
              Home
            </Link>
          )}
          
          {isAuthenticated && user?.role === 'admin' && (
            <Link 
              to="/admin" 
              className={`${styles.navLink} ${isActiveLink('/admin') ? styles.active : ''}`}
            >
              Admin Panel
            </Link>
          )}
          
          {isAuthenticated && user?.role !== 'admin' && (
            <Link 
              to="/dashboard" 
              className={`${styles.navLink} ${isActiveLink('/dashboard') ? styles.active : ''}`}
            >
              Dashboard
            </Link>
          )}
          
          <Link 
            to="/about" 
            className={`${styles.navLink} ${isActiveLink('/about') ? styles.active : ''}`}
          >
            About
          </Link>
          <Link 
            to="/news" 
            className={`${styles.navLink} ${isActiveLink('/news') ? styles.active : ''}`}
          >
            News
          </Link>
          <Link 
            to="/events" 
            className={`${styles.navLink} ${isActiveLink('/events') ? styles.active : ''}`}
          >
            Events
          </Link>
          
          {isAuthenticated && (
            <Link 
              to="/directory" 
              className={`${styles.navLink} ${isActiveLink('/directory') ? styles.active : ''}`}
            >
              Directory
            </Link>
          )}
        </nav>

        {/* User Actions */}
        <div className={styles.userActions}>
          {isAuthenticated ? (
            <>
              {/* Messages Icon with Badge */}
              <Link to="/messages" className={styles.messagesIcon} title="Messages">
                <svg 
                  width="24" 
                  height="24" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  className={styles.iconSvg}
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" 
                  />
                </svg>
                {totalUnread > 0 && (
                  <span className={styles.notificationBadge} aria-label={`${totalUnread} unread messages`}>{totalUnread}</span>
                )}
              </Link>

              <div className={styles.userMenu}>
                <button className={styles.userButton} onClick={toggleUserDropdown}>
                <img 
                  src={userAvatar}
                  alt={`${user?.firstName} ${user?.lastName}`}
                  className={styles.userAvatar}
                  onError={handleAvatarError}
                />
                <span className={styles.userName}>
                  {user?.firstName} {user?.lastName}
                </span>
                <svg 
                  className={styles.chevron}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {isUserDropdownOpen && (
                <div className={styles.dropdown}>
                  <Link to="/profile" className={styles.dropdownItem} onClick={closeAllMenus}>
                    My Profile
                  </Link>
                  <hr className={styles.divider} />
                  <button className={styles.dropdownItem} onClick={handleLogout}>
                    Logout
                  </button>
                </div>
              )}
            </div>
            </>
          ) : (
            <div className={styles.authButtons}>
              <Link to="/login" className={styles.loginButton}>
                Login
              </Link>
              <Link to="/register" className={styles.registerButton}>
                Register
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button 
          className={styles.mobileMenuButton}
          onClick={toggleMobileMenu}
          aria-label="Toggle mobile menu"
        >
          <span className={styles.hamburger}></span>
          <span className={styles.hamburger}></span>
          <span className={styles.hamburger}></span>
        </button>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className={styles.mobileNav}>
          <div className={styles.mobileNavContent}>
            {!isAuthenticated && (
              <Link to="/" className={styles.mobileNavLink} onClick={closeAllMenus}>
                Home
              </Link>
            )}
            
            {isAuthenticated && user?.role === 'admin' && (
              <Link to="/admin" className={styles.mobileNavLink} onClick={closeAllMenus}>
                Admin Panel
              </Link>
            )}
            
            {isAuthenticated && user?.role !== 'admin' && (
              <Link to="/dashboard" className={styles.mobileNavLink} onClick={closeAllMenus}>
                Dashboard
              </Link>
            )}
            
            <Link to="/about" className={styles.mobileNavLink} onClick={closeAllMenus}>
              About
            </Link>
            <Link to="/news" className={styles.mobileNavLink} onClick={closeAllMenus}>
              News
            </Link>
            <Link to="/events" className={styles.mobileNavLink} onClick={closeAllMenus}>
              Events
            </Link>
            
            {isAuthenticated && (
              <>
                <Link to="/directory" className={styles.mobileNavLink} onClick={closeAllMenus}>
                  Directory
                </Link>
                <Link to="/profile" className={styles.mobileNavLink} onClick={closeAllMenus}>
                  My Profile
                </Link>
                <Link to="/messages" className={styles.mobileNavLink} onClick={closeAllMenus}>
                  Messages
                </Link>
                <button className={styles.mobileLogoutButton} onClick={handleLogout}>
                  Logout
                </button>
              </>
            )}
            
            {!isAuthenticated && (
              <div className={styles.mobileAuthButtons}>
                <Link to="/login" className={styles.mobileLoginButton} onClick={closeAllMenus}>
                  Login
                </Link>
                <Link to="/register" className={styles.mobileRegisterButton} onClick={closeAllMenus}>
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast alerts removed per rebuild specification */}
    </header>
  )
}

// Inline toast renderer (simple): place near the end of header if needed
// Render toast container at fixed position

export default Header

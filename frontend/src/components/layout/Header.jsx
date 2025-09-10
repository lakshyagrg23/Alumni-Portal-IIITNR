import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@hooks/useAuth'
import styles from './Header.module.css'

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { user, logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/')
    setIsMenuOpen(false)
  }

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const closeMenu = () => {
    setIsMenuOpen(false)
  }

  const isActiveLink = (path) => {
    return location.pathname === path
  }

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        {/* Logo and Institute Name */}
        <div className={styles.logo}>
          <Link to="/" className={styles.logoLink} onClick={closeMenu}>
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
          <Link 
            to="/" 
            className={`${styles.navLink} ${isActiveLink('/') ? styles.active : ''}`}
          >
            Home
          </Link>
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
            <>
              <Link 
                to="/directory" 
                className={`${styles.navLink} ${isActiveLink('/directory') ? styles.active : ''}`}
              >
                Directory
              </Link>
              <Link 
                to="/connect" 
                className={`${styles.navLink} ${isActiveLink('/connect') ? styles.active : ''}`}
              >
                Connect
              </Link>
            </>
          )}
        </nav>

        {/* User Actions */}
        <div className={styles.userActions}>
          {isAuthenticated ? (
            <div className={styles.userMenu}>
              <button className={styles.userButton} onClick={toggleMenu}>
                <img 
                  src={user?.profilePicture || '/default-avatar.svg'}
                  alt={`${user?.firstName} ${user?.lastName}`}
                  className={styles.userAvatar}
                  onError={(e) => {
                    e.target.src = '/default-avatar.svg'
                  }}
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
              
              {isMenuOpen && (
                <div className={styles.dropdown}>
                  <Link to="/dashboard" className={styles.dropdownItem} onClick={closeMenu}>
                    Dashboard
                  </Link>
                  <Link to="/profile" className={styles.dropdownItem} onClick={closeMenu}>
                    My Profile
                  </Link>
                  <Link to="/messages" className={styles.dropdownItem} onClick={closeMenu}>
                    Messages
                  </Link>
                  {user?.role === 'admin' && (
                    <Link to="/admin" className={styles.dropdownItem} onClick={closeMenu}>
                      Admin Panel
                    </Link>
                  )}
                  <hr className={styles.divider} />
                  <button className={styles.dropdownItem} onClick={handleLogout}>
                    Logout
                  </button>
                </div>
              )}
            </div>
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
          onClick={toggleMenu}
          aria-label="Toggle mobile menu"
        >
          <span className={styles.hamburger}></span>
          <span className={styles.hamburger}></span>
          <span className={styles.hamburger}></span>
        </button>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className={styles.mobileNav}>
          <div className={styles.mobileNavContent}>
            <Link to="/" className={styles.mobileNavLink} onClick={closeMenu}>
              Home
            </Link>
            <Link to="/about" className={styles.mobileNavLink} onClick={closeMenu}>
              About
            </Link>
            <Link to="/news" className={styles.mobileNavLink} onClick={closeMenu}>
              News
            </Link>
            <Link to="/events" className={styles.mobileNavLink} onClick={closeMenu}>
              Events
            </Link>
            
            {isAuthenticated ? (
              <>
                <Link to="/directory" className={styles.mobileNavLink} onClick={closeMenu}>
                  Directory
                </Link>
                <Link to="/connect" className={styles.mobileNavLink} onClick={closeMenu}>
                  Connect
                </Link>
                <Link to="/dashboard" className={styles.mobileNavLink} onClick={closeMenu}>
                  Dashboard
                </Link>
                <Link to="/profile" className={styles.mobileNavLink} onClick={closeMenu}>
                  My Profile
                </Link>
                <Link to="/messages" className={styles.mobileNavLink} onClick={closeMenu}>
                  Messages
                </Link>
                {user?.role === 'admin' && (
                  <Link to="/admin" className={styles.mobileNavLink} onClick={closeMenu}>
                    Admin Panel
                  </Link>
                )}
                <button className={styles.mobileLogoutButton} onClick={handleLogout}>
                  Logout
                </button>
              </>
            ) : (
              <div className={styles.mobileAuthButtons}>
                <Link to="/login" className={styles.mobileLoginButton} onClick={closeMenu}>
                  Login
                </Link>
                <Link to="/register" className={styles.mobileRegisterButton} onClick={closeMenu}>
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

export default Header

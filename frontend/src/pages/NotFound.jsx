import React from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'

const NotFound = () => (
  <>
    <Helmet>
      <title>404 - Page Not Found - IIIT Naya Raipur Alumni Portal</title>
    </Helmet>
    <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: '4rem', color: 'var(--color-primary)' }}>404</h1>
      <h2>Page Not Found</h2>
      <p>The page you're looking for doesn't exist.</p>
      <Link 
        to="/" 
        style={{ 
          display: 'inline-block',
          marginTop: '2rem',
          padding: '0.75rem 2rem',
          backgroundColor: 'var(--color-primary)',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '0.5rem'
        }}
      >
        Go Home
      </Link>
    </div>
  </>
)

export default NotFound

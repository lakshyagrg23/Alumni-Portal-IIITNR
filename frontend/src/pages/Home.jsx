import React from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useAuth } from '@hooks/useAuth'
import styles from './Home.module.css'

const Home = () => {
  const { isAuthenticated, user } = useAuth()

  return (
    <>
      <Helmet>
        <title>IIIT Naya Raipur Alumni Portal - Connect, Network, Grow</title>
        <meta 
          name="description" 
          content="Official Alumni Portal for Dr. Shyama Prasad Mukherjee International Institute of Information Technology, Naya Raipur. Connect with fellow alumni, explore opportunities, and stay updated with institute news." 
        />
      </Helmet>

      <div className={styles.homepage}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <div className={styles.heroText}>
              <h1 className={styles.heroTitle}>
                Welcome to <span className={styles.highlight}>IIIT Naya Raipur</span> Alumni Portal
              </h1>
              <p className={styles.heroDescription}>
                Connect with fellow alumni, discover opportunities, share achievements, 
                and contribute to the growth of our vibrant IIIT NR community.
              </p>
              
              {isAuthenticated ? (
                <div className={styles.heroActions}>
                  <Link to="/dashboard" className={styles.primaryButton}>
                    Go to Dashboard
                  </Link>
                  <Link to="/directory" className={styles.secondaryButton}>
                    Explore Alumni Directory
                  </Link>
                </div>
              ) : (
                <div className={styles.heroActions}>
                  <Link to="/register" className={styles.primaryButton}>
                    Join Alumni Network
                  </Link>
                  <Link to="/login" className={styles.secondaryButton}>
                    Sign In
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className={styles.features}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2>Why Join Our Alumni Network?</h2>
              <p>Discover the benefits of being part of the IIIT NR alumni community</p>
            </div>
            
            <div className={styles.featuresGrid}>
              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3>Connect & Network</h3>
                <p>Build meaningful professional relationships with alumni across different batches and industries.</p>
              </div>

              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                </div>
                <h3>Latest News & Achievements</h3>
                <p>Stay updated with institute news, alumni achievements, and upcoming events.</p>
              </div>

              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2V6" />
                  </svg>
                </div>
                <h3>Volunteer Opportunities</h3>
                <p>Contribute to workshops, webinars, mentorship programs, and institute events.</p>
              </div>

              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3>Alumni Directory</h3>
                <p>Search and discover alumni by batch, department, location, or industry.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className={styles.stats}>
          <div className={styles.container}>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statNumber}>1500+</div>
                <div className={styles.statLabel}>Alumni Network</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statNumber}>50+</div>
                <div className={styles.statLabel}>Countries Worldwide</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statNumber}>200+</div>
                <div className={styles.statLabel}>Companies</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statNumber}>15+</div>
                <div className={styles.statLabel}>Years of Excellence</div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className={styles.cta}>
          <div className={styles.container}>
            <div className={styles.ctaContent}>
              <h2>Ready to Connect with Your Alumni Network?</h2>
              <p>Join thousands of IIIT NR graduates who are already part of our thriving community.</p>
              
              {!isAuthenticated && (
                <div className={styles.ctaActions}>
                  <Link to="/register" className={styles.ctaPrimary}>
                    Get Started Today
                  </Link>
                  <Link to="/about" className={styles.ctaSecondary}>
                    Learn More
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </>
  )
}

export default Home

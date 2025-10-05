import React, { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useAuth } from '@hooks/useAuth'
import axios from 'axios'
import styles from './Dashboard.module.css'

const Dashboard = () => {
  const { user, isAuthenticated } = useAuth()
  const [loading, setLoading] = useState(true)
  const [latestNews, setLatestNews] = useState([])
  const [upcomingEvents, setUpcomingEvents] = useState([])
  const [recommendations, setRecommendations] = useState({
    sameCompany: [],
    sameCity: [],
    sameBatch: []
  })
  const [profileCompletion, setProfileCompletion] = useState(0)

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchDashboardData()
    }
  }, [isAuthenticated, user])

  // Calculate profile completion percentage
  useEffect(() => {
    if (user && user.alumniProfile) {
      calculateProfileCompletion()
    }
  }, [user])

  const calculateProfileCompletion = () => {
    const profile = user.alumniProfile
    const fields = [
      profile.firstName || profile.first_name,
      profile.lastName || profile.last_name,
      profile.graduationYear || profile.graduation_year,
      profile.branch,
      profile.degree,
      profile.bio,
      profile.currentCompany || profile.current_company,
      profile.currentPosition || profile.current_position,
      profile.currentCity || profile.current_city,
      (profile.skills && profile.skills.length > 0) || 
        (typeof profile.skills === 'string' && profile.skills.trim().length > 0),
      profile.linkedinUrl || profile.linkedin_url,
    ]
    
    const filledFields = fields.filter(field => field).length
    const percentage = Math.round((filledFields / fields.length) * 100)
    setProfileCompletion(percentage)
  }

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch latest news
      const newsResponse = await axios.get(`${API_URL}/news/latest?limit=2`)
      if (newsResponse.data.success) {
        setLatestNews(newsResponse.data.data)
      }

      // Fetch upcoming events
      const eventsResponse = await axios.get(`${API_URL}/events/upcoming?limit=2`)
      if (eventsResponse.data.success) {
        setUpcomingEvents(eventsResponse.data.data)
      }

      // Fetch personalized recommendations if user has alumni profile
      if (user?.alumniProfile) {
        await fetchRecommendations()
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRecommendations = async () => {
    try {
      const profile = user.alumniProfile
      
      // Support both camelCase and snake_case field names
      const currentCompany = profile.currentCompany || profile.current_company
      const currentCity = profile.currentCity || profile.current_city
      const graduationYear = profile.graduationYear || profile.graduation_year
      const branch = profile.branch
      
      console.log('📊 Fetching recommendations for profile:', {
        currentCompany,
        currentCity,
        graduationYear,
        branch,
        profileId: profile.id
      })

      const recommendations = {
        sameCompany: [],
        sameCity: [],
        sameBatch: []
      }

      // Fetch alumni from same company
      if (currentCompany) {
        console.log('🔍 Searching for alumni at:', currentCompany)
        const companyResponse = await axios.get(
          `${API_URL}/alumni?company=${encodeURIComponent(currentCompany)}&limit=3`
        )
        if (companyResponse.data.success) {
          recommendations.sameCompany = companyResponse.data.data.filter(
            alum => alum.id !== profile.id
          ).slice(0, 3)
          console.log('✅ Found', recommendations.sameCompany.length, 'alumni at same company')
        }
      } else {
        console.log('⚠️ No company information in profile')
      }

      // Fetch alumni from same city
      if (currentCity) {
        console.log('🔍 Searching for alumni in:', currentCity)
        const cityResponse = await axios.get(
          `${API_URL}/alumni?location=${encodeURIComponent(currentCity)}&limit=3`
        )
        if (cityResponse.data.success) {
          recommendations.sameCity = cityResponse.data.data.filter(
            alum => alum.id !== profile.id
          ).slice(0, 3)
          console.log('✅ Found', recommendations.sameCity.length, 'alumni in same city')
        }
      } else {
        console.log('⚠️ No city information in profile')
      }

      // Fetch alumni from same batch and branch
      if (graduationYear && branch) {
        console.log('🔍 Searching for batchmates:', branch, graduationYear)
        const batchResponse = await axios.get(
          `${API_URL}/alumni?batch=${graduationYear}&branch=${encodeURIComponent(branch)}&limit=4`
        )
        if (batchResponse.data.success) {
          recommendations.sameBatch = batchResponse.data.data.filter(
            alum => alum.id !== profile.id
          ).slice(0, 3)
          console.log('✅ Found', recommendations.sameBatch.length, 'batchmates')
        }
      } else {
        console.log('⚠️ No graduation year or branch in profile')
      }

      console.log('📋 Total recommendations:', {
        sameCompany: recommendations.sameCompany.length,
        sameCity: recommendations.sameCity.length,
        sameBatch: recommendations.sameBatch.length
      })

      setRecommendations(recommendations)
    } catch (error) {
      console.error('❌ Error fetching recommendations:', error)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }

  if (!isAuthenticated || !user) {
    return (
      <div className={styles.container}>
        <p>Please log in to view your dashboard.</p>
      </div>
    )
  }

  return (
    <>
      <Helmet>
        <title>Dashboard - IIIT Naya Raipur Alumni Portal</title>
      </Helmet>

      <div className={styles.dashboard}>
        {/* Welcome Section */}
        <section className={styles.welcomeSection}>
          <div className={styles.welcomeContent}>
            <h1 className={styles.welcomeTitle}>
              Welcome back, {user.firstName || 'Alumni'}! 👋
            </h1>
            
            {profileCompletion < 100 && (
              <div className={styles.profileStatus}>
                <div className={styles.profileStatusHeader}>
                  <span className={styles.profileStatusText}>
                    🎓 Your profile is {profileCompletion}% complete
                  </span>
                  <Link to="/profile" className={styles.completeProfileLink}>
                    Complete Profile
                  </Link>
                </div>
                <div className={styles.progressBar}>
                  <div 
                    className={styles.progressFill} 
                    style={{ width: `${profileCompletion}%` }}
                  />
                </div>
              </div>
            )}
            
            <div className={styles.quickActions}>
              <Link to="/profile" className={styles.actionButton}>
                Edit Profile
              </Link>
              <Link to={`/alumni/${user.alumniProfile?.id}`} className={styles.actionButtonSecondary}>
                View Public Profile
              </Link>
            </div>
          </div>
        </section>

        {loading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p>Loading your dashboard...</p>
          </div>
        ) : (
          <>
            {/* News and Events Section */}
            <div className={styles.contentGrid}>
              {/* Latest News */}
              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>📰 Latest News</h2>
                  <Link to="/news" className={styles.viewAllLink}>
                    View All →
                  </Link>
                </div>
                
                {latestNews.length > 0 ? (
                  <div className={styles.newsGrid}>
                    {latestNews.map(news => (
                      <Link 
                        to={`/news/${news.id}`} 
                        key={news.id}
                        className={styles.newsCard}
                      >
                        {news.imageUrl && (
                          <div className={styles.newsImage}>
                            <img src={news.imageUrl} alt={news.title} />
                          </div>
                        )}
                        <div className={styles.newsContent}>
                          {news.category && (
                            <span className={styles.newsCategory}>{news.category}</span>
                          )}
                          <h3 className={styles.newsTitle}>{news.title}</h3>
                          <p className={styles.newsExcerpt}>
                            {news.excerpt || news.content?.substring(0, 100) + '...'}
                          </p>
                          <span className={styles.newsDate}>
                            {formatDate(news.publishedAt)}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className={styles.emptyState}>No recent news available.</p>
                )}
              </section>

              {/* Upcoming Events */}
              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>📅 Upcoming Events</h2>
                  <Link to="/events" className={styles.viewAllLink}>
                    View All →
                  </Link>
                </div>
                
                {upcomingEvents.length > 0 ? (
                  <div className={styles.eventsGrid}>
                    {upcomingEvents.map(event => (
                      <div key={event.id} className={styles.eventCard}>
                        <div className={styles.eventDate}>
                          <span className={styles.eventDay}>
                            {new Date(event.startDatetime).getDate()}
                          </span>
                          <span className={styles.eventMonth}>
                            {new Date(event.startDatetime).toLocaleDateString('en-US', { month: 'short' })}
                          </span>
                        </div>
                        <div className={styles.eventContent}>
                          <h3 className={styles.eventTitle}>{event.title}</h3>
                          <p className={styles.eventType}>{event.eventType}</p>
                          <p className={styles.eventMode}>{event.mode}</p>
                        </div>
                        <Link 
                          to="/events" 
                          className={styles.eventButton}
                        >
                          View Details
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={styles.emptyState}>No upcoming events scheduled.</p>
                )}
              </section>
            </div>

            {/* Recommendations Section - Always show if user has alumni profile */}
            {user.alumniProfile && (
              <section className={styles.recommendationsSection}>
                <h2 className={styles.sectionTitle}>💼 Recommended Connections</h2>
                
                {/* Check if we have ANY recommendations */}
                {(recommendations.sameCompany.length === 0 && 
                  recommendations.sameCity.length === 0 && 
                  recommendations.sameBatch.length === 0) ? (
                  <div className={styles.emptyRecommendations}>
                    <p className={styles.emptyRecommendationsText}>
                      Complete your profile to get personalized alumni recommendations!
                    </p>
                    <p className={styles.emptyRecommendationsHint}>
                      Add your current company, location, graduation year, and branch to see alumni with similar backgrounds.
                    </p>
                    <Link to="/profile" className={styles.completeProfileButton}>
                      Complete Your Profile
                    </Link>
                  </div>
                ) : (
                  <>
                    {/* Same Company */}
                    {recommendations.sameCompany.length > 0 && (
                      <div className={styles.recommendationGroup}>
                        <h3 className={styles.recommendationTitle}>
                          Alumni at {user.alumniProfile?.currentCompany || user.alumniProfile?.current_company}
                        </h3>
                        <div className={styles.alumniGrid}>
                          {recommendations.sameCompany.map(alum => (
                            <div key={alum.id} className={styles.alumniCard}>
                              <img 
                                src={alum.profilePicture || '/default-avatar.svg'} 
                                alt={`${alum.firstName} ${alum.lastName}`}
                                className={styles.alumniAvatar}
                              />
                              <h4 className={styles.alumniName}>
                                {alum.firstName} {alum.lastName}
                              </h4>
                              <p className={styles.alumniPosition}>
                                {alum.currentPosition}
                              </p>
                              <p className={styles.alumniBatch}>
                                {alum.branch} • {alum.graduationYear}
                              </p>
                              <Link 
                                to={`/alumni/${alum.id}`}
                                className={styles.alumniButton}
                              >
                                View Profile
                              </Link>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Same City */}
                    {recommendations.sameCity.length > 0 && (
                      <div className={styles.recommendationGroup}>
                        <h3 className={styles.recommendationTitle}>
                          Alumni in {user.alumniProfile?.currentCity || user.alumniProfile?.current_city}
                        </h3>
                        <div className={styles.alumniGrid}>
                          {recommendations.sameCity.map(alum => (
                            <div key={alum.id} className={styles.alumniCard}>
                              <img 
                                src={alum.profilePicture || '/default-avatar.svg'} 
                                alt={`${alum.firstName} ${alum.lastName}`}
                                className={styles.alumniAvatar}
                              />
                              <h4 className={styles.alumniName}>
                                {alum.firstName} {alum.lastName}
                              </h4>
                              <p className={styles.alumniPosition}>
                                {alum.currentPosition || alum.currentCompany}
                              </p>
                              <p className={styles.alumniBatch}>
                                {alum.branch} • {alum.graduationYear}
                              </p>
                              <Link 
                                to={`/alumni/${alum.id}`}
                                className={styles.alumniButton}
                              >
                                View Profile
                              </Link>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Same Batch */}
                    {recommendations.sameBatch.length > 0 && (
                      <div className={styles.recommendationGroup}>
                        <h3 className={styles.recommendationTitle}>
                          Your Batchmates ({user.alumniProfile?.branch} {user.alumniProfile?.graduationYear || user.alumniProfile?.graduation_year})
                        </h3>
                        <div className={styles.alumniGrid}>
                          {recommendations.sameBatch.map(alum => (
                            <div key={alum.id} className={styles.alumniCard}>
                              <img 
                                src={alum.profilePicture || '/default-avatar.svg'} 
                                alt={`${alum.firstName} ${alum.lastName}`}
                                className={styles.alumniAvatar}
                              />
                              <h4 className={styles.alumniName}>
                                {alum.firstName} {alum.lastName}
                              </h4>
                              <p className={styles.alumniPosition}>
                                {alum.currentPosition || alum.currentCompany}
                              </p>
                              <p className={styles.alumniLocation}>
                                {alum.currentCity}, {alum.currentState}
                              </p>
                              <Link 
                                to={`/alumni/${alum.id}`}
                                className={styles.alumniButton}
                              >
                                View Profile
                              </Link>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </>
  )
}

export default Dashboard

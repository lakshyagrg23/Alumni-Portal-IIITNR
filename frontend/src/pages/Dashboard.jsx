import React, { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@hooks/useAuth'
import axios from 'axios'
import styles from './Dashboard.module.css'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';


const Dashboard = () => {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const [loading, setLoading] = useState(true)
  const [latestNews, setLatestNews] = useState([])
  const [upcomingEvents, setUpcomingEvents] = useState([])
  const [calendarDate, setCalendarDate] = useState(new Date())
  const [showProfileReminder, setShowProfileReminder] = useState(true)

  // Normalize events to include start/end dates for multi-day support
  const normalizedEvents = React.useMemo(() => {
    return upcomingEvents.map(e => {
      const start = new Date(e.startDatetime)
      const end = new Date(e.endDatetime || e.startDatetime)
      // strip time
      const startKey = new Date(start.getFullYear(), start.getMonth(), start.getDate())
      const endKey = new Date(end.getFullYear(), end.getMonth(), end.getDate())
      return { ...e, _startDate: startKey, _endDate: endKey }
    })
  }, [upcomingEvents])
  const [recommendations, setRecommendations] = useState({
    sameCompany: [],
    sameCity: [],
    sameBatch: []
  })

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
  const ASSETS_BASE_URL = API_URL.replace(/\/api$/, '')

  const resolveAvatar = (url) => {
    if (!url) return '/default-avatar.svg'
    if (url.startsWith('http')) return url
    return `${ASSETS_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`
  }

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchDashboardData()
    }
  }, [isAuthenticated, user])

  useEffect(() => {
    const isDismissed = localStorage.getItem('hideProfileReminder') === 'true'
    if (isDismissed) {
      setShowProfileReminder(false)
    }
  }, [])

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
      const currentYear = new Date().getFullYear()
      
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

      // Fetch alumni from same batch (branch optional)
      if (graduationYear) {
        const params = new URLSearchParams()
        params.set('batch', graduationYear)
        params.set('limit', 4)

        // If this is a current student (future graduation year), include current students too
        if (graduationYear > currentYear) {
          params.set('studentType', 'current')
        }

        console.log('🔍 Searching for batchmates:', {
          graduationYear,
          studentType: params.get('studentType') || 'alumni',
        })

        const batchResponse = await axios.get(
          `${API_URL}/alumni?${params.toString()}`
        )
        if (batchResponse.data.success) {
          recommendations.sameBatch = batchResponse.data.data.filter(
            alum => alum.id !== profile.id
          ).slice(0, 3)
          console.log('✅ Found', recommendations.sameBatch.length, 'batchmates')
        }
      } else {
        console.log('⚠️ No graduation year in profile')
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

  const formatTimeRange = (start, end) => {
    const s = new Date(start)
    const e = new Date(end || start)
    const sStr = s.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    const eStr = e.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    return `${sStr} - ${eStr}`
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
        {/* Welcome Header */}
        <div className={styles.welcomeHeader}>
          <h1 className={styles.welcomeTitle}>
            Welcome back, {user.firstName || 'Alumni'}! 👋
          </h1>
          <div className={styles.headerActions}>
            <Link to={`/alumni/${user.alumniProfile?.id}`} className={styles.headerButtonSecondary}>
              View Public Profile
            </Link>
          </div>
        </div>

        {/* Profile Update Reminder */}
        {showProfileReminder && (
          <div className={styles.profileBanner}>
            <div className={styles.bannerContent}>
              <div className={styles.bannerLeft}>
                <span className={styles.bannerIcon}>ℹ️</span>
                <span className={styles.bannerText}>
                  Keep your profile up to date to help fellow alumni connect with you
                </span>
              </div>
              <div className={styles.bannerActions}>
                <Link to="/profile" className={styles.bannerButton}>
                  Update Profile
                </Link>
                <button
                  type="button"
                  className={styles.bannerDismiss}
                  onClick={() => {
                    setShowProfileReminder(false)
                    localStorage.setItem('hideProfileReminder', 'true')
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

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

              {/* Upcoming Events - Calendar View */}
              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>📅 Upcoming Events</h2>
                  <Link to="/events" className={styles.viewAllLink}>
                    View All →
                  </Link>
                </div>

                <div className={styles.calendarSection}>
                  <div className={styles.calendarWrapper}>
                      <DayPicker
                        mode="single"
                        selected={calendarDate}
                        onSelect={(date) => setCalendarDate(date || new Date())}
                        onDayClick={(date) => setCalendarDate(date)}
                        modifiers={{
                          hasEvent: (date) => normalizedEvents.some(e => date >= e._startDate && date <= e._endDate),
                          rangeStart: (date) => normalizedEvents.some(e => +date === +e._startDate),
                          rangeEnd: (date) => normalizedEvents.some(e => +date === +e._endDate),
                        }}
                        modifiersClassNames={{
                          hasEvent: styles.calendarEventDay,
                          rangeStart: styles.calendarRangeStart,
                          rangeEnd: styles.calendarRangeEnd,
                        }}
                      />
                  </div>

                  <div className={styles.calendarSidebar}>
                    <h3 className={styles.calendarSidebarTitle}>{calendarDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</h3>
                    {(() => {
                      const dayEvents = normalizedEvents.filter(e => calendarDate >= e._startDate && calendarDate <= e._endDate)
                      if (!dayEvents.length) {
                        return <p className={styles.emptyState}>No events on this date.</p>
                      }
                      return (
                        <ul className={styles.dayEventsList}>
                          {dayEvents.map(e => (
                            <li key={e.id} className={styles.dayEventItem}>
                              <div className={styles.dayEventTitle}>{e.title}</div>
                              <div className={styles.dayEventMeta}>
                                <span>{e.eventType}</span>
                                <span>•</span>
                                <span>{e.mode}</span>
                                {e.startDatetime && (
                                  <>
                                    <span>•</span>
                                    <span>{formatTimeRange(e.startDatetime, e.endDatetime)}</span>
                                  </>
                                )}
                              </div>
                              <Link to="/events" className={styles.eventButton}>View Details</Link>
                            </li>
                          ))}
                        </ul>
                      )
                    })()}
                  </div>
                </div>
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
                                src={resolveAvatar(
                                  alum.profilePicture ||
                                  alum.profilePictureUrl ||
                                  alum.profile_picture_url
                                )} 
                                alt={`${alum.firstName} ${alum.lastName}`}
                                className={styles.alumniAvatar}
                                onError={(e) => { e.currentTarget.src = '/default-avatar.svg' }}
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
                                src={resolveAvatar(
                                  alum.profilePicture ||
                                  alum.profilePictureUrl ||
                                  alum.profile_picture_url
                                )} 
                                alt={`${alum.firstName} ${alum.lastName}`}
                                className={styles.alumniAvatar}
                                onError={(e) => { e.currentTarget.src = '/default-avatar.svg' }}
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
                          Your Batchmates (Graduation Year: {user.alumniProfile?.graduationYear || user.alumniProfile?.graduation_year})
                        </h3>
                        <div className={styles.alumniGrid}>
                          {recommendations.sameBatch.map(alum => (
                            <div key={alum.id} className={styles.alumniCard}>
                              <img 
                                src={resolveAvatar(
                                  alum.profilePicture ||
                                  alum.profilePictureUrl ||
                                  alum.profile_picture_url || '/default-avatar.svg'
                                )} 
                                alt={`${alum.firstName} ${alum.lastName}`}
                                className={styles.alumniAvatar}
                                onError={(e) => { e.currentTarget.src = '/default-avatar.svg' }}
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

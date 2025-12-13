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
import { 
  BiUser, 
  BiNews, 
  BiCalendar, 
  BiTrendingUp,
  BiGroup,
  BiBriefcase,
  BiBuilding,
  BiMapPin,
  BiStar,
  BiRocket,
  BiChevronRight,
  BiInfoCircle,
  BiCheck,
  BiX
} from 'react-icons/bi'


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
    sameIndustry: [],
    sharedInterests: [],
    similarCareerPath: [],
    sameCompany: [],
    sameBatch: []
  })
  const [stats, setStats] = useState({
    totalNews: 0,
    totalEvents: 0,
    totalConnections: 0,
    profileCompletion: 0
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
      const industry = profile.industrySector || profile.industry_sector || profile.industry
      const graduationYear = profile.graduationYear || profile.graduation_year
      const branch = profile.branch
      const currentYear = new Date().getFullYear()
      const professionalInterests = profile.professionalInterests || profile.professional_interests || []
      const careerGoals = profile.careerGoals || profile.career_goals
      const skills = profile.skills || []
      
      console.log('📊 Fetching smart recommendations for profile:', {
        industry,
        professionalInterests,
        careerGoals,
        skills: skills?.length || 0,
        profileId: profile.id
      })

      const recommendations = {
        sameIndustry: [],
        sharedInterests: [],
        similarCareerPath: [],
        sameCompany: [],
        sameBatch: []
      }

      // 1. Priority: Alumni in same industry (career-relevant)
      if (industry) {
        console.log('🎯 Searching for alumni in industry:', industry)
        try {
          const industryResponse = await axios.get(
            `${API_URL}/alumni?industry=${encodeURIComponent(industry)}&limit=20`
          )
          if (industryResponse.data.success) {
            recommendations.sameIndustry = industryResponse.data.data
              .filter(alum => alum.id !== profile.id)
              .slice(0, 4)
            console.log('✅ Found', recommendations.sameIndustry.length, 'alumni in same industry')
          }
        } catch (err) {
          console.log('⚠️ Industry search failed:', err.message)
        }
      }

      // 2. Alumni with shared professional interests
      if (professionalInterests && professionalInterests.length > 0) {
        console.log('💡 Searching for alumni with shared interests:', professionalInterests)
        try {
          // Fetch all alumni and filter by shared interests client-side
          const allAlumniResponse = await axios.get(`${API_URL}/alumni?limit=50`)
          if (allAlumniResponse.data.success) {
            const matchedByInterests = allAlumniResponse.data.data
              .filter(alum => {
                if (alum.id === profile.id) return false
                const alumInterests = alum.professionalInterests || alum.professional_interests || []
                // Check if there's any overlap in interests
                const sharedInterests = professionalInterests.filter(interest => 
                  alumInterests.some(ai => ai.toLowerCase() === interest.toLowerCase())
                )
                return sharedInterests.length > 0
              })
              .map(alum => ({
                ...alum,
                _matchScore: professionalInterests.filter(interest => 
                  (alum.professionalInterests || alum.professional_interests || []).some(ai => 
                    ai.toLowerCase() === interest.toLowerCase()
                  )
                ).length
              }))
              .sort((a, b) => b._matchScore - a._matchScore)
              .slice(0, 4)
            
            recommendations.sharedInterests = matchedByInterests
            console.log('✅ Found', matchedByInterests.length, 'alumni with shared interests')
          }
        } catch (err) {
          console.log('⚠️ Interests search failed:', err.message)
        }
      }

      // 3. Alumni with similar career trajectory/goals
      if (careerGoals) {
        console.log('🚀 Searching for alumni with similar career aspirations')
        try {
          const allAlumniResponse = await axios.get(`${API_URL}/alumni?limit=50`)
          if (allAlumniResponse.data.success) {
            const matchedByCareer = allAlumniResponse.data.data
              .filter(alum => {
                if (alum.id === profile.id) return false
                const alumCareerGoals = alum.careerGoals || alum.career_goals || ''
                const alumIndustry = alum.industrySector || alum.industry_sector || alum.industry || ''
                
                // Match based on career goals keywords or industry
                const goalKeywords = careerGoals.toLowerCase().split(/\s+/).filter(w => w.length > 3)
                const alumGoalKeywords = alumCareerGoals.toLowerCase().split(/\s+/).filter(w => w.length > 3)
                
                const hasGoalMatch = goalKeywords.some(keyword => 
                  alumCareerGoals.toLowerCase().includes(keyword)
                )
                const hasIndustryMatch = industry && alumIndustry.toLowerCase() === industry.toLowerCase()
                
                return hasGoalMatch || hasIndustryMatch
              })
              .slice(0, 4)
            
            recommendations.similarCareerPath = matchedByCareer
            console.log('✅ Found', matchedByCareer.length, 'alumni with similar career paths')
          }
        } catch (err) {
          console.log('⚠️ Career path search failed:', err.message)
        }
      }

      // 4. Alumni from same company (networking)
      if (currentCompany) {
        console.log('🏢 Searching for alumni at:', currentCompany)
        try {
          const companyResponse = await axios.get(
            `${API_URL}/alumni?company=${encodeURIComponent(currentCompany)}&limit=4`
          )
          if (companyResponse.data.success) {
            recommendations.sameCompany = companyResponse.data.data
              .filter(alum => alum.id !== profile.id)
              .slice(0, 3)
            console.log('✅ Found', recommendations.sameCompany.length, 'alumni at same company')
          }
        } catch (err) {
          console.log('⚠️ Company search failed:', err.message)
        }
      }

      // 5. Batchmates (always useful)
      if (graduationYear) {
        const params = new URLSearchParams()
        params.set('batch', graduationYear)
        params.set('limit', 4)

        if (graduationYear > currentYear) {
          params.set('studentType', 'current')
        }

        console.log('🎓 Searching for batchmates:', graduationYear)
        try {
          const batchResponse = await axios.get(
            `${API_URL}/alumni?${params.toString()}`
          )
          if (batchResponse.data.success) {
            recommendations.sameBatch = batchResponse.data.data
              .filter(alum => alum.id !== profile.id)
              .slice(0, 3)
            console.log('✅ Found', recommendations.sameBatch.length, 'batchmates')
          }
        } catch (err) {
          console.log('⚠️ Batch search failed:', err.message)
        }
      }

      console.log('📋 Total smart recommendations:', {
        sameIndustry: recommendations.sameIndustry.length,
        sharedInterests: recommendations.sharedInterests.length,
        similarCareerPath: recommendations.similarCareerPath.length,
        sameCompany: recommendations.sameCompany.length,
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

  const calculateProfileCompletion = () => {
    if (!user?.alumniProfile) return 0
    const profile = user.alumniProfile
    let completed = 0
    const total = 10
    
    if (profile.firstName && profile.lastName) completed++
    if (profile.currentCompany || profile.current_company) completed++
    if (profile.currentPosition || profile.current_position) completed++
    if (profile.currentCity || profile.current_city) completed++
    if (profile.graduationYear || profile.graduation_year) completed++
    if (profile.branch) completed++
    if (profile.industrySector || profile.industry_sector || profile.industry) completed++
    if (profile.professionalInterests?.length || profile.professional_interests?.length) completed++
    if (profile.careerGoals || profile.career_goals) completed++
    if (profile.profilePicture || profile.profilePictureUrl || profile.profile_picture_url) completed++
    
    return Math.round((completed / total) * 100)
  }

  useEffect(() => {
    if (user) {
      const totalRecs = Object.values(recommendations).reduce((sum, arr) => sum + arr.length, 0)
      setStats({
        totalNews: latestNews.length,
        totalEvents: upcomingEvents.length,
        totalConnections: totalRecs,
        profileCompletion: calculateProfileCompletion()
      })
    }
  }, [user, recommendations, latestNews, upcomingEvents])

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
        {/* Hero Section with Welcome and Stats */}
        <div className={styles.heroSection}>
          <div className={styles.heroContent}>
            <div className={styles.welcomeBlock}>
              <h1 className={styles.heroTitle}>
                Welcome back, {user.firstName || 'Alumni'}!
              </h1>
              <p className={styles.heroSubtitle}>
                Here's what's happening in the IIIT Naya Raipur alumni network today
              </p>
            </div>
            
          </div>
        </div>

        {/* Profile Completion Alert */}
        {showProfileReminder && stats.profileCompletion < 100 && (
          <div className={styles.alertBanner}>
            <div className={styles.alertIcon}>
              <BiInfoCircle size={24} />
            </div>
            <div className={styles.alertContent}>
              <h3 className={styles.alertTitle}>Complete Your Profile</h3>
              <p className={styles.alertText}>
                Your profile is {stats.profileCompletion}% complete. Add more details to unlock better recommendations!
              </p>
            </div>
            <div className={styles.alertActions}>
              <Link to="/profile" className={styles.alertButton}>
                <BiCheck size={18} />
                Complete Now
              </Link>
              <button
                className={styles.alertDismiss}
                onClick={() => {
                  setShowProfileReminder(false)
                  localStorage.setItem('hideProfileReminder', 'true')
                }}
              >
                <BiX size={20} />
              </button>
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
            {/* Main Content Grid */}
            <div className={styles.mainGrid}>
              {/* Latest News Section */}
              <section className={styles.contentSection}>
                <div className={styles.sectionHeaderModern}>
                  <div className={styles.sectionTitleGroup}>
                    <div className={styles.sectionIconWrapper}>
                      <BiNews size={28} />
                    </div>
                    <div>
                      <h2 className={styles.sectionTitleModern}>Latest News</h2>
                      <p className={styles.sectionSubtitle}>Stay updated with recent announcements</p>
                    </div>
                  </div>
                  <Link to="/news" className={styles.viewAllButton}>
                    <span>View All</span>
                    <BiChevronRight size={18} />
                  </Link>
                </div>
                
                {latestNews.length > 0 ? (
                  <div className={styles.newsGridModern}>
                    {latestNews.map((news, index) => (
                      <Link 
                        to={`/news/${news.id}`} 
                        key={news.id}
                        className={styles.newsCardModern}
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        {news.imageUrl && (
                          <div className={styles.newsImageModern}>
                            <img src={news.imageUrl} alt={news.title} />
                            <div className={styles.newsOverlay}></div>
                          </div>
                        )}
                        <div className={styles.newsContentModern}>
                          {news.category && (
                            <span className={styles.newsCategoryTag}>{news.category}</span>
                          )}
                          <h3 className={styles.newsTitleModern}>{news.title}</h3>
                          <p className={styles.newsExcerptModern}>
                            {news.excerpt || news.content?.substring(0, 100) + '...'}
                          </p>
                          <div className={styles.newsFooter}>
                            <span className={styles.newsDateModern}>
                              <BiCalendar size={16} />
                              {formatDate(news.publishedAt)}
                            </span>
                            <span className={styles.newsReadMore}>
                              Read More <BiChevronRight size={16} />
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyStateModern}>
                    <BiNews size={48} />
                    <p>No recent news available</p>
                  </div>
                )}
              </section>

              {/* Upcoming Events Section */}
              <section className={styles.contentSection}>
                <div className={styles.sectionHeaderModern}>
                  <div className={styles.sectionTitleGroup}>
                    <div className={styles.sectionIconWrapper}>
                      <BiCalendar size={28} />
                    </div>
                    <div>
                      <h2 className={styles.sectionTitleModern}>Upcoming Events</h2>
                      <p className={styles.sectionSubtitle}>Mark your calendar</p>
                    </div>
                  </div>
                  <Link to="/events" className={styles.viewAllButton}>
                    <span>View All</span>
                    <BiChevronRight size={18} />
                  </Link>
                </div>

                {upcomingEvents.length > 0 ? (
                  <div className={styles.eventsContainer}>
                    <div className={styles.calendarGrid}>
                      <div className={styles.calendarWrapperModern}>
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

                      <div className={styles.eventsSidebarModern}>
                        <div className={styles.selectedDateHeader}>
                          <BiCalendar size={20} />
                          <h3>{calendarDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</h3>
                        </div>
                        {(() => {
                          const dayEvents = normalizedEvents.filter(e => calendarDate >= e._startDate && calendarDate <= e._endDate)
                          if (!dayEvents.length) {
                            return (
                              <div className={styles.noEventsDay}>
                                <BiCalendar size={32} />
                                <p>No events scheduled</p>
                              </div>
                            )
                          }
                          return (
                            <div className={styles.eventsListModern}>
                              {dayEvents.map((e, index) => (
                                <div key={e.id} className={styles.eventItemModern} style={{ animationDelay: `${index * 0.1}s` }}>
                                  <div className={styles.eventIconBadge}>
                                    <BiCalendar size={16} />
                                  </div>
                                  <div className={styles.eventDetails}>
                                    <h4 className={styles.eventTitleModern}>{e.title}</h4>
                                    <div className={styles.eventMetaModern}>
                                      <span className={styles.eventTypeTag}>{e.eventType}</span>
                                      <span className={styles.eventMode}>{e.mode}</span>
                                    </div>
                                    {e.startDatetime && (
                                      <div className={styles.eventTime}>
                                        {formatTimeRange(e.startDatetime, e.endDatetime)}
                                      </div>
                                    )}
                                  </div>
                                  <Link to="/events" className={styles.eventActionButton}>
                                    <BiChevronRight size={20} />
                                  </Link>
                                </div>
                              ))}
                            </div>
                          )
                        })()}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyStateModern}>
                    <BiCalendar size={48} />
                    <p>No upcoming events</p>
                  </div>
                )}
              </section>
            </div>

            {/* Recommendations Section - Always show if user has alumni profile */}
            {user.alumniProfile && (
              <section className={styles.recommendationsModern}>
                <div className={styles.sectionHeaderModern}>
                  <div className={styles.sectionTitleGroup}>
                    <div className={styles.sectionIconWrapper}>
                      <BiTrendingUp size={28} />
                    </div>
                    <div>
                      <h2 className={styles.sectionTitleModern}>Smart Recommendations</h2>
                      <p className={styles.sectionSubtitle}>Connect with alumni based on your profile and interests</p>
                    </div>
                  </div>
                </div>
                
                {/* Check if we have ANY recommendations */}
                {(recommendations.sameIndustry.length === 0 && 
                  recommendations.sharedInterests.length === 0 && 
                  recommendations.similarCareerPath.length === 0 &&
                  recommendations.sameCompany.length === 0 && 
                  recommendations.sameBatch.length === 0) ? (
                  <div className={styles.emptyRecommendationsModern}>
                    <p className={styles.emptyRecommendationsText}>
                      Complete your profile to get personalized alumni recommendations!
                    </p>
                    <p className={styles.emptyRecommendationsHint}>
                      Add your industry, professional interests, career goals, and skills to discover alumni who can help advance your career.
                    </p>
                    <Link to="/profile" className={styles.completeProfileButton}>
                      Complete Your Profile
                    </Link>
                  </div>
                ) : (
                  <div className={styles.recommendationsCarousel}>
                    {/* Same Industry - Priority 1 */}
                    {recommendations.sameIndustry.length > 0 && (
                      <div className={styles.recGroupModern}>
                        <div className={styles.recHeader}>
                          <div className={styles.recIconBadge} style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%)' }}>
                            <BiBriefcase size={20} />
                          </div>
                          <div>
                            <h3 className={styles.recTitle}>
                              Alumni in {user.alumniProfile?.industrySector || user.alumniProfile?.industry_sector || user.alumniProfile?.industry}
                            </h3>
                            <p className={styles.recSubtitle}>Career insights from your industry</p>
                          </div>
                        </div>
                        <div className={styles.alumniGridModern}>
                          {recommendations.sameIndustry.map((alum, index) => (
                            <Link 
                              to={`/alumni/${alum.id}`}
                              key={alum.id} 
                              className={styles.alumniCardModern}
                              style={{ animationDelay: `${index * 0.1}s` }}
                            >
                              <div className={styles.alumniCardHeader}>
                                <img 
                                  src={resolveAvatar(
                                    alum.profilePicture ||
                                    alum.profilePictureUrl ||
                                    alum.profile_picture_url
                                  )} 
                                  alt={`${alum.firstName} ${alum.lastName}`}
                                  className={styles.alumniAvatarModern}
                                  onError={(e) => { e.currentTarget.src = '/default-avatar.svg' }}
                                />
                                <div className={styles.alumniStatusBadge}>
                                  <BiBriefcase size={12} />
                                </div>
                              </div>
                              <div className={styles.alumniCardBody}>
                                <h4 className={styles.alumniNameModern}>
                                  {alum.firstName} {alum.lastName}
                                </h4>
                                <p className={styles.alumniPositionModern}>
                                  {alum.currentPosition || ''}
                                </p>
                                {alum.currentCompany && (
                                  <div className={styles.alumniCompanyTag}>
                                    <BiBuilding size={14} />
                                    <span>{alum.currentCompany}</span>
                                  </div>
                                )}
                                <div className={styles.alumniBatchModern}>
                                  {alum.branch} • Class of {alum.graduationYear}
                                </div>
                              </div>
                              <div className={styles.alumniCardFooter}>
                                <span>View Profile</span>
                                <BiChevronRight size={16} />
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Shared Professional Interests - Priority 2 */}
                    {recommendations.sharedInterests.length > 0 && (
                      <div className={styles.recGroupModern}>
                        <div className={styles.recHeader}>
                          <div className={styles.recIconBadge} style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' }}>
                            <BiStar size={20} />
                          </div>
                          <div>
                            <h3 className={styles.recTitle}>Alumni with Shared Interests</h3>
                            <p className={styles.recSubtitle}>Connect over common professional interests</p>
                          </div>
                        </div>
                        <div className={styles.alumniGridModern}>
                          {recommendations.sharedInterests.map((alum, index) => {
                            const alumInterests = alum.professionalInterests || alum.professional_interests || []
                            const userInterests = user.alumniProfile?.professionalInterests || user.alumniProfile?.professional_interests || []
                            const sharedInterests = userInterests.filter(interest => 
                              alumInterests.some(ai => ai.toLowerCase() === interest.toLowerCase())
                            )
                            
                            return (
                              <Link 
                                to={`/alumni/${alum.id}`}
                                key={alum.id} 
                                className={styles.alumniCardModern}
                                style={{ animationDelay: `${index * 0.1}s` }}
                              >
                                <div className={styles.alumniCardHeader}>
                                  <img 
                                    src={resolveAvatar(
                                      alum.profilePicture ||
                                      alum.profilePictureUrl ||
                                      alum.profile_picture_url
                                    )} 
                                    alt={`${alum.firstName} ${alum.lastName}`}
                                    className={styles.alumniAvatarModern}
                                    onError={(e) => { e.currentTarget.src = '/default-avatar.svg' }}
                                  />
                                  <div className={styles.alumniStatusBadge}>
                                    <BiStar size={12} />
                                  </div>
                                </div>
                                <div className={styles.alumniCardBody}>
                                  <h4 className={styles.alumniNameModern}>
                                    {alum.firstName} {alum.lastName}
                                  </h4>
                                  <p className={styles.alumniPositionModern}>
                                    {alum.currentPosition || ''}
                                  </p>
                                  {alum.currentCompany && (
                                    <div className={styles.alumniCompanyTag}>
                                      <BiBuilding size={14} />
                                      <span>{alum.currentCompany}</span>
                                    </div>
                                  )}
                                  {sharedInterests.length > 0 && (
                                    <p className={styles.alumniPositionModern} style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                                      Shared: {sharedInterests.slice(0, 2).join(', ')}
                                    </p>
                                  )}
                                  <div className={styles.alumniBatchModern}>
                                    {alum.branch} • Class of {alum.graduationYear}
                                  </div>
                                </div>
                                <div className={styles.alumniCardFooter}>
                                  <span>View Profile</span>
                                  <BiChevronRight size={16} />
                                </div>
                              </Link>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Similar Career Path - Priority 3 */}
                    {recommendations.similarCareerPath.length > 0 && (
                      <div className={styles.recGroupModern}>
                        <div className={styles.recHeader}>
                          <div className={styles.recIconBadge} style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' }}>
                            <BiRocket size={20} />
                          </div>
                          <div>
                            <h3 className={styles.recTitle}>Alumni with Similar Career Aspirations</h3>
                            <p className={styles.recSubtitle}>Learn from alumni who've walked a similar career path</p>
                          </div>
                        </div>
                        <div className={styles.alumniGridModern}>
                          {recommendations.similarCareerPath.map((alum, index) => (
                            <Link 
                              to={`/alumni/${alum.id}`}
                              key={alum.id} 
                              className={styles.alumniCardModern}
                              style={{ animationDelay: `${index * 0.1}s` }}
                            >
                              <div className={styles.alumniCardHeader}>
                                <img 
                                  src={resolveAvatar(
                                    alum.profilePicture ||
                                    alum.profilePictureUrl ||
                                    alum.profile_picture_url
                                  )} 
                                  alt={`${alum.firstName} ${alum.lastName}`}
                                  className={styles.alumniAvatarModern}
                                  onError={(e) => { e.currentTarget.src = '/default-avatar.svg' }}
                                />
                                <div className={styles.alumniStatusBadge}>
                                  <BiRocket size={12} />
                                </div>
                              </div>
                              <div className={styles.alumniCardBody}>
                                <h4 className={styles.alumniNameModern}>
                                  {alum.firstName} {alum.lastName}
                                </h4>
                                <p className={styles.alumniPositionModern}>
                                  {alum.currentPosition || ''}
                                </p>
                                {alum.currentCompany && (
                                  <div className={styles.alumniCompanyTag}>
                                    <BiBuilding size={14} />
                                    <span>{alum.currentCompany}</span>
                                  </div>
                                )}
                                <div className={styles.alumniBatchModern}>
                                  {alum.branch} • Class of {alum.graduationYear}
                                </div>
                              </div>
                              <div className={styles.alumniCardFooter}>
                                <span>View Profile</span>
                                <BiChevronRight size={16} />
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Same Company */}
                    {recommendations.sameCompany.length > 0 && (
                      <div className={styles.recGroupModern}>
                        <div className={styles.recHeader}>
                          <div className={styles.recIconBadge} style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                            <BiBuilding size={20} />
                          </div>
                          <div>
                            <h3 className={styles.recTitle}>Alumni at {user.alumniProfile?.currentCompany || user.alumniProfile?.current_company}</h3>
                            <p className={styles.recSubtitle}>Connect with colleagues from your company</p>
                          </div>
                        </div>
                        <div className={styles.alumniGridModern}>
                          {recommendations.sameCompany.map((alum, index) => (
                            <Link 
                              to={`/alumni/${alum.id}`}
                              key={alum.id} 
                              className={styles.alumniCardModern}
                              style={{ animationDelay: `${index * 0.1}s` }}
                            >
                              <div className={styles.alumniCardHeader}>
                                <img 
                                  src={resolveAvatar(
                                    alum.profilePicture ||
                                    alum.profilePictureUrl ||
                                    alum.profile_picture_url
                                  )} 
                                  alt={`${alum.firstName} ${alum.lastName}`}
                                  className={styles.alumniAvatarModern}
                                  onError={(e) => { e.currentTarget.src = '/default-avatar.svg' }}
                                />
                                <div className={styles.alumniStatusBadge}>
                                  <BiBuilding size={12} />
                                </div>
                              </div>
                              <div className={styles.alumniCardBody}>
                                <h4 className={styles.alumniNameModern}>
                                  {alum.firstName} {alum.lastName}
                                </h4>
                                <p className={styles.alumniPositionModern}>
                                  {alum.currentPosition || ''}
                                </p>
                                <div className={styles.alumniBatchModern}>
                                  {alum.branch} • Class of {alum.graduationYear}
                                </div>
                              </div>
                              <div className={styles.alumniCardFooter}>
                                <span>View Profile</span>
                                <BiChevronRight size={16} />
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Same Batch - Priority 5 */}
                    {recommendations.sameBatch.length > 0 && (
                      <div className={styles.recGroupModern}>
                        <div className={styles.recHeader}>
                          <div className={styles.recIconBadge} style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)' }}>
                            <BiGroup size={20} />
                          </div>
                          <div>
                            <h3 className={styles.recTitle}>Your Batchmates (Class of {user.alumniProfile?.graduationYear || user.alumniProfile?.graduation_year})</h3>
                            <p className={styles.recSubtitle}>Reconnect with your batch peers</p>
                          </div>
                        </div>
                        <div className={styles.alumniGridModern}>
                          {recommendations.sameBatch.map((alum, index) => (
                            <Link 
                              to={`/alumni/${alum.id}`}
                              key={alum.id} 
                              className={styles.alumniCardModern}
                              style={{ animationDelay: `${index * 0.1}s` }}
                            >
                              <div className={styles.alumniCardHeader}>
                                <img 
                                  src={resolveAvatar(
                                    alum.profilePicture ||
                                    alum.profilePictureUrl ||
                                    alum.profile_picture_url
                                  )} 
                                  alt={`${alum.firstName} ${alum.lastName}`}
                                  className={styles.alumniAvatarModern}
                                  onError={(e) => { e.currentTarget.src = '/default-avatar.svg' }}
                                />
                                <div className={styles.alumniStatusBadge}>
                                  <BiGroup size={12} />
                                </div>
                              </div>
                              <div className={styles.alumniCardBody}>
                                <h4 className={styles.alumniNameModern}>
                                  {alum.firstName} {alum.lastName}
                                </h4>
                                <p className={styles.alumniPositionModern}>
                                  {alum.currentPosition || ''}
                                </p>
                                {alum.currentCompany && (
                                  <div className={styles.alumniCompanyTag}>
                                    <BiBuilding size={14} />
                                    <span>{alum.currentCompany}</span>
                                  </div>
                                )}
                                {alum.currentCity && (
                                  <p className={styles.alumniPositionModern} style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                                    <BiMapPin size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                                    {alum.currentCity}{alum.currentState && `, ${alum.currentState}`}
                                  </p>
                                )}
                                <div className={styles.alumniBatchModern}>
                                  {alum.branch} • Class of {alum.graduationYear}
                                </div>
                              </div>
                              <div className={styles.alumniCardFooter}>
                                <span>View Profile</span>
                                <BiChevronRight size={16} />
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
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


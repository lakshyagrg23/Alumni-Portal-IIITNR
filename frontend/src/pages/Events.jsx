import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import UpcomingEvents from '../components/events/UpcomingEvents';
import RecentEvents from '../components/events/RecentEvents';
import VolunteerProposalNew from '../components/events/VolunteerProposalNew';
import { registerForEvent } from '../services/eventService';
import styles from './Events.module.css';

const Events = () => {
  const navigate = useNavigate();
  const [showVolunteerModal, setShowVolunteerModal] = useState(false);
  const [notification, setNotification] = useState(null);

  const handleEventClick = (eventId) => {
    // Navigate to event detail page (will be implemented later)
    navigate(`/events/${eventId}`);
  };

  const handleRegister = async (event) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setNotification({
          type: 'error',
          message: 'Please log in to register for events.'
        });
        setTimeout(() => navigate('/login'), 2000);
        return;
      }

      // For now, just show a success message
      // In a real implementation, you might show a registration form first
      const response = await registerForEvent(event.id, {
        motivation: 'Interested in participating',
        relevant_experience: ''
      });

      if (response.success) {
        setNotification({
          type: 'success',
          message: `Successfully registered for "${event.title}"! You will receive confirmation details soon.`
        });
      } else {
        setNotification({
          type: 'error',
          message: response.message || 'Registration failed. Please try again.'
        });
      }
    } catch (error) {
      console.error('Registration error:', error);
      setNotification({
        type: 'error',
        message: 'Registration failed. Please try again.'
      });
    }

    // Clear notification after 5 seconds
    setTimeout(() => setNotification(null), 5000);
  };

  const handleVolunteerSuccess = (proposalData) => {
    setNotification({
      type: 'success',
      message: 'Your event proposal has been submitted successfully! Our team will review it and get back to you soon.'
    });
    setTimeout(() => setNotification(null), 5000);
  };

  const clearNotification = () => {
    setNotification(null);
  };

  return (
    <>
      <Helmet>
        <title>Events - IIIT Naya Raipur Alumni Portal</title>
        <meta name="description" content="Discover upcoming events, browse past event reports, and volunteer to conduct your own events at IIIT Naya Raipur Alumni Portal." />
      </Helmet>
      
      <div className={styles.eventsPage}>
        {/* Page Header */}
        <div className={styles.pageHeader}>
          <div className={styles.headerContent}>
            <h1 className={styles.pageTitle}>Events & Activities</h1>
            <p className={styles.pageDescription}>
              Stay connected with your alma mater through workshops, webinars, volunteer opportunities, and networking events.
            </p>
            
            <button
              className={styles.volunteerBtn}
              onClick={() => setShowVolunteerModal(true)}
            >
              🙋‍♂️ Volunteer to Conduct an Event
            </button>
          </div>
        </div>

        {/* Notification */}
        {notification && (
          <div className={`${styles.notification} ${styles[notification.type]}`}>
            <div className={styles.notificationContent}>
              <span>{notification.message}</span>
              <button
                className={styles.notificationClose}
                onClick={clearNotification}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Events Content */}
        <div className={styles.eventsContent}>
          {/* Upcoming Events Section */}
          <section className={styles.eventsSection}>
            <UpcomingEvents
              onEventClick={handleEventClick}
              onRegister={handleRegister}
            />
          </section>

          {/* Recent Events Section */}
          <section className={styles.eventsSection}>
            <RecentEvents
              onEventClick={handleEventClick}
            />
          </section>
        </div>

        {/* Quick Stats */}
        <div className={styles.quickStats}>
          <div className={styles.statsContainer}>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>📅</div>
              <div className={styles.statValue}>50+</div>
              <div className={styles.statLabel}>Events Conducted</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>👥</div>
              <div className={styles.statValue}>2000+</div>
              <div className={styles.statLabel}>Participants</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>🎯</div>
              <div className={styles.statValue}>95%</div>
              <div className={styles.statLabel}>Satisfaction Rate</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>🤝</div>
              <div className={styles.statValue}>100+</div>
              <div className={styles.statLabel}>Volunteer Speakers</div>
            </div>
          </div>
        </div>

        {/* Volunteer Modal */}
        {showVolunteerModal && (
          <VolunteerProposalNew
            onClose={() => setShowVolunteerModal(false)}
            onSuccess={handleVolunteerSuccess}
          />
        )}
      </div>
    </>
  );
};

export default Events;

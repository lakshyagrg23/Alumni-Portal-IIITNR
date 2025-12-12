import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import UpcomingEvents from '../components/events/UpcomingEvents';
import RecentEvents from '../components/events/RecentEvents';
import VolunteerProposalNew from '../components/events/VolunteerProposalNew';
import { getEventById } from '../services/eventService';
import styles from './Events.module.css';

const Events = () => {
  const navigate = useNavigate();
  const [showVolunteerModal, setShowVolunteerModal] = useState(false);
  const [notification, setNotification] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  const closeDetails = () => {
    setSelectedEvent(null);
    setDetailError(null);
    setDetailLoading(false);
  };

  const handleEventClick = async (eventId) => {
    try {
      setDetailLoading(true);
      setDetailError(null);
      const res = await getEventById(eventId);
      if (res.success) {
        setSelectedEvent(res.data || res.event || res);
      } else {
        setDetailError(res.message || 'Unable to load event details.');
      }
    } catch (err) {
      console.error('Load event details error:', err);
      setDetailError('Unable to load event details.');
    } finally {
      setDetailLoading(false);
    }
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

        {/* Event Details Modal */}
        {(selectedEvent || detailLoading || detailError) && (
          <div className={styles.modalOverlay} onClick={closeDetails}>
            <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
              <button className={styles.modalClose} onClick={closeDetails} aria-label="Close">
                ✕
              </button>
              
              {detailLoading && (
                <div className={styles.modalLoading}>
                  <div className={styles.spinner}></div>
                  <p>Loading event details...</p>
                </div>
              )}

              {detailError && !detailLoading && (
                <div className={styles.modalError}>
                  <p>{detailError}</p>
                </div>
              )}

              {selectedEvent && !detailLoading && !detailError && (
                <div className={styles.modalContent}>
                  <div className={styles.modalHeader}>
                    <span className={styles.badge}>{selectedEvent.event_type || selectedEvent.type || 'Event'}</span>
                    <h3>{selectedEvent.title}</h3>
                    <p className={styles.subtext}>{selectedEvent.description}</p>
                  </div>

                  <div className={styles.metaGrid}>
                    <div className={styles.metaItem}>
                      <span>📅 Date</span>
                      <strong>{new Date(selectedEvent.start_datetime || selectedEvent.startDateTime).toLocaleString()}</strong>
                    </div>
                    {selectedEvent.end_datetime && (
                      <div className={styles.metaItem}>
                        <span>🕒 Ends</span>
                        <strong>{new Date(selectedEvent.end_datetime).toLocaleString()}</strong>
                      </div>
                    )}
                    {selectedEvent.mode && (
                      <div className={styles.metaItem}>
                        <span>🎯 Mode</span>
                        <strong>{selectedEvent.mode}</strong>
                      </div>
                    )}
                    {selectedEvent.location && (
                      <div className={styles.metaItem}>
                        <span>📍 Location</span>
                        <strong>{selectedEvent.location}</strong>
                      </div>
                    )}
                    {selectedEvent.experience_level && (
                      <div className={styles.metaItem}>
                        <span>🎓 Audience</span>
                        <strong>{selectedEvent.experience_level}</strong>
                      </div>
                    )}
                    {selectedEvent.status && (
                      <div className={styles.metaItem}>
                        <span>⚡ Status</span>
                        <strong>{selectedEvent.status}</strong>
                      </div>
                    )}
                  </div>

                  {selectedEvent.description && (
                    <div className={styles.detailBox}>
                      <h4>About this event</h4>
                      <p>{selectedEvent.description}</p>
                    </div>
                  )}

                  {selectedEvent.requirements && (
                    <div className={styles.detailBox}>
                      <h4>Requirements</h4>
                      <p>{selectedEvent.requirements}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Events;

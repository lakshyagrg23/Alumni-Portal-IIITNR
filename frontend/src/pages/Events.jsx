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
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' or 'recent'
  const [categoryFilter, setCategoryFilter] = useState('all');

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

  const SkeletonEventCard = () => (
    <div className={styles.skeletonCard}>
      <div className={styles.skeletonImage}></div>
      <div className={styles.skeletonContent}>
        <div className={styles.skeletonBadge}></div>
        <div className={styles.skeletonTitle}></div>
        <div className={styles.skeletonText}></div>
        <div className={styles.skeletonFooter}></div>
      </div>
    </div>
  );

  return (
    <>
      <Helmet>
        <title>Events - IIIT Naya Raipur Alumni Portal</title>
        <meta name="description" content="Discover upcoming events, browse past event reports, and volunteer to conduct your own events at IIIT Naya Raipur Alumni Portal." />
      </Helmet>
      
      <div className={styles.eventsPage}>
        {/* Hero Section */}
        <section className={styles.heroSection}>
          <div className={styles.heroContent}>
            <div className={styles.heroText}>
              <h1 className={styles.heroTitle}>Events & Activities</h1>
              <p className={styles.heroSubtitle}>
                Connect, learn, and grow with IIIT Naya Raipur's vibrant community through engaging events and workshops.
              </p>
            </div>
            <button
              className={styles.ctaButton}
              onClick={() => setShowVolunteerModal(true)}
            >
              Propose Your Event
            </button>
          </div>
        </section>

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

        {/* Filters and Tabs */}
        <div className={styles.controlsSection}>
          <div className={styles.controlsContainer}>
            <div className={styles.tabsRow}>
              <button
                className={`${styles.tab} ${activeTab === 'upcoming' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('upcoming')}
              >
                Upcoming Events
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'recent' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('recent')}
              >
                Past Events
              </button>
            </div>
            
            <div className={styles.filterRow}>
              <label className={styles.filterLabel}>Category:</label>
              <select
                className={styles.filterSelect}
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">All Events</option>
                <option value="workshop">Workshops</option>
                <option value="webinar">Webinars</option>
                <option value="networking">Networking</option>
                <option value="seminar">Seminars</option>
              </select>
            </div>
          </div>
        </div>

        {/* Events Content */}
        <div className={styles.eventsContent}>
          {activeTab === 'upcoming' ? (
            <section className={styles.eventsSection}>
              <UpcomingEvents onEventClick={handleEventClick} />
            </section>
          ) : (
            <section className={styles.eventsSection}>
              <RecentEvents onEventClick={handleEventClick} />
            </section>
          )}
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
                      <span> Date</span>
                      <strong>{new Date(selectedEvent.start_datetime || selectedEvent.startDateTime).toLocaleString()}</strong>
                    </div>
                    {selectedEvent.end_datetime && (
                      <div className={styles.metaItem}>
                        <span> Ends</span>
                        <strong>{new Date(selectedEvent.end_datetime).toLocaleString()}</strong>
                      </div>
                    )}
                    {selectedEvent.mode && (
                      <div className={styles.metaItem}>
                        <span> Mode</span>
                        <strong>{selectedEvent.mode}</strong>
                      </div>
                    )}
                    {selectedEvent.location && (
                      <div className={styles.metaItem}>
                        <span> Location</span>
                        <strong>{selectedEvent.location}</strong>
                      </div>
                    )}
                    {selectedEvent.experience_level && (
                      <div className={styles.metaItem}>
                        <span> Audience</span>
                        <strong>{selectedEvent.experience_level}</strong>
                      </div>
                    )}
                    {selectedEvent.status && (
                      <div className={styles.metaItem}>
                        <span> Status</span>
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

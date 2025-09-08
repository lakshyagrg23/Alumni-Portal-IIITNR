import React from 'react';
import styles from './EventCard.module.css';

/**
 * EventCard Component - Displays event information in a card format
 * @param {Object} event - Event data
 * @param {Function} onEventClick - Handler for event click
 * @param {Function} onRegister - Handler for registration (optional)
 * @param {boolean} showRegistration - Whether to show registration button
 * @param {boolean} isPastEvent - Whether this is a past event
 */
const EventCard = ({ 
  event, 
  onEventClick, 
  onRegister, 
  showRegistration = true, 
  isPastEvent = false 
}) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEventTypeClass = (type) => {
    switch (type) {
      case 'workshop': return styles.workshop;
      case 'webinar': return styles.webinar;
      case 'volunteer': return styles.volunteer;
      case 'meetup': return styles.meetup;
      default: return styles.general;
    }
  };

  const getModeIcon = (mode) => {
    switch (mode) {
      case 'online': return '💻';
      case 'offline': return '📍';
      case 'hybrid': return '🔄';
      default: return '📍';
    }
  };

  const isRegistrationOpen = () => {
    if (isPastEvent) return false;
    if (!event.registrationDeadline) return true;
    return new Date(event.registrationDeadline) > new Date();
  };

  const isEventFull = () => {
    return event.maxParticipants && event.registeredCount >= event.maxParticipants;
  };

  return (
    <div className={`${styles.eventCard} ${isPastEvent ? styles.pastEvent : ''}`}>
      <div className={styles.eventHeader}>
        <div className={`${styles.eventType} ${getEventTypeClass(event.eventType)}`}>
          {event.eventType.charAt(0).toUpperCase() + event.eventType.slice(1)}
        </div>
        <div className={styles.eventMode}>
          {getModeIcon(event.mode)} {event.mode}
        </div>
      </div>

      <div className={styles.eventContent} onClick={() => onEventClick && onEventClick(event.id)}>
        <h3 className={styles.eventTitle}>{event.title}</h3>
        
        <div className={styles.eventMeta}>
          <div className={styles.eventDate}>
            <span className={styles.icon}>📅</span>
            <span>{formatDate(event.startDatetime)}</span>
          </div>
          <div className={styles.eventTime}>
            <span className={styles.icon}>🕒</span>
            <span>{formatTime(event.startDatetime)}</span>
          </div>
        </div>

        <div className={styles.eventLocation}>
          <span className={styles.icon}>📍</span>
          <span>{event.location}</span>
        </div>

        <div className={styles.eventDescription}>
          <div 
            dangerouslySetInnerHTML={{ 
              __html: event.description?.length > 150 
                ? event.description.substring(0, 150) + '...' 
                : event.description 
            }} 
          />
        </div>

        <div className={styles.eventDetails}>
          <div className={styles.participants}>
            <span className={styles.icon}>👥</span>
            <span>
              {event.registeredCount || 0}
              {event.maxParticipants && ` / ${event.maxParticipants}`} participants
            </span>
          </div>
          
          {event.experienceLevel && (
            <div className={styles.level}>
              <span className={styles.icon}>📊</span>
              <span>{event.experienceLevel}</span>
            </div>
          )}
        </div>

        {event.organizerDisplayName && (
          <div className={styles.organizer}>
            <span className={styles.icon}>👤</span>
            <span>Organized by {event.organizerDisplayName}</span>
          </div>
        )}
      </div>

      {showRegistration && !isPastEvent && (
        <div className={styles.eventActions}>
          {isEventFull() ? (
            <button className={`${styles.registerBtn} ${styles.disabled}`} disabled>
              Event Full
            </button>
          ) : !isRegistrationOpen() ? (
            <button className={`${styles.registerBtn} ${styles.disabled}`} disabled>
              Registration Closed
            </button>
          ) : (
            <button 
              className={styles.registerBtn}
              onClick={(e) => {
                e.stopPropagation();
                onRegister && onRegister(event);
              }}
            >
              Register Now
            </button>
          )}
          
          <button 
            className={styles.viewDetailsBtn}
            onClick={(e) => {
              e.stopPropagation();
              onEventClick && onEventClick(event.id);
            }}
          >
            View Details
          </button>
        </div>
      )}

      {isPastEvent && (
        <div className={styles.eventActions}>
          <button 
            className={styles.viewDetailsBtn}
            onClick={(e) => {
              e.stopPropagation();
              onEventClick && onEventClick(event.id);
            }}
          >
            View Report
          </button>
        </div>
      )}
    </div>
  );
};

export default EventCard;

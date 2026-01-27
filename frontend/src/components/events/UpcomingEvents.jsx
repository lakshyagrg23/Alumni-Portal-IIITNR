import React, { useState, useEffect } from 'react';
import EventCard from './EventCard';
import { getUpcomingEvents } from '../../services/eventService';
import styles from './UpcomingEvents.module.css';

/**
 * UpcomingEvents Component - Displays upcoming events with filtering
 */
const UpcomingEvents = ({ onEventClick }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    event_type: '',
    mode: '',
    experience_level: '',
    search: ''
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    total: 0
  });

  useEffect(() => {
    fetchEvents();
  }, [filters, pagination.currentPage]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        ...filters,
        page: pagination.currentPage,
        limit: 9
      };

      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
      });

      const response = await getUpcomingEvents(params);
      
      if (response.success) {
        setEvents(response.data);
        setPagination(prev => ({
          ...prev,
          totalPages: response.pagination.pages,
          total: response.pagination.total
        }));
      } else {
        setError('Failed to fetch upcoming events');
      }
    } catch (err) {
      console.error('Error fetching upcoming events:', err);
      setError('Failed to load upcoming events. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setPagination(prev => ({
      ...prev,
      currentPage: 1
    }));
  };

  const handlePageChange = (page) => {
    setPagination(prev => ({
      ...prev,
      currentPage: page
    }));
  };

  const clearFilters = () => {
    setFilters({
      event_type: '',
      mode: '',
      experience_level: '',
      search: ''
    });
    setPagination(prev => ({
      ...prev,
      currentPage: 1
    }));
  };

  if (loading) {
    return (
      <div className={styles.upcomingEvents}>
        <h2 className={styles.sectionTitle}>Upcoming Events</h2>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading upcoming events...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.upcomingEvents}>
        <h2 className={styles.sectionTitle}>Upcoming Events</h2>
        <div className={styles.error}>
          <p>{error}</p>
          <button onClick={fetchEvents} className={styles.retryBtn}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.upcomingEvents}>
      <div className={styles.header}>
        <h2 className={styles.sectionTitle}>Upcoming Events</h2>
        <p className={styles.sectionDescription}>
          Discover and register for upcoming workshops, webinars, and volunteer opportunities
        </p>
      </div>

      {/* Filters */}
      <div className={styles.filtersContainer}>
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label htmlFor="search">Search Events:</label>
            <input
              id="search"
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Search by title or description..."
              className={styles.searchInput}
            />
          </div>

          <div className={styles.filterGroup}>
            <label htmlFor="eventType">Event Type:</label>
            <select
              id="eventType"
              value={filters.event_type}
              onChange={(e) => handleFilterChange('event_type', e.target.value)}
              className={styles.filterSelect}
            >
              <option value="">All Types</option>
              <option value="workshop">Workshop</option>
              <option value="webinar">Webinar</option>
              <option value="volunteer">Volunteer</option>
              <option value="meetup">Meetup</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label htmlFor="mode">Mode:</label>
            <select
              id="mode"
              value={filters.mode}
              onChange={(e) => handleFilterChange('mode', e.target.value)}
              className={styles.filterSelect}
            >
              <option value="">All Modes</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label htmlFor="level">Experience Level:</label>
            <select
              id="level"
              value={filters.experience_level}
              onChange={(e) => handleFilterChange('experience_level', e.target.value)}
              className={styles.filterSelect}
            >
              <option value="">All Levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="all">All Levels</option>
            </select>
          </div>

          <button onClick={clearFilters} className={styles.clearFiltersBtn}>
            Clear Filters
          </button>
        </div>
      </div>

      {/* Results Summary */}
      <div className={styles.resultsInfo}>
        <p>
          Showing {events.length} of {pagination.total} upcoming events
          {Object.values(filters).some(filter => filter) && ' (filtered)'}
        </p>
      </div>

      {/* Events Grid */}
      {events.length === 0 ? (
        <div className={styles.noEvents}>
          <div className={styles.noEventsIcon}>📅</div>
          <h3>No Upcoming Events Found</h3>
          <p>
            {Object.values(filters).some(filter => filter)
              ? 'Try adjusting your filters to see more events.'
              : 'There are currently no upcoming events scheduled. Check back soon!'
            }
          </p>
        </div>
      ) : (
        <>
          <div className={styles.eventsGrid}>
            {events.map(event => (
              <EventCard
                key={event.id}
                event={event}
                onEventClick={onEventClick}
                showRegistration={false}
                isPastEvent={false}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
                className={styles.paginationBtn}
              >
                Previous
              </button>

              <div className={styles.pageNumbers}>
                {[...Array(pagination.totalPages)].map((_, index) => {
                  const page = index + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`${styles.pageBtn} ${
                        page === pagination.currentPage ? styles.active : ''
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
                className={styles.paginationBtn}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default UpcomingEvents;

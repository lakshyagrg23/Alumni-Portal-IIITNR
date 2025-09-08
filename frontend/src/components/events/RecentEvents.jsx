import React, { useState, useEffect } from 'react';
import EventCard from './EventCard';
import { getPastEvents } from '../../services/eventService';
import styles from './RecentEvents.module.css';

/**
 * RecentEvents Component - Displays past events with their reports
 */
const RecentEvents = ({ onEventClick }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    event_type: '',
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
        limit: 6,
        sortBy: 'start_datetime',
        sortOrder: 'DESC'
      };

      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
      });

      const response = await getPastEvents(params);
      
      if (response.success) {
        setEvents(response.data);
        setPagination(prev => ({
          ...prev,
          totalPages: response.pagination.pages,
          total: response.pagination.total
        }));
      } else {
        setError('Failed to fetch past events');
      }
    } catch (err) {
      console.error('Error fetching past events:', err);
      setError('Failed to load past events. Please try again.');
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
      search: ''
    });
    setPagination(prev => ({
      ...prev,
      currentPage: 1
    }));
  };

  if (loading) {
    return (
      <div className={styles.recentEvents}>
        <h2 className={styles.sectionTitle}>📰 Recent Events</h2>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading recent events...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.recentEvents}>
        <h2 className={styles.sectionTitle}>📰 Recent Events</h2>
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
    <div className={styles.recentEvents}>
      <div className={styles.header}>
        <h2 className={styles.sectionTitle}>📰 Recent Events</h2>
        <p className={styles.sectionDescription}>
          Browse reports and highlights from our recent workshops, webinars, and volunteer activities
        </p>
      </div>

      {/* Filters */}
      <div className={styles.filtersContainer}>
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label htmlFor="searchPast">Search Past Events:</label>
            <input
              id="searchPast"
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Search by title or description..."
              className={styles.searchInput}
            />
          </div>

          <div className={styles.filterGroup}>
            <label htmlFor="eventTypePast">Event Type:</label>
            <select
              id="eventTypePast"
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

          <button onClick={clearFilters} className={styles.clearFiltersBtn}>
            Clear Filters
          </button>
        </div>
      </div>

      {/* Results Summary */}
      <div className={styles.resultsInfo}>
        <p>
          Showing {events.length} of {pagination.total} past events
          {Object.values(filters).some(filter => filter) && ' (filtered)'}
        </p>
      </div>

      {/* Events Grid */}
      {events.length === 0 ? (
        <div className={styles.noEvents}>
          <div className={styles.noEventsIcon}>📰</div>
          <h3>No Past Events Found</h3>
          <p>
            {Object.values(filters).some(filter => filter)
              ? 'Try adjusting your filters to see more events.'
              : 'No past events are available at the moment.'
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
                isPastEvent={true}
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

      {/* Success Stories Section */}
      {events.length > 0 && (
        <div className={styles.successStories}>
          <h3 className={styles.storiesTitle}>📈 Success Stories</h3>
          <div className={styles.storiesGrid}>
            <div className={styles.storyCard}>
              <div className={styles.storyIcon}>🎯</div>
              <h4>High Engagement</h4>
              <p>Our recent events have seen an average attendance rate of 85%, with participants actively engaging in Q&A sessions and networking activities.</p>
            </div>
            <div className={styles.storyCard}>
              <div className={styles.storyIcon}>🌟</div>
              <h4>Positive Feedback</h4>
              <p>98% of participants rated our workshops as "Excellent" or "Very Good", highlighting the quality of content and delivery.</p>
            </div>
            <div className={styles.storyCard}>
              <div className={styles.storyIcon}>🤝</div>
              <h4>Strong Network</h4>
              <p>Over 500 meaningful connections have been made through our events, fostering collaboration and mentorship opportunities.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecentEvents;

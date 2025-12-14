import React, { useState, useEffect } from 'react'
import { adminService } from '@services/adminService'
import { useAuth } from '@hooks/useAuth'
import styles from '../AdminPanel.module.css'
import EventProposals from './EventProposals'

const EventsManagement = () => {
  const initialFormState = {
    title: '',
    description: '',
    eventDate: '',
    eventTime: '',
    endDate: '',
    endTime: '',
    location: '',
    eventType: 'seminar',
    capacity: '',
    registrationRequired: false,
    registrationDeadline: '',
    isPublished: true,
  }

  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [showProposals, setShowProposals] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [formData, setFormData] = useState(initialFormState)

  // Load all events
  const loadEvents = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await adminService.getAllEvents()
      setEvents(response.data)
    } catch (err) {
      console.error('Load events error:', err)
      setError(err.message || 'Failed to load events')
    } finally {
      setLoading(false)
    }
  }

  // Handle form submit (create or update)
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.title || !formData.description || !formData.eventDate || !formData.endDate) {
      setError('Title, description, start date, and end date are required')
      return
    }

    try {
      setError(null)
      
      // Prepare event data for backend
      const eventData = {
        title: formData.title,
        description: formData.description,
        eventType: formData.eventType,
        location: formData.location,
        startDatetime: formData.eventDate + (formData.eventTime ? 'T' + formData.eventTime : 'T00:00'),
        endDatetime: formData.endDate + (formData.endTime ? 'T' + formData.endTime : 'T23:59'),
        registrationDeadline: formData.registrationRequired && formData.registrationDeadline ? formData.registrationDeadline : null,
        maxParticipants: formData.capacity ? parseInt(formData.capacity) : null,
        isPublished: formData.isPublished,
      }
      
      if (editingEvent) {
        // Update existing event
        await adminService.updateEvent(editingEvent.id, eventData)
      } else {
        // Create new event
        await adminService.createEvent(eventData)
      }
      
      // Reset form and reload events
      setFormData(initialFormState)
      setEditingEvent(null)
      setShowForm(false)
      setShowEditModal(false)
      await loadEvents()
      
    } catch (err) {
      console.error('Submit event error:', err)
      setError(err.message || 'Failed to save event')
    }
  }

  // Handle edit
  const handleEdit = (event) => {
    setEditingEvent(event)
    
    // Parse datetime fields
    const startDateTime = event.start_datetime ? new Date(event.start_datetime) : null
    const endDateTime = event.end_datetime ? new Date(event.end_datetime) : null
    
    setFormData({
      title: event.title,
      description: event.description,
      eventDate: startDateTime ? startDateTime.toISOString().split('T')[0] : '',
      eventTime: startDateTime ? startDateTime.toTimeString().slice(0, 5) : '',
      endDate: endDateTime ? endDateTime.toISOString().split('T')[0] : '',
      endTime: endDateTime ? endDateTime.toTimeString().slice(0, 5) : '',
      location: event.location || '',
      eventType: event.event_type,
      capacity: event.max_participants || '',
      registrationRequired: !!event.registration_deadline,
      registrationDeadline: event.registration_deadline ? new Date(event.registration_deadline).toISOString().split('T')[0] : '',
      isPublished: event.is_published,
    })
    setShowForm(false)
    setShowEditModal(true)
  }

  // Handle delete
  const handleDelete = async (eventId) => {
    if (!window.confirm('Are you sure you want to delete this event?')) {
      return
    }

    try {
      await adminService.deleteEvent(eventId)
      await loadEvents()
    } catch (err) {
      console.error('Delete event error:', err)
      setError(err.message || 'Failed to delete event')
    }
  }

  // Cancel editing
  const handleCancel = () => {
    setFormData(initialFormState)
    setEditingEvent(null)
    setShowForm(false)
    setShowEditModal(false)
    setError(null)
  }

  // Format date and time
  const formatDateTime = (dateString, timeString = null) => {
    const date = new Date(dateString)
    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }
    
    let formatted = date.toLocaleDateString('en-US', options)
    if (timeString) {
      formatted += ` at ${timeString}`
    }
    return formatted
  }

  // Format event duration
  const formatEventDuration = (event) => {
    const startDateTime = new Date(event.start_datetime)
    const endDateTime = new Date(event.end_datetime)
    
    const startDate = startDateTime.toISOString().split('T')[0]
    const startTime = startDateTime.toTimeString().slice(0, 5)
    const endDate = endDateTime.toISOString().split('T')[0]
    const endTime = endDateTime.toTimeString().slice(0, 5)
    
    if (startDate === endDate) {
      // Same day event
      return `${startDate} ${startTime} - ${endTime}`
    } else {
      // Multi-day event
      return `${startDate} ${startTime} - ${endDate} ${endTime}`
    }
  }

  // Get upcoming events (future events only)
  const upcomingEvents = events
    .filter(event => new Date(event.start_datetime) >= new Date())
    .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
    .slice(0, 4)

  useEffect(() => {
    loadEvents()
  }, [])

  const renderEventForm = (submitLabel) => (
    <form onSubmit={handleSubmit} className={styles.eventForm}>
      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label htmlFor="title">Event Title *</label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            className={styles.formInput}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="eventType">Event Type</label>
          <select
            id="eventType"
            value={formData.eventType}
            onChange={(e) => setFormData({...formData, eventType: e.target.value})}
            className={styles.formSelect}
          >
            <option value="seminar">Seminar</option>
            <option value="workshop">Workshop</option>
            <option value="conference">Conference</option>
            <option value="networking">Networking</option>
            <option value="reunion">Reunion</option>
            <option value="webinar">Webinar</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="description">Description *</label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          className={styles.formTextarea}
          rows="4"
          required
        />
      </div>

      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label htmlFor="eventDate">Start Date *</label>
          <input
            type="date"
            id="eventDate"
            value={formData.eventDate}
            onChange={(e) => setFormData({...formData, eventDate: e.target.value})}
            className={styles.formInput}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="eventTime">Start Time</label>
          <input
            type="time"
            id="eventTime"
            value={formData.eventTime}
            onChange={(e) => setFormData({...formData, eventTime: e.target.value})}
            className={styles.formInput}
          />
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label htmlFor="endDate">End Date *</label>
          <input
            type="date"
            id="endDate"
            value={formData.endDate}
            onChange={(e) => setFormData({...formData, endDate: e.target.value})}
            className={styles.formInput}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="endTime">End Time</label>
          <input
            type="time"
            id="endTime"
            value={formData.endTime}
            onChange={(e) => setFormData({...formData, endTime: e.target.value})}
            className={styles.formInput}
          />
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label htmlFor="location">Location</label>
          <input
            type="text"
            id="location"
            value={formData.location}
            onChange={(e) => setFormData({...formData, location: e.target.value})}
            className={styles.formInput}
            placeholder="Venue or online link"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="capacity">Capacity</label>
          <input
            type="number"
            id="capacity"
            value={formData.capacity}
            onChange={(e) => setFormData({...formData, capacity: e.target.value})}
            className={styles.formInput}
            placeholder="Max attendees"
            min="1"
          />
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={formData.registrationRequired}
              onChange={(e) => setFormData({...formData, registrationRequired: e.target.checked})}
            />
            Registration Required
          </label>
        </div>

        {formData.registrationRequired && (
          <div className={styles.formGroup}>
            <label htmlFor="registrationDeadline">Registration Deadline</label>
            <input
              type="date"
              id="registrationDeadline"
              value={formData.registrationDeadline}
              onChange={(e) => setFormData({...formData, registrationDeadline: e.target.value})}
              className={styles.formInput}
            />
          </div>
        )}
      </div>

      <div className={styles.formGroup}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={formData.isPublished}
            onChange={(e) => setFormData({...formData, isPublished: e.target.checked})}
          />
            Publish immediately
        </label>
      </div>

      <div className={styles.formActions}>
        <button type="submit" className={styles.submitButton}>
          {submitLabel}
        </button>
        <button type="button" onClick={handleCancel} className={styles.cancelButton}>
          Cancel
        </button>
      </div>
    </form>
  )

  return (
    <div className={styles.contentManagement}>
      <div className={styles.pageHeader}>
        <h2 className={styles.pageTitle}>Events Management</h2>
        <div className={styles.headerActions}>
          <button
            className={styles.primaryButton}
            onClick={() => {
              setEditingEvent(null)
              setFormData(initialFormState)
              setShowEditModal(false)
              setShowForm(!showForm)
              setShowProposals(false)
            }}
          >
            {showForm ? 'Cancel' : 'Add Event'}
          </button>
          {user?.role === 'superadmin' && (
            <button
              className={styles.secondaryButton}
              onClick={() => { setShowProposals(!showProposals); setShowForm(false); }}
              style={{ marginLeft: '0.5rem' }}
            >
              {showProposals ? 'Hide Proposals' : 'View Proposals'}
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}

      {/* Event Form */}
      {showForm && (
        <div className={styles.formContainer}>
          <h3>{editingEvent ? 'Edit Event' : 'Create Event'}</h3>
          {renderEventForm(editingEvent ? 'Update Event' : 'Create Event')}
        </div>
      )}

      {/* Either show proposals or the events lists */}
      {showProposals ? (
        <EventProposals />
      ) : (
        <div>
          {/* Upcoming Events Section */}
          <div className={styles.upcomingEventsSection}>
          <h3>Upcoming Events (4 next events)</h3>
          {upcomingEvents.length === 0 ? (
            <p className={styles.emptyState}>No upcoming events found</p>
          ) : (
            <div className={styles.eventsGrid}>
              {upcomingEvents.map((event) => (
                <div key={event.id} className={styles.eventCard}>
                  <div className={styles.eventCardHeader}>
                    <h4>{event.title}</h4>
                    <span className={`${styles.eventTypeBadge} ${styles[event.event_type]}`}>
                      {event.event_type}
                    </span>
                  </div>
                  <p className={styles.eventDescription}>
                    {event.description.substring(0, 100) + '...'}
                  </p>
                  <div className={styles.eventDetails}>
                    <div className={styles.eventDate}>
                      📅 {formatEventDuration(event)}
                    </div>
                    {event.location && (
                      <div className={styles.eventLocation}>
                        📍 {event.location}
                      </div>
                    )}
                    {event.max_participants && (
                      <div className={styles.eventCapacity}>
                        👥 Max {event.max_participants} attendees
                      </div>
                    )}
                  </div>
                  <div className={styles.eventCardFooter}>
                    <span className={`${styles.statusBadge} ${event.is_published ? styles.published : styles.draft}`}>
                      {event.is_published ? 'Published' : 'Draft'}
                    </span>
                    {event.registration_required && (
                      <span className={styles.registrationBadge}>
                        Registration Required
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

          {/* All Events List */}
          <div className={styles.eventsListSection}>
            <h3>All Events ({events.length})</h3>
            
            {loading ? (
              <div className={styles.loadingSpinner}>
                <div className={styles.spinner}></div>
              </div>
            ) : events.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No events found. Create your first event!</p>
              </div>
            ) : (
              <div className={styles.eventsTable}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>Type</th>
                      <th>Duration</th>
                      <th>Location</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event) => (
                      <tr key={event.id}>
                        <td>
                          <div className={styles.eventTitle}>
                            {event.title}
                            <div className={styles.eventSubtitle}>
                              {event.description.substring(0, 50) + '...'}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`${styles.eventTypeBadge} ${styles[event.event_type]}`}>
                            {event.event_type}
                          </span>
                        </td>
                        <td>{formatEventDuration(event)}</td>
                        <td>{event.location || 'TBD'}</td>
                        <td>
                          <div className={styles.statusColumn}>
                            <span className={`${styles.statusBadge} ${event.is_published ? styles.published : styles.draft}`}>
                              {event.is_published ? 'Published' : 'Draft'}
                            </span>
                            {event.registration_required && (
                              <span className={styles.registrationBadge}>
                                Reg. Required
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className={styles.actionButtons}>
                            <button
                              onClick={() => handleEdit(event)}
                              className={`${styles.actionButton} ${styles.edit}`}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(event.id)}
                              className={`${styles.actionButton} ${styles.delete}`}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className={styles.modalBackdrop} onClick={handleCancel}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.eyebrow}>Edit</p>
                <h3>Edit Event</h3>
              </div>
              <button
                type="button"
                className={styles.modalCloseButton}
                onClick={handleCancel}
              >
                ×
              </button>
            </div>
            {renderEventForm('Update Event')}
          </div>
        </div>
      )}
    </div>
  )
}

export default EventsManagement

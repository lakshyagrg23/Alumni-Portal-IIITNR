import React, { useState } from 'react';
import { submitEventProposal } from '../../services/eventService';
import styles from './VolunteerProposal.module.css';
import { useAuth } from '../../context/AuthContext';

/**
 * VolunteerProposal Component - Form for alumni to propose conducting events
 */
const VolunteerProposal = ({ onClose, onSuccess }) => {
  const { user } = useAuth() || {};
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'workshop',
    mode: 'hybrid',
    // admin-like fields
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    location: '',
    capacity: 30,
    registrationRequired: false,
    registrationDeadline: '',
    required_resources: '',
    proposed_dates: '',
    motivation: '',
    relevant_experience: '',
    // legacy fields used by inputs
    duration_hours: 2,
    experience_level: 'intermediate',
    max_participants: 30,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Validate required fields
      if (!formData.title.trim() || !formData.description.trim() || !formData.motivation.trim()) {
        setError('Please fill in all required fields.');
        setLoading(false);
        return;
      }

      // Map form values to backend expected fields
      const payload = {
        title: formData.title,
        description: formData.description,
        eventType: formData.event_type, // backend expects camelCase
        mode: formData.mode,
        location: formData.location || null,
        // combine date + time into ISO-like strings similar to admin form
        startDateTime: formData.startDate ? (formData.startDate + (formData.startTime ? 'T' + formData.startTime : 'T00:00')) : null,
        endDateTime: formData.endDate ? (formData.endDate + (formData.endTime ? 'T' + formData.endTime : 'T23:59')) : null,
        registrationDeadline: formData.registrationRequired && formData.registrationDeadline ? formData.registrationDeadline : null,
        maxParticipants: formData.max_participants ? parseInt(formData.max_participants) : (formData.capacity ? parseInt(formData.capacity) : null),
        requiredSkills: formData.required_resources ? formData.required_resources.split(',').map(s => s.trim()).filter(Boolean) : [],
        experienceLevel: formData.experience_level || 'all',
        agenda: '',
        requirements: '',
        benefits: '',
        contactEmail: user?.email || null,
        contactPhone: null,
        organizerId: user?.id || null,
        organizerName: (user && (user.first_name || user.name || user.email)) || null,
        // keep as a proposal
        status: 'pending',
        isPublished: false,
        requiresApproval: true,
      };

      const response = await submitEventProposal(payload);

      if (response.success) {
        onSuccess && onSuccess(response.data);
        onClose && onClose();
      } else {
        setError(response.message || 'Failed to submit proposal');
      }
    } catch (err) {
      console.error('Error submitting proposal:', err);
      setError('Failed to submit proposal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2>🙋‍♂️ Volunteer to Conduct an Event</h2>
          <button 
            className={styles.closeBtn} 
            onClick={onClose}
            disabled={loading}
          >
            ✕
          </button>
        </div>

        <div className={styles.modalBody}>
          <p className={styles.description}>
            Share your expertise with fellow alumni and students! Propose an event you'd like to organize or conduct.
          </p>

          {error && (
            <div className={styles.error}>
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.proposalForm}>
            {/* Basic Event Information */}
            <div className={styles.formSection}>
              <h3>Event Details</h3>
              
              <div className={styles.formGroup}>
                <label htmlFor="title">Event Title *</label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g., Advanced React.js Workshop"
                  required
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="event_type">Event Type *</label>
                  <select
                    id="event_type"
                    name="event_type"
                    value={formData.event_type}
                    onChange={handleInputChange}
                    required
                    className={styles.formSelect}
                  >
                    <option value="workshop">Workshop</option>
                    <option value="webinar">Webinar</option>
                    <option value="volunteer">Volunteer Opportunity</option>
                    <option value="meetup">Meetup</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="mode">Mode *</label>
                  <select
                    id="mode"
                    name="mode"
                    value={formData.mode}
                    onChange={handleInputChange}
                    required
                    className={styles.formSelect}
                  >
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="duration_hours">Duration (Hours)</label>
                  <input
                    id="duration_hours"
                    name="duration_hours"
                    type="number"
                    min="1"
                    max="24"
                    value={formData.duration_hours}
                    onChange={handleInputChange}
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="experience_level">Experience Level</label>
                  <select
                    id="experience_level"
                    name="experience_level"
                    value={formData.experience_level}
                    onChange={handleInputChange}
                    className={styles.formSelect}
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                    <option value="all">All Levels</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="max_participants">Max Participants</label>
                  <input
                    id="max_participants"
                    name="max_participants"
                    type="number"
                    min="5"
                    max="500"
                    value={formData.max_participants}
                    onChange={handleInputChange}
                    className={styles.formInput}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="description">Event Description *</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe what participants will learn, the agenda, and any prerequisites..."
                  required
                  rows={6}
                  className={styles.formTextarea}
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="startDate">Start Date *</label>
                  <input
                    id="startDate"
                    name="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    className={styles.formInput}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="startTime">Start Time</label>
                  <input
                    id="startTime"
                    name="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={handleInputChange}
                    className={styles.formInput}
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="endDate">End Date *</label>
                  <input
                    id="endDate"
                    name="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    className={styles.formInput}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="endTime">End Time</label>
                  <input
                    id="endTime"
                    name="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={handleInputChange}
                    className={styles.formInput}
                  />
                </div>
              </div>
            </div>

            {/* Logistics */}
            <div className={styles.formSection}>
              <h3>Logistics</h3>
              
              <div className={styles.formGroup}>
                  <label htmlFor="location">Location</label>
                  <input
                    id="location"
                    name="location"
                    type="text"
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="Venue or online link"
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="required_resources">Required Resources</label>
                <textarea
                  id="required_resources"
                  name="required_resources"
                  value={formData.required_resources}
                  onChange={handleInputChange}
                  placeholder="e.g., Projector, Computer lab, Online meeting platform, etc."
                  rows={3}
                  className={styles.formTextarea}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="proposed_dates">Proposed Dates/Timeframes</label>
                <textarea
                  id="proposed_dates"
                  name="proposed_dates"
                  value={formData.proposed_dates}
                  onChange={handleInputChange}
                  placeholder="e.g., Weekends in March 2025, flexible with institute schedule, etc."
                  rows={3}
                  className={styles.formTextarea}
                />
              </div>
            </div>

            {/* Personal Information */}
            <div className={styles.formSection}>
              <h3>About You</h3>
              
              <div className={styles.formGroup}>
                <label htmlFor="motivation">Why do you want to conduct this event? *</label>
                <textarea
                  id="motivation"
                  name="motivation"
                  value={formData.motivation}
                  onChange={handleInputChange}
                  placeholder="Share your motivation for wanting to organize this event..."
                  required
                  rows={4}
                  className={styles.formTextarea}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="relevant_experience">Relevant Experience</label>
                <textarea
                  id="relevant_experience"
                  name="relevant_experience"
                  value={formData.relevant_experience}
                  onChange={handleInputChange}
                  placeholder="Describe your experience in this topic area, any teaching/training experience, etc."
                  rows={4}
                  className={styles.formTextarea}
                />
              </div>
            </div>

            <div className={styles.formActions}>
              <button
                type="button"
                onClick={onClose}
                className={styles.cancelBtn}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.submitBtn}
                disabled={loading}
              >
                {loading ? 'Submitting...' : 'Submit Proposal'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VolunteerProposal;

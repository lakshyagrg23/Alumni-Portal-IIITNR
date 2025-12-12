import React, { useState } from 'react';
import { submitEventProposal } from '../../services/eventService';
import styles from './VolunteerProposal.module.css';
import { useAuth } from '../../context/AuthContext';

/**
 * VolunteerProposal Component - Multi-step form for alumni to propose conducting events
 */
const VolunteerProposal = ({ onClose, onSuccess }) => {
  const { user } = useAuth() || {};
  const [currentStep, setCurrentStep] = useState(1);
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
  const [fieldErrors, setFieldErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value
    }));
    
    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateStep = (step) => {
    const errors = {};
    
    if (step === 1) {
      if (!formData.title.trim()) errors.title = 'Event title is required';
      if (!formData.description.trim()) errors.description = 'Description is required';
      if (formData.description.length < 50) errors.description = 'Please provide at least 50 characters';
      if (!formData.startDate) errors.startDate = 'Start date is required';
      if (!formData.endDate) errors.endDate = 'End date is required';
      if (formData.startDate && formData.endDate && new Date(formData.startDate) > new Date(formData.endDate)) {
        errors.endDate = 'End date must be after start date';
      }
    } else if (step === 2) {
      if (formData.mode === 'offline' && !formData.location.trim()) {
        errors.location = 'Location is required for offline events';
      }
    } else if (step === 3) {
      if (!formData.motivation.trim()) errors.motivation = 'Please share your motivation';
      if (formData.motivation.length < 30) errors.motivation = 'Please provide at least 30 characters';
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
      setError(null);
    } else {
      setError('Please fill in all required fields correctly');
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all steps before submission
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      setError('Please complete all required fields');
      return;
    }
    
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
            aria-label="Close form"
          >
            ✕
          </button>
        </div>

        {/* Progress Indicator */}
        <div className={styles.progressContainer}>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill} 
              style={{ width: `${(currentStep / 3) * 100}%` }}
            />
          </div>
          <div className={styles.steps}>
            <div className={`${styles.step} ${currentStep >= 1 ? styles.active : ''} ${currentStep > 1 ? styles.completed : ''}`}>
              <div className={styles.stepNumber}>1</div>
              <div className={styles.stepLabel}>Event Details</div>
            </div>
            <div className={`${styles.step} ${currentStep >= 2 ? styles.active : ''} ${currentStep > 2 ? styles.completed : ''}`}>
              <div className={styles.stepNumber}>2</div>
              <div className={styles.stepLabel}>Logistics</div>
            </div>
            <div className={`${styles.step} ${currentStep >= 3 ? styles.active : ''} ${currentStep > 3 ? styles.completed : ''}`}>
              <div className={styles.stepNumber}>3</div>
              <div className={styles.stepLabel}>About You</div>
            </div>
          </div>
        </div>

        <div className={styles.modalBody}>
          {currentStep === 1 && (
            <p className={styles.description}>
              📝 Share your expertise with fellow alumni and students! Let's start with the basics of your event.
            </p>
          )}
          {currentStep === 2 && (
            <p className={styles.description}>
              📍 Help us understand the logistical requirements for your event.
            </p>
          )}
          {currentStep === 3 && (
            <p className={styles.description}>
              👤 Tell us about yourself and why you'd like to conduct this event.
            </p>
          )}

          {error && (
            <div className={styles.error}>
              <p>⚠️ {error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.proposalForm}>
            {/* Step 1: Basic Event Information */}
            {currentStep === 1 && (
              <div className={styles.formSection}>
                <h3><span className={styles.sectionIcon}>📋</span> Event Details</h3>
                
                <div className={styles.formGroup}>
                  <label htmlFor="title">
                    Event Title * 
                    <span className={styles.tooltip} data-tip="Give your event a catchy, descriptive title">ℹ️</span>
                  </label>
                  <input
                    id="title"
                    name="title"
                    type="text"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="e.g., Advanced React.js Workshop"
                    required
                    className={`${styles.formInput} ${fieldErrors.title ? styles.inputError : ''}`}
                    maxLength={100}
                  />
                  {fieldErrors.title && <span className={styles.errorText}>{fieldErrors.title}</span>}
                  <span className={styles.charCount}>{formData.title.length}/100</span>
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
                      <option value="workshop">🎓 Workshop</option>
                      <option value="webinar">💻 Webinar</option>
                      <option value="volunteer">🤝 Volunteer Opportunity</option>
                      <option value="meetup">🍕 Meetup</option>
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
                      <option value="online">🌐 Online</option>
                      <option value="offline">🏢 Offline</option>
                      <option value="hybrid">🔄 Hybrid</option>
                    </select>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="description">
                    Event Description * 
                    <span className={styles.tooltip} data-tip="Describe the agenda, learning outcomes, and prerequisites">ℹ️</span>
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Describe what participants will learn, the agenda, key topics, and any prerequisites... (minimum 50 characters)"
                    required
                    rows={6}
                    className={`${styles.formTextarea} ${fieldErrors.description ? styles.inputError : ''}`}
                    maxLength={1000}
                  />
                  {fieldErrors.description && <span className={styles.errorText}>{fieldErrors.description}</span>}
                  <span className={styles.charCount}>{formData.description.length}/1000 {formData.description.length < 50 && '(min 50)'}</span>
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
                      className={`${styles.formInput} ${fieldErrors.startDate ? styles.inputError : ''}`}
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                    {fieldErrors.startDate && <span className={styles.errorText}>{fieldErrors.startDate}</span>}
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
                      className={`${styles.formInput} ${fieldErrors.endDate ? styles.inputError : ''}`}
                      min={formData.startDate || new Date().toISOString().split('T')[0]}
                      required
                    />
                    {fieldErrors.endDate && <span className={styles.errorText}>{fieldErrors.endDate}</span>}
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

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="experience_level">Experience Level</label>
                    <select
                      id="experience_level"
                      name="experience_level"
                      value={formData.experience_level}
                      onChange={handleInputChange}
                      className={styles.formSelect}
                    >
                      <option value="beginner">🌱 Beginner</option>
                      <option value="intermediate">🌿 Intermediate</option>
                      <option value="advanced">🌳 Advanced</option>
                      <option value="all">🌍 All Levels</option>
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
                      placeholder="e.g., 30"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Logistics */}
            {currentStep === 2 && (
              <div className={styles.formSection}>
                <h3><span className={styles.sectionIcon}>📍</span> Logistics</h3>
                
                <div className={styles.formGroup}>
                  <label htmlFor="location">
                    Location {formData.mode === 'offline' && '*'}
                    <span className={styles.tooltip} data-tip="Venue name, address, or online meeting platform">ℹ️</span>
                  </label>
                  <input
                    id="location"
                    name="location"
                    type="text"
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder={formData.mode === 'online' ? 'e.g., Zoom, Google Meet' : 'e.g., Seminar Hall, IIIT NR Campus'}
                    className={`${styles.formInput} ${fieldErrors.location ? styles.inputError : ''}`}
                    required={formData.mode === 'offline'}
                  />
                  {fieldErrors.location && <span className={styles.errorText}>{fieldErrors.location}</span>}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="required_resources">
                    Required Resources
                    <span className={styles.tooltip} data-tip="Equipment, software, or materials needed">ℹ️</span>
                  </label>
                  <textarea
                    id="required_resources"
                    name="required_resources"
                    value={formData.required_resources}
                    onChange={handleInputChange}
                    placeholder="e.g., Projector, Computer lab with 30 systems, Zoom Pro account, Whiteboard, etc."
                    rows={4}
                    className={styles.formTextarea}
                    maxLength={500}
                  />
                  <span className={styles.charCount}>{formData.required_resources.length}/500</span>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="proposed_dates">
                    Proposed Dates/Timeframes (Optional)
                    <span className={styles.tooltip} data-tip="Your preferred dates or flexibility">ℹ️</span>
                  </label>
                  <textarea
                    id="proposed_dates"
                    name="proposed_dates"
                    value={formData.proposed_dates}
                    onChange={handleInputChange}
                    placeholder="e.g., Weekends in March 2025, flexible with institute schedule, prefer afternoon sessions, etc."
                    rows={3}
                    className={styles.formTextarea}
                    maxLength={300}
                  />
                  <span className={styles.charCount}>{formData.proposed_dates.length}/300</span>
                </div>

                <div className={styles.infoBox}>
                  <strong>💡 Pro Tip:</strong> The more flexible you are with dates and resources, the easier it will be to schedule your event!
                </div>
              </div>
            )}

            {/* Step 3: Personal Information */}
            {currentStep === 3 && (
              <div className={styles.formSection}>
                <h3><span className={styles.sectionIcon}>👤</span> About You</h3>
                
                <div className={styles.formGroup}>
                  <label htmlFor="motivation">
                    Why do you want to conduct this event? *
                    <span className={styles.tooltip} data-tip="Share your passion and what you hope to achieve">ℹ️</span>
                  </label>
                  <textarea
                    id="motivation"
                    name="motivation"
                    value={formData.motivation}
                    onChange={handleInputChange}
                    placeholder="Share your motivation, what inspired you, and what you hope participants will gain from this event... (minimum 30 characters)"
                    required
                    rows={5}
                    className={`${styles.formTextarea} ${fieldErrors.motivation ? styles.inputError : ''}`}
                    maxLength={800}
                  />
                  {fieldErrors.motivation && <span className={styles.errorText}>{fieldErrors.motivation}</span>}
                  <span className={styles.charCount}>{formData.motivation.length}/800 {formData.motivation.length < 30 && '(min 30)'}</span>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="relevant_experience">
                    Relevant Experience (Optional)
                    <span className={styles.tooltip} data-tip="Your expertise, teaching experience, or related work">ℹ️</span>
                  </label>
                  <textarea
                    id="relevant_experience"
                    name="relevant_experience"
                    value={formData.relevant_experience}
                    onChange={handleInputChange}
                    placeholder="Describe your experience in this topic area, any teaching/training experience, certifications, professional work, projects, etc."
                    rows={5}
                    className={styles.formTextarea}
                    maxLength={800}
                  />
                  <span className={styles.charCount}>{formData.relevant_experience.length}/800</span>
                </div>

                <div className={styles.infoBox}>
                  <strong>✨ Almost there!</strong> Review your information and click Submit when ready. Our team will review your proposal within 3-5 business days.
                </div>
              </div>
            )}

            <div className={styles.formActions}>
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className={styles.prevBtn}
                  disabled={loading}
                >
                  ← Previous
                </button>
              )}
              
              <button
                type="button"
                onClick={onClose}
                className={styles.cancelBtn}
                disabled={loading}
              >
                Cancel
              </button>

              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className={styles.nextBtn}
                  disabled={loading}
                >
                  Next →
                </button>
              ) : (
                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className={styles.spinner}></span>
                      Submitting...
                    </>
                  ) : (
                    <>
                      ✓ Submit Proposal
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VolunteerProposal;

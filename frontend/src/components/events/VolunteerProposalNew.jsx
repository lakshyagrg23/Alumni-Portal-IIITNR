import React, { useState } from 'react';
import { submitEventProposal } from '../../services/eventService';
import styles from './VolunteerProposalNew.module.css';
import { useAuth } from '../../context/AuthContext';

/**
 * VolunteerProposalNew Component - Clean, modern multi-step form for event proposals
 */
const VolunteerProposalNew = ({ onClose, onSuccess }) => {
  const { user } = useAuth() || {};
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'workshop',
    mode: 'hybrid',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    location: '',
    max_participants: 50,
    unlimited_participants: false,
    experience_level: 'all',
    required_resources: '',
    proposed_dates: '',
    motivation: '',
    relevant_experience: '',
    target_audience: [],
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const toggleAudience = (value) => {
    setFormData(prev => {
      const current = new Set(prev.target_audience || []);
      if (current.has(value)) {
        current.delete(value);
      } else {
        current.add(value);
      }
      return { ...prev, target_audience: Array.from(current) };
    });
    if (errors.target_audience) {
      setErrors(prev => ({ ...prev, target_audience: '' }));
    }
  };

  const audienceOptions = [
    { value: 'all', label: 'All Students' },
    { value: 'mtech', label: 'M.Tech Students' },
    { value: 'phd', label: 'PhD Scholars' },
    { value: 'alumni', label: 'Alumni' },
    { value: 'btech_1', label: 'B.Tech Year 1' },
    { value: 'btech_2', label: 'B.Tech Year 2' },
    { value: 'btech_3', label: 'B.Tech Year 3' },
    { value: 'btech_4', label: 'B.Tech Year 4' },
  ];

  const validateStep = () => {
    const newErrors = {};

    if (currentStep === 1) {
      if (!formData.title.trim()) newErrors.title = 'Title is required';
      if (!formData.description.trim() || formData.description.length < 50) {
        newErrors.description = 'Description must be at least 50 characters';
      }
      if (!formData.startDate) newErrors.startDate = 'Start date is required';
      if (!formData.endDate) newErrors.endDate = 'End date is required';
      if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
        newErrors.endDate = 'End date must be after start date';
      }
      if (!formData.target_audience || formData.target_audience.length === 0) {
        newErrors.target_audience = 'Select at least one target audience';
      }
    } else if (currentStep === 2) {
      if ((formData.mode === 'offline' || formData.mode === 'hybrid') && !formData.location.trim()) {
        newErrors.location = 'Location is required for offline/hybrid events';
      }
    } else if (currentStep === 3) {
      if (!formData.motivation.trim() || formData.motivation.length < 30) {
        newErrors.motivation = 'Please provide at least 30 characters';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => prev - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep()) return;

    setLoading(true);
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        eventType: formData.event_type,
        mode: formData.mode,
        location: formData.location || null,
        startDateTime: formData.startDate ? `${formData.startDate}T${formData.startTime || '00:00'}` : null,
        endDateTime: formData.endDate ? `${formData.endDate}T${formData.endTime || '23:59'}` : null,
        maxParticipants: formData.unlimited_participants ? null : (parseInt(formData.max_participants) || 50),
        requiredSkills: formData.required_resources.split(',').map(s => s.trim()).filter(Boolean),
        experienceLevel: formData.experience_level,
        targetAudience: formData.target_audience,
        contactEmail: user?.email || null,
        organizerId: user?.id || null,
        organizerName: user?.first_name || user?.name || user?.email || null,
        status: 'pending',
        isPublished: false,
        requiresApproval: true,
      };

      const response = await submitEventProposal(payload);
      if (response.success) {
        onSuccess?.(response.data);
        onClose?.();
      } else {
        setErrors({ submit: response.message || 'Failed to submit proposal' });
      }
    } catch (err) {
      console.error('Error submitting proposal:', err);
      setErrors({ submit: 'Failed to submit proposal. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, title: 'Event Details', icon: '📋' },
    { number: 2, title: 'Logistics', icon: '📍' },
    { number: 3, title: 'About You', icon: '👤' }
  ];

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h2>🙋‍♂️ Volunteer to Conduct an Event</h2>
            <p>Share your expertise with the IIIT NR community</p>
          </div>
          <button 
            className={styles.closeButton} 
            onClick={onClose}
            aria-label="Close"
            disabled={loading}
          >
            ✕
          </button>
        </div>

        {/* Progress Steps */}
        <div className={styles.progress}>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill} 
              style={{ width: `${(currentStep / 3) * 100}%` }}
            />
          </div>
          <div className={styles.steps}>
            {steps.map((step) => (
              <div 
                key={step.number}
                className={`${styles.stepItem} ${
                  currentStep >= step.number ? styles.active : ''
                } ${currentStep > step.number ? styles.completed : ''}`}
              >
                <div className={styles.stepCircle}>
                  {currentStep > step.number ? '✓' : step.icon}
                </div>
                <span className={styles.stepLabel}>{step.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.content}>
            {/* Step 1: Event Details */}
            {currentStep === 1 && (
              <div className={styles.stepContent}>
                <h3 className={styles.stepTitle}>📋 Event Details</h3>
                <p className={styles.stepDescription}>
                  Tell us about the event you'd like to organize
                </p>

                <div className={styles.field}>
                  <label htmlFor="title" className={styles.label}>
                    Event Title <span className={styles.required}>*</span>
                  </label>
                  <input
                    id="title"
                    name="title"
                    type="text"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="e.g., Advanced React.js Workshop"
                    className={`${styles.input} ${errors.title ? styles.inputError : ''}`}
                    maxLength={100}
                  />
                  {errors.title && <span className={styles.error}>{errors.title}</span>}
                  <span className={styles.hint}>{formData.title.length}/100 characters</span>
                </div>

                <div className={styles.row}>
                  <div className={styles.field}>
                    <label htmlFor="event_type" className={styles.label}>Event Type</label>
                    <select
                      id="event_type"
                      name="event_type"
                      value={formData.event_type}
                      onChange={handleChange}
                      className={styles.select}
                    >
                      <option value="workshop">Workshop</option>
                      <option value="webinar">Webinar</option>
                      <option value="volunteer">Volunteer Opportunity</option>
                      <option value="meetup">Meetup</option>
                    </select>
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="mode" className={styles.label}>Mode</label>
                    <select
                      id="mode"
                      name="mode"
                      value={formData.mode}
                      onChange={handleChange}
                      className={styles.select}
                    >
                      <option value="online">Online</option>
                      <option value="offline">Offline</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </div>
                </div>

                <div className={styles.field}>
                  <label htmlFor="description" className={styles.label}>
                    Event Description <span className={styles.required}>*</span>
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Describe what participants will learn, the agenda, and any prerequisites..."
                    className={`${styles.textarea} ${errors.description ? styles.inputError : ''}`}
                    rows={5}
                    maxLength={1000}
                  />
                  {errors.description && <span className={styles.error}>{errors.description}</span>}
                  <span className={styles.hint}>
                    {formData.description.length}/1000 characters (minimum 50)
                  </span>
                </div>

                <div className={styles.row}>
                  <div className={styles.field}>
                    <label htmlFor="startDate" className={styles.label}>
                      Start Date <span className={styles.required}>*</span>
                    </label>
                    <input
                      id="startDate"
                      name="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={handleChange}
                      min={new Date().toISOString().split('T')[0]}
                      className={`${styles.input} ${errors.startDate ? styles.inputError : ''}`}
                    />
                    {errors.startDate && <span className={styles.error}>{errors.startDate}</span>}
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="startTime" className={styles.label}>Start Time</label>
                    <input
                      id="startTime"
                      name="startTime"
                      type="time"
                      value={formData.startTime}
                      onChange={handleChange}
                      className={styles.input}
                    />
                  </div>
                </div>

                <div className={styles.row}>
                  <div className={styles.field}>
                    <label htmlFor="endDate" className={styles.label}>
                      End Date <span className={styles.required}>*</span>
                    </label>
                    <input
                      id="endDate"
                      name="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={handleChange}
                      min={formData.startDate || new Date().toISOString().split('T')[0]}
                      className={`${styles.input} ${errors.endDate ? styles.inputError : ''}`}
                    />
                    {errors.endDate && <span className={styles.error}>{errors.endDate}</span>}
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="endTime" className={styles.label}>End Time</label>
                    <input
                      id="endTime"
                      name="endTime"
                      type="time"
                      value={formData.endTime}
                      onChange={handleChange}
                      className={styles.input}
                    />
                  </div>
                </div>

                <div className={styles.row}>
                  <div className={styles.field}>
                    <label className={styles.label}>Target Audience <span className={styles.required}>*</span></label>
                    <div className={styles.audienceGrid}>
                      {audienceOptions.map((option) => {
                        const checked = (formData.target_audience || []).includes(option.value);
                        return (
                          <label
                            key={option.value}
                            className={`${styles.audienceOption} ${checked ? styles.audienceOptionActive : ''}`}
                          >
                            <input
                              type="checkbox"
                              value={option.value}
                              checked={checked}
                              onChange={() => toggleAudience(option.value)}
                            />
                            <span>{option.label}</span>
                          </label>
                        );
                      })}
                    </div>
                    {errors.target_audience && <span className={styles.error}>{errors.target_audience}</span>}
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="max_participants" className={styles.label}>Max Participants</label>
                    <input
                      id="max_participants"
                      name="max_participants"
                      type="number"
                      min="5"
                      max="1000"
                      value={formData.max_participants}
                      onChange={handleChange}
                      className={styles.input}
                      disabled={formData.unlimited_participants}
                      placeholder="e.g., 50"
                    />
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        name="unlimited_participants"
                        checked={formData.unlimited_participants}
                        onChange={handleChange}
                        className={styles.checkbox}
                      />
                      <span>No limit (unlimited participants)</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Logistics */}
            {currentStep === 2 && (
              <div className={styles.stepContent}>
                <h3 className={styles.stepTitle}>📍 Logistics</h3>
                <p className={styles.stepDescription}>
                  Help us understand your logistical requirements
                </p>

                <div className={styles.field}>
                  <label htmlFor="location" className={styles.label}>
                    Location {(formData.mode === 'offline' || formData.mode === 'hybrid') && 
                      <span className={styles.required}>*</span>
                    }
                  </label>
                  <input
                    id="location"
                    name="location"
                    type="text"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder={
                      formData.mode === 'online' 
                        ? 'e.g., Zoom, Google Meet' 
                        : 'e.g., Seminar Hall, IIIT NR Campus'
                    }
                    className={`${styles.input} ${errors.location ? styles.inputError : ''}`}
                  />
                  {errors.location && <span className={styles.error}>{errors.location}</span>}
                </div>

                <div className={styles.field}>
                  <label htmlFor="required_resources" className={styles.label}>
                    Required Resources
                  </label>
                  <textarea
                    id="required_resources"
                    name="required_resources"
                    value={formData.required_resources}
                    onChange={handleChange}
                    placeholder="e.g., Projector, Computer lab with 30 systems, Zoom Pro account, Whiteboard"
                    className={styles.textarea}
                    rows={4}
                    maxLength={500}
                  />
                  <span className={styles.hint}>{formData.required_resources.length}/500 characters</span>
                </div>

                <div className={styles.field}>
                  <label htmlFor="proposed_dates" className={styles.label}>
                    Date Flexibility (Optional)
                  </label>
                  <textarea
                    id="proposed_dates"
                    name="proposed_dates"
                    value={formData.proposed_dates}
                    onChange={handleChange}
                    placeholder="e.g., Weekends in March 2025, flexible with institute schedule, prefer afternoon sessions"
                    className={styles.textarea}
                    rows={3}
                    maxLength={300}
                  />
                  <span className={styles.hint}>{formData.proposed_dates.length}/300 characters</span>
                </div>

                <div className={styles.infoBox}>
                  <span className={styles.infoIcon}>💡</span>
                  <p>The more flexible you are with dates and resources, the easier it will be to schedule your event!</p>
                </div>
              </div>
            )}

            {/* Step 3: About You */}
            {currentStep === 3 && (
              <div className={styles.stepContent}>
                <h3 className={styles.stepTitle}>👤 About You</h3>
                <p className={styles.stepDescription}>
                  Tell us about your motivation and experience
                </p>

                <div className={styles.field}>
                  <label htmlFor="motivation" className={styles.label}>
                    Why do you want to conduct this event? <span className={styles.required}>*</span>
                  </label>
                  <textarea
                    id="motivation"
                    name="motivation"
                    value={formData.motivation}
                    onChange={handleChange}
                    placeholder="Share your motivation, what inspired you, and what you hope participants will gain..."
                    className={`${styles.textarea} ${errors.motivation ? styles.inputError : ''}`}
                    rows={5}
                    maxLength={800}
                  />
                  {errors.motivation && <span className={styles.error}>{errors.motivation}</span>}
                  <span className={styles.hint}>
                    {formData.motivation.length}/800 characters (minimum 30)
                  </span>
                </div>

                <div className={styles.field}>
                  <label htmlFor="relevant_experience" className={styles.label}>
                    Relevant Experience (Optional)
                  </label>
                  <textarea
                    id="relevant_experience"
                    name="relevant_experience"
                    value={formData.relevant_experience}
                    onChange={handleChange}
                    placeholder="Describe your experience in this topic area, teaching/training experience, certifications, professional work..."
                    className={styles.textarea}
                    rows={5}
                    maxLength={800}
                  />
                  <span className={styles.hint}>{formData.relevant_experience.length}/800 characters</span>
                </div>

                <div className={styles.successBox}>
                  <span className={styles.successIcon}>✨</span>
                  <p><strong>Almost there!</strong> Review your information and click Submit when ready. Our team will review your proposal within 3-5 business days.</p>
                </div>

                {errors.submit && (
                  <div className={styles.errorBox}>
                    <span className={styles.errorIcon}>⚠️</span>
                    <p>{errors.submit}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className={styles.footer}>
            <div className={styles.actions}>
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className={styles.buttonSecondary}
                  disabled={loading}
                >
                  ← Previous
                </button>
              )}
              
              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className={styles.buttonPrimary}
                  disabled={loading}
                >
                  Next →
                </button>
              ) : (
                <button
                  type="submit"
                  className={styles.buttonSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className={styles.spinner}></span>
                      Submitting...
                    </>
                  ) : (
                    '✓ Submit Proposal'
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VolunteerProposalNew;

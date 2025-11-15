import React, { useState } from 'react';
import styles from './HigherEducationForm.module.css';

const HigherEducationForm = ({ initialData = {}, onSave, onCancel }) => {
  // Map incoming status to DB-allowed values
  const allowedStatuses = ['Pursuing', 'Completed', 'Deferred', 'Dropped'];
  const mapStatus = (val) => {
    if (!val) return '';
    if (allowedStatuses.includes(val)) return val;
    // For legacy/other values, map to 'Pursuing'
    return 'Pursuing';
  };

  const [formData, setFormData] = useState({
    higher_study_institution: initialData.higher_study_institution || '',
    higher_study_program: initialData.higher_study_program || '',
    higher_study_field: initialData.higher_study_field || '',
    higher_study_country: initialData.higher_study_country || 'India',
    higher_study_year: initialData.higher_study_year || '',
    higher_study_status: mapStatus(initialData.higher_study_status),
  });

  const [errors, setErrors] = useState({});

  const programLevels = [
    { value: 'Masters', label: "Master's Degree" },
    { value: 'PhD', label: 'PhD / Doctorate' },
    { value: 'MBA', label: 'MBA' },
    { value: 'MTech', label: 'M.Tech' },
    { value: 'MS', label: 'MS (Master of Science)' },
    { value: 'MEng', label: 'M.Eng (Master of Engineering)' },
    { value: 'Post-Graduate Diploma', label: 'Post-Graduate Diploma' },
    { value: 'Certificate Program', label: 'Professional Certificate' },
  ];

  const studyStatuses = [
    // Values must match DB check constraint: Pursuing, Completed, Deferred, Dropped
    { value: 'Pursuing', label: 'Planning / Applied / Currently Pursuing' },
    { value: 'Completed', label: 'Completed' },
    { value: 'Deferred', label: 'Deferred' },
    { value: 'Dropped', label: 'Dropped / Discontinued' },
  ];

  const countries = [
    'India',
    'United States',
    'United Kingdom',
    'Canada',
    'Australia',
    'Germany',
    'France',
    'Singapore',
    'Netherlands',
    'Switzerland',
    'Sweden',
    'Japan',
    'South Korea',
    'China',
    'Other',
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (formData.higher_study_status) {
      // If any higher study field is filled, require basic info
      if (!formData.higher_study_institution?.trim()) {
        newErrors.higher_study_institution = 'Institution name is required';
      }
      if (!formData.higher_study_program) {
        newErrors.higher_study_program = 'Program level is required';
      }
      if (!formData.higher_study_field?.trim()) {
        newErrors.higher_study_field = 'Field of study is required';
      }

      if (formData.higher_study_year) {
        const year = parseInt(formData.higher_study_year);
        const currentYear = new Date().getFullYear();
        if (year < 2000 || year > currentYear + 5) {
          newErrors.higher_study_year = `Year must be between 2000 and ${currentYear + 5}`;
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSave(formData);
    }
  };

  const handleClear = () => {
    setFormData({
      higher_study_institution: '',
      higher_study_program: '',
      higher_study_field: '',
      higher_study_country: 'India',
      higher_study_year: '',
      higher_study_status: '',
    });
    setErrors({});
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formHeader}>
        <h3>Higher Education Information</h3>
        <p className={styles.subtitle}>
          Are you pursuing or have completed higher studies after graduation?
        </p>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="higher_study_status">Current Status</label>
        <select
          id="higher_study_status"
          name="higher_study_status"
          value={formData.higher_study_status}
          onChange={handleChange}
          className={errors.higher_study_status ? styles.error : ''}
        >
          <option value="">Not pursuing higher studies</option>
          {studyStatuses.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
        {errors.higher_study_status && (
          <span className={styles.errorText}>{errors.higher_study_status}</span>
        )}
      </div>

      {formData.higher_study_status && (
        <>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="higher_study_institution" className={styles.required}>
                Institution/University
              </label>
              <input
                type="text"
                id="higher_study_institution"
                name="higher_study_institution"
                value={formData.higher_study_institution}
                onChange={handleChange}
                placeholder="e.g., Stanford University, IIT Delhi"
                className={errors.higher_study_institution ? styles.error : ''}
              />
              {errors.higher_study_institution && (
                <span className={styles.errorText}>{errors.higher_study_institution}</span>
              )}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="higher_study_program" className={styles.required}>
                Program Level
              </label>
              <select
                id="higher_study_program"
                name="higher_study_program"
                value={formData.higher_study_program}
                onChange={handleChange}
                className={errors.higher_study_program ? styles.error : ''}
              >
                <option value="">Select program...</option>
                {programLevels.map((prog) => (
                  <option key={prog.value} value={prog.value}>
                    {prog.label}
                  </option>
                ))}
              </select>
              {errors.higher_study_program && (
                <span className={styles.errorText}>{errors.higher_study_program}</span>
              )}
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="higher_study_field" className={styles.required}>
                Field of Study
              </label>
              <input
                type="text"
                id="higher_study_field"
                name="higher_study_field"
                value={formData.higher_study_field}
                onChange={handleChange}
                placeholder="e.g., Computer Science, Data Science, AI"
                className={errors.higher_study_field ? styles.error : ''}
              />
              {errors.higher_study_field && (
                <span className={styles.errorText}>{errors.higher_study_field}</span>
              )}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="higher_study_country">Country</label>
              <select
                id="higher_study_country"
                name="higher_study_country"
                value={formData.higher_study_country}
                onChange={handleChange}
              >
                {countries.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="higher_study_year">
              {formData.higher_study_status === 'Completed'
                ? 'Year of Completion'
                : 'Year of Admission/Expected Start'}
            </label>
            <input
              type="number"
              id="higher_study_year"
              name="higher_study_year"
              value={formData.higher_study_year}
              onChange={handleChange}
              min="2000"
              max={new Date().getFullYear() + 5}
              placeholder="YYYY"
              className={errors.higher_study_year ? styles.error : ''}
            />
            {errors.higher_study_year && (
              <span className={styles.errorText}>{errors.higher_study_year}</span>
            )}
          </div>

          <div className={styles.infoBox}>
            <strong>📚 Why we collect this:</strong>
            <p>
              Higher education data is crucial for NAAC, NIRF, and NBA accreditation metrics. This
              helps showcase the academic excellence of our alumni and strengthens our institute's
              standing.
            </p>
          </div>
        </>
      )}

      <div className={styles.formActions}>
        <button type="button" onClick={onCancel} className={styles.btnSecondary}>
          Cancel
        </button>
        {formData.higher_study_status && (
          <button type="button" onClick={handleClear} className={styles.btnClear}>
            Clear Form
          </button>
        )}
        <button type="submit" className={styles.btnPrimary}>
          Save Higher Education Info
        </button>
      </div>
    </form>
  );
};

export default HigherEducationForm;

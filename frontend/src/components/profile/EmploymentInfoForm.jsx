import React, { useState } from 'react';
import AutocompleteInput from '../common/AutocompleteInput';
import styles from './EmploymentInfoForm.module.css';

const EmploymentInfoForm = ({ initialData = {}, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    employment_status: initialData.employment_status || initialData.employmentStatus || '',
    current_employer: initialData.current_employer || initialData.currentEmployer || initialData.current_company || '',
    current_job_title: initialData.current_job_title || initialData.currentJobTitle || initialData.current_position || '',
    industry_sector: initialData.industry_sector || initialData.industrySector || '',
    job_location: initialData.job_location || initialData.jobLocation || initialData.current_city || '',
    job_start_year: initialData.job_start_year || initialData.jobStartYear || '',
    annual_salary_range: initialData.annual_salary_range || initialData.annualSalaryRange || '',
    job_type: initialData.job_type || initialData.jobType || 'Full-time',
  });

  const [errors, setErrors] = useState({});

  const employmentStatusOptions = [
    { value: 'Employed', label: 'Employed' },
    { value: 'Self-employed', label: 'Self-employed' },
    { value: 'Entrepreneur', label: 'Entrepreneur' },
    { value: 'Higher Studies', label: 'Pursuing Higher Studies' },
    { value: 'Seeking Employment', label: 'Seeking Employment' },
    { value: 'Not Available', label: 'Not Available for Work' },
  ];

  const industrySectors = [
    'Information Technology',
    'Software Development',
    'Data Science & Analytics',
    'Artificial Intelligence / Machine Learning',
    'Cybersecurity',
    'Cloud Computing',
    'Finance & Banking',
    'Consulting',
    'E-commerce',
    'Education & EdTech',
    'Healthcare & HealthTech',
    'Manufacturing',
    'Telecommunications',
    'Government / Public Sector',
    'Research & Development',
    'Startup',
    'Other',
  ];

  const salaryRanges = [
    '< 3 LPA',
    '3-5 LPA',
    '5-7 LPA',
    '7-10 LPA',
    '10-15 LPA',
    '15-20 LPA',
    '20-30 LPA',
    '30-50 LPA',
    '> 50 LPA',
  ];

  const jobTypes = ['Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship'];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.employment_status) {
      newErrors.employment_status = 'Employment status is required';
    }

    // Validate employed fields
    if (['Employed', 'Self-employed'].includes(formData.employment_status)) {
      if (!formData.current_employer?.trim()) {
        newErrors.current_employer = 'Employer/Company name is required';
      }
      if (!formData.current_job_title?.trim()) {
        newErrors.current_job_title = 'Job title is required';
      }
      if (!formData.job_start_year) {
        newErrors.job_start_year = 'Start year is required';
      } else {
        const year = parseInt(formData.job_start_year);
        const currentYear = new Date().getFullYear();
        if (year < 2000 || year > currentYear) {
          newErrors.job_start_year = `Year must be between 2000 and ${currentYear}`;
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

  const showEmploymentFields =
    formData.employment_status === 'Employed' ||
    formData.employment_status === 'Self-employed' ||
    formData.employment_status === 'Entrepreneur';

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <h3>Employment Information</h3>

      <div className={styles.formGroup}>
        <label htmlFor="employment_status" className={styles.required}>
          Employment Status
        </label>
        <select
          id="employment_status"
          name="employment_status"
          value={formData.employment_status}
          onChange={handleChange}
          className={errors.employment_status ? styles.error : ''}
        >
          <option value="">Select status...</option>
          {employmentStatusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {errors.employment_status && (
          <span className={styles.errorText}>{errors.employment_status}</span>
        )}
      </div>

      {showEmploymentFields && (
        <>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="current_employer" className={styles.required}>
                {formData.employment_status === 'Self-employed'
                  ? 'Business Name'
                  : 'Company/Organization'}
              </label>
              <AutocompleteInput
                value={formData.current_employer}
                onChange={handleChange}
                apiEndpoint="companies"
                name="current_employer"
                placeholder="Start typing company... (e.g., Google, Microsoft)"
                className={errors.current_employer ? styles.error : ''}
              />
              {errors.current_employer && (
                <span className={styles.errorText}>{errors.current_employer}</span>
              )}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="current_job_title" className={styles.required}>
                Job Title/Role
              </label>
              <input
                type="text"
                id="current_job_title"
                name="current_job_title"
                value={formData.current_job_title}
                onChange={handleChange}
                placeholder="e.g., Software Engineer, Data Scientist"
                className={errors.current_job_title ? styles.error : ''}
              />
              {errors.current_job_title && (
                <span className={styles.errorText}>{errors.current_job_title}</span>
              )}
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="industry_sector">Industry Sector</label>
              <select
                id="industry_sector"
                name="industry_sector"
                value={formData.industry_sector}
                onChange={handleChange}
              >
                <option value="">Select industry...</option>
                {industrySectors.map((industry) => (
                  <option key={industry} value={industry}>
                    {industry}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="job_type">Job Type</label>
              <select
                id="job_type"
                name="job_type"
                value={formData.job_type}
                onChange={handleChange}
              >
                {jobTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="job_location">Job Location</label>
              <AutocompleteInput
                value={formData.job_location}
                onChange={handleChange}
                apiEndpoint="cities"
                name="job_location"
                placeholder="Start typing city... (e.g., Bangalore, Mumbai)"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="job_start_year" className={styles.required}>
                Start Year
              </label>
              <input
                type="number"
                id="job_start_year"
                name="job_start_year"
                value={formData.job_start_year}
                onChange={handleChange}
                min="2000"
                max={new Date().getFullYear()}
                placeholder="YYYY"
                className={errors.job_start_year ? styles.error : ''}
              />
              {errors.job_start_year && (
                <span className={styles.errorText}>{errors.job_start_year}</span>
              )}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="annual_salary_range">Annual Salary Range (Optional)</label>
            <select
              id="annual_salary_range"
              name="annual_salary_range"
              value={formData.annual_salary_range}
              onChange={handleChange}
            >
              <option value="">Prefer not to say</option>
              {salaryRanges.map((range) => (
                <option key={range} value={range}>
                  {range}
                </option>
              ))}
            </select>
            <small className={styles.helpText}>
              This information helps for accreditation purposes and remains confidential
            </small>
          </div>
        </>
      )}

      <div className={styles.formActions}>
        <button type="button" onClick={onCancel} className={styles.btnSecondary}>
          Cancel
        </button>
        <button type="submit" className={styles.btnPrimary}>
          Save Employment Info
        </button>
      </div>
    </form>
  );
};

export default EmploymentInfoForm;

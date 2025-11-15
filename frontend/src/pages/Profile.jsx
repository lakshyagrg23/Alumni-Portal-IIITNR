import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../hooks/useAuth';
import API from '../services/authService';
import EmploymentInfoForm from '../components/profile/EmploymentInfoForm';
import HigherEducationForm from '../components/profile/HigherEducationForm';
import ConsentSection from '../components/profile/ConsentSection';
import styles from './Profile.module.css';

const Profile = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [editingSection, setEditingSection] = useState(null);
  const [saveMessage, setSaveMessage] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await API.get('/alumni/profile');
      console.log('Profile API response:', response);
      
      // API interceptor already extracts response.data, so response is the data object
      const profile = response.profile;
      console.log('Profile data:', profile);
      
      // The profile data comes directly from the database
      // It contains first_name, last_name, email, and all other fields
      if (profile) {
        setProfileData(profile);
      } else {
        console.error('No profile in response');
        setProfileData({
          first_name: '',
          last_name: '',
          email: user?.email || '',
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Set empty profile on any error
      setProfileData({
        first_name: '',
        last_name: '',
        email: user?.email || '',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEmployment = async (data) => {
    try {
      const response = await API.put('/alumni/profile/employment', data);
      // API interceptor already extracts response.data
      setProfileData((prev) => ({ ...prev, ...response.profile }));
      setEditingSection(null);
      showSaveMessage('Employment information updated successfully!', 'success');
    } catch (error) {
      console.error('Error saving employment info:', error);
      showSaveMessage(
        error.message || 'Failed to save employment information',
        'error'
      );
    }
  };

  const handleSaveEducation = async (data) => {
    try {
      const response = await API.put('/alumni/profile/education', data);
      // API interceptor already extracts response.data
      setProfileData((prev) => ({ ...prev, ...response.profile }));
      setEditingSection(null);
      showSaveMessage('Higher education information updated successfully!', 'success');
    } catch (error) {
      console.error('Error saving education info:', error);
      showSaveMessage(
        error.message || 'Failed to save education information',
        'error'
      );
    }
  };

  const handleSaveConsent = async (consent) => {
    try {
      const response = await API.put('/alumni/profile/consent', { consent });
      // API interceptor already extracts response.data
      setProfileData((prev) => ({ ...prev, ...response.profile }));
      showSaveMessage(
        consent ? 'Thank you for your consent!' : 'Consent withdrawn',
        'success'
      );
    } catch (error) {
      console.error('Error saving consent:', error);
      showSaveMessage(
        error.message || 'Failed to update consent',
        'error'
      );
    }
  };

  const showSaveMessage = (message, type) => {
    setSaveMessage({ message, type });
    setTimeout(() => setSaveMessage(null), 5000);
  };

  const calculateProfileCompleteness = () => {
    if (!profileData) return 0;
    
    let totalFields = 5; // Base fields: phone, employment_status, consent
    let completedFields = 0;
    
    // Basic contact info
    if (profileData.phone) completedFields++;
    
    // Employment section
    if (profileData.employment_status) {
      completedFields++;
      // If employed, count employer info
      if (['Employed', 'Self-employed', 'Entrepreneur'].includes(profileData.employment_status)) {
        if (profileData.current_employer) completedFields++;
        totalFields++; // Add employer to required fields
      }
    }
    
    // Higher education section
    if (profileData.higher_study_status || profileData.higher_study_institution) {
      completedFields++;
    }
    
    // Consent
    if (profileData.consent_for_accreditation) {
      completedFields++;
    }
    
    return Math.round((completedFields / totalFields) * 100);
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  console.log('Current profileData state:', profileData);
  const completeness = calculateProfileCompleteness();

  return (
    <>
      <Helmet>
        <title>My Profile - IIIT Naya Raipur Alumni Portal</title>
      </Helmet>

      <div className={styles.profilePage}>
        {saveMessage && (
          <div className={`${styles.saveMessage} ${styles[saveMessage.type]}`}>
            {saveMessage.message}
          </div>
        )}

        <div className={styles.profileHeader}>
          <div className={styles.headerContent}>
            <div className={styles.profileAvatar}>
              {(profileData?.first_name || 'U')[0].toUpperCase()}
              {(profileData?.last_name || '')[0]?.toUpperCase() || ''}
            </div>
            <div className={styles.profileInfo}>
              <h1>
                {(profileData?.first_name && profileData.first_name.trim()) || 'First Name'}{' '}
                {(profileData?.last_name && profileData.last_name.trim()) || 'Last Name'}
              </h1>
              <p className={styles.program}>
                {(profileData?.branch && profileData.branch.trim()) || 'Branch Not Set'} • Class of {profileData?.graduation_year || 'N/A'}
              </p>
              {profileData?.student_id && (
                <p className={styles.studentId}>ID: {profileData.student_id}</p>
              )}
            </div>
          </div>
          
          <div className={styles.completenessCard}>
            <div className={styles.completenessLabel}>Profile Completeness</div>
            <div className={styles.completenessBar}>
              <div 
                className={styles.completenessProgress} 
                style={{ width: `${completeness}%` }}
              />
            </div>
            <div className={styles.completenessValue}>{completeness}%</div>
          </div>
        </div>

        <div className={styles.profileSections}>
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Basic Information</h2>
            </div>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <label>Email</label>
                <span>{profileData?.email}</span>
              </div>
              <div className={styles.infoItem}>
                <label>Phone</label>
                <span>{profileData?.phone || 'Not provided'}</span>
              </div>
              <div className={styles.infoItem}>
                <label>Graduation Year</label>
                <span>{profileData?.graduation_year}</span>
              </div>
              <div className={styles.infoItem}>
                <label>Branch</label>
                <span>{profileData?.branch}</span>
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Employment Information</h2>
              {editingSection !== 'employment' && (
                <button
                  onClick={() => setEditingSection('employment')}
                  className={styles.editButton}
                >
                  {profileData?.employment_status ? 'Edit' : 'Add'}
                </button>
              )}
            </div>
            
            {editingSection === 'employment' ? (
              <EmploymentInfoForm
                initialData={profileData}
                onSave={handleSaveEmployment}
                onCancel={() => setEditingSection(null)}
              />
            ) : (
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <label>Employment Status</label>
                  <span>{profileData?.employment_status || 'Not provided'}</span>
                </div>
                {profileData?.current_employer && (
                  <>
                    <div className={styles.infoItem}>
                      <label>Current Employer</label>
                      <span>{profileData.current_employer}</span>
                    </div>
                    <div className={styles.infoItem}>
                      <label>Job Title</label>
                      <span>{profileData.current_job_title || 'Not provided'}</span>
                    </div>
                    <div className={styles.infoItem}>
                      <label>Industry</label>
                      <span>{profileData.industry_sector || 'Not provided'}</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Higher Education</h2>
              {editingSection !== 'education' && (
                <button
                  onClick={() => setEditingSection('education')}
                  className={styles.editButton}
                >
                  {profileData?.higher_study_institution ? 'Edit' : 'Add'}
                </button>
              )}
            </div>
            
            {editingSection === 'education' ? (
              <HigherEducationForm
                initialData={profileData}
                onSave={handleSaveEducation}
                onCancel={() => setEditingSection(null)}
              />
            ) : (
              <div className={styles.infoGrid}>
                {profileData?.higher_study_institution ? (
                  <>
                    <div className={styles.infoItem}>
                      <label>Institution</label>
                      <span>{profileData.higher_study_institution}</span>
                    </div>
                    <div className={styles.infoItem}>
                      <label>Program</label>
                      <span>{profileData.higher_study_program}</span>
                    </div>
                    <div className={styles.infoItem}>
                      <label>Field of Study</label>
                      <span>{profileData.higher_study_field}</span>
                    </div>
                    <div className={styles.infoItem}>
                      <label>Status</label>
                      <span>{profileData.higher_study_status}</span>
                    </div>
                  </>
                ) : (
                  <div className={styles.emptyState}>
                    <p>No higher education information provided</p>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className={styles.section}>
            <ConsentSection
              initialConsent={profileData?.consent_for_accreditation}
              consentDate={profileData?.consent_date}
              onSave={handleSaveConsent}
            />
          </section>
        </div>
      </div>
    </>
  );
};

export default Profile;

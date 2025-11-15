import React, { useState } from 'react';
import styles from './ConsentSection.module.css';

const ConsentSection = ({ initialConsent = false, consentDate = null, onSave }) => {
  const [consent, setConsent] = useState(initialConsent);
  const [showDetails, setShowDetails] = useState(false);

  const handleConsentChange = (e) => {
    const newConsent = e.target.checked;
    setConsent(newConsent);
    onSave(newConsent);
  };

  return (
    <div className={styles.consentSection}>
      <div className={styles.header}>
        <h3>🔒 Accreditation Data Usage Consent</h3>
        <p className={styles.subtitle}>
          Help us maintain our institute's accreditation and rankings
        </p>
      </div>

      <div className={styles.consentBox}>
        <label className={styles.consentLabel}>
          <input
            type="checkbox"
            checked={consent}
            onChange={handleConsentChange}
            className={styles.checkbox}
          />
          <span className={styles.checkboxText}>
            <strong>I consent to use my profile information for accreditation purposes</strong>
            <span className={styles.consentSubtext}>
              Your data will be used for NAAC, NIRF, and NBA reporting
            </span>
          </span>
        </label>

        {consentDate && (
          <div className={styles.consentStatus}>
            ✓ Consent granted on {new Date(consentDate).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowDetails(!showDetails)}
        className={styles.detailsToggle}
      >
        {showDetails ? '− Hide Details' : '+ Show Details'}
      </button>

      {showDetails && (
        <div className={styles.detailsPanel}>
          <div className={styles.detailsContent}>
            <h4>📋 What data will be used?</h4>
            <ul>
              <li>Basic profile information (name, graduation year, program)</li>
              <li>Employment status and current employer</li>
              <li>Higher education details</li>
              <li>Salary range (anonymized in reports)</li>
              <li>Contributions and achievements</li>
            </ul>

            <h4>🎯 Why do we need this?</h4>
            <p>
              Accreditation bodies like NAAC (National Assessment and Accreditation Council), 
              NIRF (National Institutional Ranking Framework), and NBA (National Board of 
              Accreditation) require institutes to track and report alumni outcomes as key 
              performance indicators.
            </p>

            <h4>🔐 Privacy & Security</h4>
            <ul>
              <li>
                <strong>Anonymized Reporting:</strong> Individual identities are never disclosed in 
                reports
              </li>
              <li>
                <strong>Aggregate Data Only:</strong> Only statistical summaries are shared 
                (e.g., "85% placement rate")
              </li>
              <li>
                <strong>Confidential Salaries:</strong> Salary data is grouped into ranges and 
                reported as averages
              </li>
              <li>
                <strong>Secure Storage:</strong> All data is encrypted and stored securely
              </li>
              <li>
                <strong>No Third-Party Sharing:</strong> Data is used exclusively for institutional 
                accreditation
              </li>
            </ul>

            <h4>✅ Your Rights</h4>
            <ul>
              <li>You can withdraw consent at any time</li>
              <li>You can request to see how your data is being used</li>
              <li>You control what information you share</li>
              <li>Incomplete profiles still contribute to basic metrics</li>
            </ul>

            <h4>🏆 Impact of Your Consent</h4>
            <p>
              By providing accurate information and consent, you help:
            </p>
            <ul>
              <li>Improve the institute's accreditation grades and rankings</li>
              <li>Attract better placements and research opportunities</li>
              <li>Enhance the value of your own degree</li>
              <li>Help current students and future alumni</li>
            </ul>

            <div className={styles.highlightBox}>
              <strong>💡 Did you know?</strong>
              <p>
                Institutes with strong alumni tracking and outcomes reporting rank significantly 
                higher in NIRF rankings, which directly impacts the reputation and opportunities 
                available to current and future students.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className={styles.footer}>
        <p>
          <strong>Note:</strong> Even without consent, you can still use all portal features. 
          Consent only affects whether your data contributes to institutional reports.
        </p>
      </div>
    </div>
  );
};

export default ConsentSection;

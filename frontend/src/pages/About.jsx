import React from 'react'
import { Helmet } from 'react-helmet-async'
import styles from './About.module.css'

const About = () => {
  return (
    <>
      <Helmet>
        <title>About IIIT Naya Raipur - Alumni Portal</title>
        <meta name="description" content="Learn about Dr. SPM International Institute of Information Technology, Naya Raipur - A premier institute for excellence in IT education and research." />
      </Helmet>
      
      <div className={styles.aboutContainer}>
        {/* Hero Section */}
        <section className={styles.heroSection}>
          <div className={styles.heroContent}>
            <h1 className={styles.mainTitle}>About IIIT Naya Raipur</h1>
            <p className={styles.subtitle}>
              Dr. S. P. Mukherjee International Institute of Information Technology
            </p>
          </div>
        </section>

        {/* Main Content */}
        <div className={styles.contentWrapper}>
          {/* Introduction */}
          <section className={styles.section}>
            <div className={styles.sectionContent}>
              <p className={styles.introText}>
                Dr. SPM IIIT-Naya Raipur, established by the International Institute of 
                Information Technology University Act, 2013 of the Government of Chhattisgarh, is a 
                joint venture by Chhattisgarh State Government and National Thermal Power 
                Corporation (NTPC). The institute is committed to pursue excellence in higher education, 
                research and development in Information Technology (IT) and associated disciplines.
              </p>
              <p className={styles.introText}>
                It firmly believes in bestowing knowledge dissemination and imparting 
                entrepreneurial skills to the students to enable them to address real world problems. 
                To empower this vision, IIIT-NR fosters state-of-the-art research and product 
                development laboratories to carry out inter-disciplinary research and product 
                development endeavours.
              </p>
            </div>
          </section>

          {/* Highlights */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Highlights</h2>
            <div className={styles.highlightsGrid}>
              <div className={styles.highlightCard}>
                <h3>Recognized University</h3>
                <p>Established as a University by the Govt. of Chhattisgarh and recognized by UGC</p>
              </div>
              <div className={styles.highlightCard}>
                <h3>AICTE Approved</h3>
                <p>Letter of Approval accorded by AICTE for academic programs</p>
              </div>
              <div className={styles.highlightCard}>
                <h3>Eminent Board</h3>
                <p>Guided by a highly eminent board of industry leaders and academicians</p>
              </div>
              <div className={styles.highlightCard}>
                <h3>Modern Infrastructure</h3>
                <p>Fully residential campus with state-of-the-art infrastructure</p>
              </div>
              <div className={styles.highlightCard}>
                <h3>Industry Focus</h3>
                <p>Industry driven curriculum fostering innovation and entrepreneurship</p>
              </div>
              <div className={styles.highlightCard}>
                <h3>Research Excellence</h3>
                <p>Focus on teaching, research and consultancy with e-enabled facilities</p>
              </div>
            </div>
          </section>

          {/* Campus */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Our Campus</h2>
            <div className={styles.campusContent}>
              <p>
                Dr. SPM IIIT-NR's fifty-acres residential campus is located in the newly 
                developed smart city of Atal Nagar, approximately 23 kms from the city of Raipur. 
                The vibrant lush green campus of IIIT-NR is enabled with Wi-Fi connectivity, CCTV 
                surveillance, hi-tech security measures and excellent amenities for sports and 
                other recreational activities.
              </p>
              <p>
                The modern architecture of the buildings and the serene environment of the campus 
                fosters an ambience for the students for creativity and innovation. The classrooms 
                are equipped with state-of-the-art technologies for teaching and learning.
              </p>
              <div className={styles.campusFeatures}>
                <div className={styles.feature}>
                  <span>Located in capital of Chhattisgarh with good connectivity</span>
                </div>
                <div className={styles.feature}>
                  <span>50-acre lush green residential campus</span>
                </div>
                <div className={styles.feature}>
                  <span>Wi-Fi enabled campus with CCTV surveillance</span>
                </div>
                <div className={styles.feature}>
                  <span>E-enabled teaching and learning facilities</span>
                </div>
                <div className={styles.feature}>
                  <span>Excellent sports and recreational facilities</span>
                </div>
                <div className={styles.feature}>
                  <span>Professional English Language Development Program</span>
                </div>
              </div>
            </div>
          </section>

          {/* Vision & Mission */}
          <section className={styles.section}>
            <div className={styles.visionMissionGrid}>
              <div className={styles.visionMissionCard}>
                <h2 className={styles.cardTitle}>Our Vision</h2>
                <p>
                  To be a world-class institute of higher learning in Information Technology 
                  and allied areas, fostering innovation, research, and entrepreneurship to 
                  address global challenges.
                </p>
              </div>
              <div className={styles.visionMissionCard}>
                <h2 className={styles.cardTitle}>Our Mission</h2>
                <p>
                  To provide quality education, conduct cutting-edge research, and develop 
                  skilled professionals who can contribute to society and the IT industry 
                  through knowledge dissemination and entrepreneurial skills.
                </p>
              </div>
            </div>
          </section>

          {/* Contact Information */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Contact Information</h2>
            <div className={styles.contactGrid}>
              <div className={styles.contactCard}>
                <h3>Address</h3>
                <p>
                  IIIT–Naya Raipur<br />
                  Plot No. 7, Sector 24<br />
                  Near Purkhoti Muktangan<br />
                  Atal Nagar – 493661<br />
                  Chhattisgarh, India
                </p>
              </div>
              <div className={styles.contactCard}>
                <h3>Phone</h3>
                <p>
                  Tel: (0771) 2474182<br />
                  <small>Available on working days<br />9:30 AM - 6:00 PM</small>
                </p>
              </div>
              <div className={styles.contactCard}>
                <h3>Email</h3>
                <p>
                  General: <a href="mailto:iiitnr@iiitnr.ac.in">iiitnr@iiitnr.ac.in</a><br />
                  Academic: <a href="mailto:registrar@iiitnr.edu.in">registrar@iiitnr.edu.in</a><br />
                  Admissions: <a href="mailto:btech_admissions@iiitnr.ac.in">btech_admissions@iiitnr.ac.in</a>
                </p>
              </div>
            </div>
            <div className={styles.mapLinks}>
              <a 
                href="https://goo.gl/maps/99ScvLnW9aT2" 
                target="_blank" 
                rel="noopener noreferrer"
                className={styles.mapLink}
              >
                Route from Raipur Railway Station
              </a>
              <a 
                href="https://goo.gl/maps/B1sLfu9iRDk" 
                target="_blank" 
                rel="noopener noreferrer"
                className={styles.mapLink}
              >
                Route from Raipur Airport
              </a>
            </div>
          </section>

          {/* Alumni Portal Info */}
          <section className={styles.section}>
            <div className={styles.alumniPortalInfo}>
              <h2 className={styles.sectionTitle}>About This Alumni Portal</h2>
              <p>
                This Alumni Portal serves as a bridge between IIIT Naya Raipur and its 
                distinguished alumni community. It provides a platform for networking, 
                mentorship, career opportunities, and staying connected with the institute 
                and fellow alumni.
              </p>
              <p>
                Join us in building a strong alumni network that continues to contribute to 
                the growth and success of our alma mater and its students.
              </p>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}

export default About

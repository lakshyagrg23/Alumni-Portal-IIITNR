import React, { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useAuth } from '@hooks/useAuth'
import NewsManagement from './components/NewsManagement'
import EventsManagement from './components/EventsManagement'
import AccreditationDashboard from './AccreditationDashboard'
import AdminAccessTab from './components/AdminAccessTab'
import styles from './AdminPanel.module.css'

const AdminPanel = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('dashboard')

  // Redirect if not admin
  if (user?.role !== 'admin' && user?.role !== 'superadmin') {
    return (
      <div className={styles.adminContainer}>
        <div className={styles.mainContent}>
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <h1>Access Denied</h1>
            <p>You need admin privileges to access this page.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <Helmet>
        <title>Admin Panel - IIIT Naya Raipur Alumni Portal</title>
      </Helmet>
      
      <div className={styles.adminContainer}>
        <div className={styles.adminContent}>
          {/* Tab Navigation */}
          <div className={styles.tabNavigation}>
            <button
              className={`${styles.tab} ${activeTab === 'dashboard' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              Dashboard
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'news' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('news')}
            >
              News Management
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'events' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('events')}
            >
              Event Management
            </button>
            {user?.role === 'superadmin' && (
              <button
                className={`${styles.tab} ${activeTab === 'access' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('access')}
              >
                Admin Access
              </button>
            )}
          </div>

          {/* Content Area */}
          <div className={styles.tabContent}>
            {activeTab === 'dashboard' && <AccreditationDashboard />}
            {activeTab === 'news' && <NewsManagement />}
            {activeTab === 'events' && <EventsManagement />}
            {activeTab === 'access' && user?.role === 'superadmin' && (
              <AdminAccessTab />
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default AdminPanel

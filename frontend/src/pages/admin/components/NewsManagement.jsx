import React, { useState, useEffect } from 'react'
import { adminService } from '@services/adminService'
import styles from '../AdminPanel.module.css'

const NewsManagement = () => {
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingNews, setEditingNews] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    category: 'news',
    isPublished: true,
  })

  // Load all news
  const loadNews = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await adminService.getAllNews()
      setNews(response.data)
    } catch (err) {
      console.error('Load news error:', err)
      setError(err.message || 'Failed to load news')
    } finally {
      setLoading(false)
    }
  }

  // Handle form submit (create or update)
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.title || !formData.content) {
      setError('Title and content are required')
      return
    }

    try {
      setError(null)
      
      if (editingNews) {
        // Update existing news
        await adminService.updateNews(editingNews.id, formData)
      } else {
        // Create new news
        await adminService.createNews(formData)
      }
      
      // Reset form and reload news
      setFormData({
        title: '',
        content: '',
        excerpt: '',
        category: 'news',
        isPublished: true,
      })
      setEditingNews(null)
      setShowForm(false)
      await loadNews()
      
    } catch (err) {
      console.error('Submit news error:', err)
      setError(err.message || 'Failed to save news')
    }
  }

  // Handle edit
  const handleEdit = (newsItem) => {
    setEditingNews(newsItem)
    setFormData({
      title: newsItem.title,
      content: newsItem.content,
      excerpt: newsItem.excerpt || '',
      category: newsItem.category,
      isPublished: newsItem.is_published,
    })
    setShowForm(false)
    setShowEditModal(true)
  }

  // Handle delete
  const handleDelete = async (newsId) => {
    if (!window.confirm('Are you sure you want to delete this news item?')) {
      return
    }

    try {
      await adminService.deleteNews(newsId)
      await loadNews()
    } catch (err) {
      console.error('Delete news error:', err)
      setError(err.message || 'Failed to delete news')
    }
  }

  // Cancel editing
  const handleCancel = () => {
    setFormData({
      title: '',
      content: '',
      excerpt: '',
      category: 'news',
      isPublished: true,
    })
    setEditingNews(null)
    setShowForm(false)
    setShowEditModal(false)
    setError(null)
  }

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Get latest 4 news items
  const latestNews = news.slice(0, 4)
  const publishedCount = news.filter((item) => item.is_published).length
  const draftCount = news.length - publishedCount

  useEffect(() => {
    loadNews()
  }, [])

  return (
    <div className={styles.contentManagement}>
      <div className={styles.pageHeader}>
        <h2 className={styles.pageTitle}>News Management</h2>
        <button
          className={styles.primaryButton}
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : 'Add News'}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}

      {/* News Form */}
      {showForm && (
        <div className={styles.formContainer}>
          <h3>{editingNews ? 'Edit News' : 'Create News'}</h3>
          <form onSubmit={handleSubmit} className={styles.newsForm}>
            <div className={styles.formGroup}>
              <label htmlFor="title">Title *</label>
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
              <label htmlFor="category">Category</label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className={styles.formSelect}
              >
                <option value="news">News</option>
                <option value="achievement">Achievement</option>
                <option value="announcement">Announcement</option>
                <option value="general">General</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="excerpt">Excerpt</label>
              <input
                type="text"
                id="excerpt"
                value={formData.excerpt}
                onChange={(e) => setFormData({...formData, excerpt: e.target.value})}
                className={styles.formInput}
                placeholder="Brief summary (optional)"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="content">Content *</label>
              <textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({...formData, content: e.target.value})}
                className={styles.formTextarea}
                rows="6"
                required
              />
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

            <div className={styles.formGroup}>
              <label>Image Upload</label>
              <button type="button" className={styles.placeholderButton} disabled>
                Upload Image (Coming Soon)
              </button>
            </div>

            <div className={styles.formActions}>
              <button type="submit" className={styles.submitButton}>
                {editingNews ? 'Update News' : 'Create News'}
              </button>
              <button type="button" onClick={handleCancel} className={styles.cancelButton}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Latest News Section */}
      <div className={styles.latestNewsSection}>
        <h3>Latest News (4 most recent)</h3>
        {latestNews.length === 0 ? (
          <p className={styles.emptyState}>No news items found</p>
        ) : (
          <div className={styles.latestNewsGrid}>
            {latestNews.map((item) => (
              <div key={item.id} className={styles.latestNewsCard}>
                <div className={styles.newsCardHeader}>
                  <h4>{item.title}</h4>
                  <span className={`${styles.categoryBadge} ${styles[item.category]}`}>
                    {item.category}
                  </span>
                </div>
                <p className={styles.newsExcerpt}>
                  {item.excerpt || item.content.substring(0, 100) + '...'}
                </p>
                <div className={styles.newsCardFooter}>
                  <span className={styles.newsDate}>
                    {formatDate(item.created_at)}
                  </span>
                  <span className={`${styles.statusBadge} ${item.is_published ? styles.published : styles.draft}`}>
                    {item.is_published ? 'Published' : 'Draft'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All News List */}
      <div className={styles.newsListSection}>
        <div className={styles.sectionHeaderRow}>
          <div>
            <p className={styles.eyebrow}>All posts</p>
            <h3>All News Items ({news.length})</h3>
          </div>
          <div className={styles.helperPillRow}>
            <span className={styles.helperPill}>Published: {publishedCount}</span>
            <span className={styles.helperPill}>Draft: {draftCount}</span>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={loadNews}
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
        
        {loading ? (
          <div className={styles.loadingSpinner}>
            <div className={styles.spinner}></div>
          </div>
        ) : news.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No news items found. Create your first news item!</p>
          </div>
        ) : (
          <div className={styles.newsTable}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {news.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className={styles.newsTitle}>
                        {item.title}
                        {item.excerpt && (
                          <div className={styles.newsSubtitle}>{item.excerpt}</div>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`${styles.categoryBadge} ${styles[item.category]}`}>
                        {item.category}
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.statusBadge} ${item.is_published ? styles.published : styles.draft}`}>
                        {item.is_published ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td>{formatDate(item.created_at)}</td>
                    <td>
                      <div className={styles.actionButtons}>
                        <button
                          onClick={() => handleEdit(item)}
                          className={`${styles.actionButton} ${styles.edit}`}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
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
                <h3>Edit News</h3>
              </div>
              <button
                type="button"
                className={styles.modalCloseButton}
                onClick={handleCancel}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className={styles.newsForm}>
              <div className={styles.formGroup}>
                <label htmlFor="title">Title *</label>
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
                <label htmlFor="category">Category</label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className={styles.formSelect}
                >
                  <option value="news">News</option>
                  <option value="achievement">Achievement</option>
                  <option value="announcement">Announcement</option>
                  <option value="general">General</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="excerpt">Excerpt</label>
                <input
                  type="text"
                  id="excerpt"
                  value={formData.excerpt}
                  onChange={(e) => setFormData({...formData, excerpt: e.target.value})}
                  className={styles.formInput}
                  placeholder="Brief summary (optional)"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="content">Content *</label>
                <textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  className={styles.formTextarea}
                  rows="6"
                  required
                />
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
                  Update News
                </button>
                <button type="button" onClick={handleCancel} className={styles.cancelButton}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default NewsManagement

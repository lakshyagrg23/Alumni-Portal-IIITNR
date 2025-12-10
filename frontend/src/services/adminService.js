import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// Create axios instance
const API = axios.create({
  baseURL: API_URL,
  timeout: import.meta.env.VITE_API_TIMEOUT || 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Handle response errors
API.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    throw error.response?.data || error
  }
)

export const adminService = {
  // Get all users with pagination and filters
  getUsers: async (params = {}) => {
    const response = await API.get('/admin/users', { params })
    return response
  },

  // Approve a user
  approveUser: async (userId) => {
    const response = await API.put(`/admin/users/${userId}/approve`)
    return response
  },

  // Reject/unapprove a user
  rejectUser: async (userId) => {
    const response = await API.put(`/admin/users/${userId}/reject`)
    return response
  },

  // Deactivate a user
  deactivateUser: async (userId) => {
    const response = await API.put(`/admin/users/${userId}/deactivate`)
    return response
  },

  // Activate a user
  activateUser: async (userId) => {
    const response = await API.put(`/admin/users/${userId}/activate`)
    return response
  },

  // Get user statistics
  getUserStats: async () => {
    const response = await API.get('/admin/stats/users')
    return response
  },

  // ===== Permissions & Superadmin Management =====
  getMyPermissions: async () => {
    const response = await API.get('/admin/permissions/me')
    return response
  },
  listAdmins: async () => {
    const response = await API.get('/admin/superadmin/admins')
    return response
  },
  promoteToAdmin: async (userId) => {
    const response = await API.post('/admin/superadmin/promote', { userId })
    return response
  },
  demoteToAlumni: async (userId) => {
    const response = await API.post('/admin/superadmin/demote', { userId })
    return response
  },
  grantPermission: async (userId, permission) => {
    const response = await API.post('/admin/superadmin/permissions/grant', { userId, permission })
    return response
  },
  revokePermission: async (userId, permission) => {
    const response = await API.post('/admin/superadmin/permissions/revoke', { userId, permission })
    return response
  },

  // Create admin directly (superadmin only)
  createAdmin: async ({ email, password }) => {
    return API.post('/admin/superadmin/create-admin', { email, password })
  },

  // =================== NEWS MANAGEMENT ===================
  
  // Get all news items
  getAllNews: async () => {
    const response = await API.get('/admin/news')
    return response
  },

  // Create new news item
  createNews: async (newsData) => {
    const response = await API.post('/admin/news', newsData)
    return response
  },

  // Update news item
  updateNews: async (newsId, newsData) => {
    const response = await API.put(`/admin/news/${newsId}`, newsData)
    return response
  },

  // Delete news item
  deleteNews: async (newsId) => {
    const response = await API.delete(`/admin/news/${newsId}`)
    return response
  },

  // =================== EVENTS MANAGEMENT ===================
  
  // Get all events
  getAllEvents: async () => {
    const response = await API.get('/admin/events')
    return response
  },

  // Create new event
  createEvent: async (eventData) => {
    const response = await API.post('/admin/events', eventData)
    return response
  },

  // Update event
  updateEvent: async (eventId, eventData) => {
    const response = await API.put(`/admin/events/${eventId}`, eventData)
    return response
  },

  // Delete event
  deleteEvent: async (eventId) => {
    const response = await API.delete(`/admin/events/${eventId}`)
    return response
  },
}

/**
 * Event Service - API calls for events functionality
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Get all upcoming events with optional filters
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>}
 */
export const getUpcomingEvents = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    // Add filters to query params
    if (params.event_type) queryParams.append('event_type', params.event_type);
    if (params.mode) queryParams.append('mode', params.mode);
    if (params.experience_level) queryParams.append('experience_level', params.experience_level);
    if (params.search) queryParams.append('search', params.search);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const response = await fetch(`${API_BASE_URL}/events/upcoming?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    throw error;
  }
};

/**
 * Get all past events with optional filters
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>}
 */
export const getPastEvents = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    // Add filters to query params
    if (params.event_type) queryParams.append('event_type', params.event_type);
    if (params.mode) queryParams.append('mode', params.mode);
    if (params.search) queryParams.append('search', params.search);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const response = await fetch(`${API_BASE_URL}/events/past?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching past events:', error);
    throw error;
  }
};

/**
 * Get event details by ID
 * @param {string} eventId - Event UUID
 * @returns {Promise<Object>}
 */
export const getEventById = async (eventId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching event details:', error);
    throw error;
  }
};

/**
 * Register for an event
 * @param {string} eventId - Event UUID
 * @param {Object} registrationData - Registration information
 * @returns {Promise<Object>}
 */
export const registerForEvent = async (eventId, registrationData) => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_BASE_URL}/events/${eventId}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(registrationData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error registering for event:', error);
    throw error;
  }
};

/**
 * Get user's event registrations
 * @returns {Promise<Object>}
 */
export const getMyEventRegistrations = async () => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_BASE_URL}/events/my-registrations`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching my event registrations:', error);
    throw error;
  }
};

/**
 * Submit a volunteer event proposal
 * @param {Object} proposalData - Event proposal information
 * @returns {Promise<Object>}
 */
export const submitEventProposal = async (proposalData) => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_BASE_URL}/events/propose`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(proposalData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error submitting event proposal:', error);
    throw error;
  }
};

/**
 * Get all event proposals (admin only)
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>}
 */
export const getEventProposals = async (params = {}) => {
  try {
    const token = localStorage.getItem('token');
    const queryParams = new URLSearchParams();
    
    if (params.status) queryParams.append('status', params.status);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);

    const response = await fetch(`${API_BASE_URL}/events/admin/proposals?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching event proposals:', error);
    throw error;
  }
};

/**
 * Approve or reject an event proposal (admin only)
 * @param {string} proposalId - Proposal UUID
 * @param {string} action - 'approve' or 'reject'
 * @param {string} adminComment - Optional admin comment
 * @returns {Promise<Object>}
 */
export const manageEventProposal = async (proposalId, action, adminComment = '') => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_BASE_URL}/events/admin/proposals/${proposalId}/${action}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ adminComment }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error managing event proposal:', error);
    throw error;
  }
};

/**
 * Create a new event (admin only)
 * @param {Object} eventData - Event information
 * @returns {Promise<Object>}
 */
export const createEvent = async (eventData) => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_BASE_URL}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(eventData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating event:', error);
    throw error;
  }
};

/**
 * Update an existing event (admin only)
 * @param {string} eventId - Event UUID
 * @param {Object} eventData - Updated event information
 * @returns {Promise<Object>}
 */
export const updateEvent = async (eventId, eventData) => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_BASE_URL}/events/${eventId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(eventData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating event:', error);
    throw error;
  }
};

/**
 * Delete an event (admin only)
 * @param {string} eventId - Event UUID
 * @returns {Promise<Object>}
 */
export const deleteEvent = async (eventId) => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_BASE_URL}/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting event:', error);
    throw error;
  }
};

/**
 * Get event registrations (admin only)
 * @param {string} eventId - Event UUID
 * @returns {Promise<Object>}
 */
export const getEventRegistrations = async (eventId) => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_BASE_URL}/events/${eventId}/registrations`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching event registrations:', error);
    throw error;
  }
};

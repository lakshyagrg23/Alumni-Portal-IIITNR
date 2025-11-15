/**
 * Reports Service - API client for accreditation reports
 * Handles all communication with the reports backend API
 */

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
    baseURL: `${API_URL}/admin/reports`,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response.data,
    (error) => {
        const message = error.response?.data?.error || error.message || 'An error occurred';
        throw new Error(message);
    }
);

/**
 * Get dashboard overview with KPIs
 */
export const getOverview = async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.startYear) params.append('startYear', filters.startYear);
    if (filters.endYear) params.append('endYear', filters.endYear);
    if (filters.program) params.append('program', filters.program);
    if (filters.department) params.append('department', filters.department);
    
    return api.get(`/overview?${params.toString()}`);
};

/**
 * Get placement details
 */
export const getPlacementDetails = async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.startYear) params.append('startYear', filters.startYear);
    if (filters.endYear) params.append('endYear', filters.endYear);
    if (filters.program) params.append('program', filters.program);
    if (filters.department) params.append('department', filters.department);
    if (filters.companyName) params.append('companyName', filters.companyName);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.offset) params.append('offset', filters.offset);
    
    return api.get(`/placements?${params.toString()}`);
};

/**
 * Get placement trends by year
 */
export const getPlacementTrends = async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.startYear) params.append('startYear', filters.startYear);
    if (filters.endYear) params.append('endYear', filters.endYear);
    if (filters.program) params.append('program', filters.program);
    if (filters.department) params.append('department', filters.department);
    
    return api.get(`/placements/trends?${params.toString()}`);
};

/**
 * Get top employers
 */
export const getEmployers = async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.startYear) params.append('startYear', filters.startYear);
    if (filters.endYear) params.append('endYear', filters.endYear);
    if (filters.limit) params.append('limit', filters.limit);
    
    return api.get(`/employers?${params.toString()}`);
};

/**
 * Get higher education statistics
 */
export const getHigherEducation = async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.startYear) params.append('startYear', filters.startYear);
    if (filters.endYear) params.append('endYear', filters.endYear);
    if (filters.program) params.append('program', filters.program);
    if (filters.department) params.append('department', filters.department);
    if (filters.country) params.append('country', filters.country);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.offset) params.append('offset', filters.offset);
    
    return api.get(`/higher-studies?${params.toString()}`);
};

/**
 * Get alumni contributions
 */
export const getContributions = async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.startYear) params.append('startYear', filters.startYear);
    if (filters.endYear) params.append('endYear', filters.endYear);
    if (filters.type) params.append('type', filters.type);
    if (filters.limit) params.append('limit', filters.limit);
    
    return api.get(`/contributions?${params.toString()}`);
};

/**
 * Get alumni achievements
 */
export const getAchievements = async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.startYear) params.append('startYear', filters.startYear);
    if (filters.endYear) params.append('endYear', filters.endYear);
    if (filters.type) params.append('type', filters.type);
    if (filters.recognitionLevel) params.append('recognitionLevel', filters.recognitionLevel);
    if (filters.limit) params.append('limit', filters.limit);
    
    return api.get(`/achievements?${params.toString()}`);
};

/**
 * Get contact verification status
 */
export const getContactStatus = async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.program) params.append('program', filters.program);
    if (filters.department) params.append('department', filters.department);
    if (filters.graduationYear) params.append('graduationYear', filters.graduationYear);
    
    return api.get(`/contacts?${params.toString()}`);
};

/**
 * Get engagement statistics
 */
export const getEngagement = async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.startYear) params.append('startYear', filters.startYear);
    if (filters.endYear) params.append('endYear', filters.endYear);
    
    return api.get(`/engagement?${params.toString()}`);
};

/**
 * Get program-specific outcomes
 */
export const getProgramOutcomes = async (program, graduationYear) => {
    const params = new URLSearchParams();
    params.append('program', program);
    params.append('graduationYear', graduationYear);
    
    return api.get(`/program-outcomes?${params.toString()}`);
};

/**
 * Get comprehensive summary
 */
export const getSummary = async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.startYear) params.append('startYear', filters.startYear);
    if (filters.endYear) params.append('endYear', filters.endYear);
    if (filters.program) params.append('program', filters.program);
    if (filters.department) params.append('department', filters.department);
    
    return api.get(`/summary?${params.toString()}`);
};

/**
 * Get filter options
 */
export const getFilterOptions = async () => {
    return api.get('/filters/options');
};

/**
 * Export placements as CSV or JSON
 */
export const exportPlacements = async (filters = {}, format = 'csv') => {
    const params = new URLSearchParams();
    if (filters.startYear) params.append('startYear', filters.startYear);
    if (filters.endYear) params.append('endYear', filters.endYear);
    if (filters.program) params.append('program', filters.program);
    if (filters.department) params.append('department', filters.department);
    params.append('format', format);
    
    if (format === 'csv') {
        // For CSV, we need to handle blob response
        const response = await axios.get(
            `${API_URL}/admin/reports/export/placements?${params.toString()}`,
            {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                },
                responseType: 'blob'
            }
        );
        
        // Create download link
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `placements_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        
        return { success: true };
    }
    
    return api.get(`/export/placements?${params.toString()}`);
};

/**
 * Export higher education data
 */
export const exportHigherEducation = async (filters = {}, format = 'csv') => {
    const params = new URLSearchParams();
    if (filters.startYear) params.append('startYear', filters.startYear);
    if (filters.endYear) params.append('endYear', filters.endYear);
    if (filters.program) params.append('program', filters.program);
    if (filters.department) params.append('department', filters.department);
    if (filters.country) params.append('country', filters.country);
    params.append('format', format);
    
    if (format === 'csv') {
        const response = await axios.get(
            `${API_URL}/admin/reports/export/higher-education?${params.toString()}`,
            {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                },
                responseType: 'blob'
            }
        );
        
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `higher_education_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        
        return { success: true };
    }
    
    return api.get(`/export/higher-education?${params.toString()}`);
};

/**
 * Export contributions
 */
export const exportContributions = async (filters = {}, format = 'csv') => {
    const params = new URLSearchParams();
    if (filters.startYear) params.append('startYear', filters.startYear);
    if (filters.endYear) params.append('endYear', filters.endYear);
    if (filters.type) params.append('type', filters.type);
    params.append('format', format);
    
    if (format === 'csv') {
        const response = await axios.get(
            `${API_URL}/admin/reports/export/contributions?${params.toString()}`,
            {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                },
                responseType: 'blob'
            }
        );
        
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `contributions_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        
        return { success: true };
    }
    
    return api.get(`/export/contributions?${params.toString()}`);
};

/**
 * Export achievements
 */
export const exportAchievements = async (filters = {}, format = 'csv') => {
    const params = new URLSearchParams();
    if (filters.startYear) params.append('startYear', filters.startYear);
    if (filters.endYear) params.append('endYear', filters.endYear);
    if (filters.type) params.append('type', filters.type);
    if (filters.recognitionLevel) params.append('recognitionLevel', filters.recognitionLevel);
    params.append('format', format);
    
    if (format === 'csv') {
        const response = await axios.get(
            `${API_URL}/admin/reports/export/achievements?${params.toString()}`,
            {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                },
                responseType: 'blob'
            }
        );
        
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `achievements_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        
        return { success: true };
    }
    
    return api.get(`/export/achievements?${params.toString()}`);
};

/**
 * Generate NAAC report
 */
export const exportNAAC = async (data) => {
    return axios.post(`${API_URL}/admin/reports/export/naac`, data, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        }
    }).then(res => res.data);
};

/**
 * Generate NIRF report
 */
export const exportNIRF = async (data) => {
    return axios.post(`${API_URL}/admin/reports/export/nirf`, data, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        }
    }).then(res => res.data);
};

/**
 * Generate NBA report
 */
export const exportNBA = async (data) => {
    return axios.post(`${API_URL}/admin/reports/export/nba`, data, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        }
    }).then(res => res.data);
};

/**
 * Export complete package
 */
export const exportComplete = async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.startYear) params.append('startYear', filters.startYear);
    if (filters.endYear) params.append('endYear', filters.endYear);
    if (filters.program) params.append('program', filters.program);
    if (filters.department) params.append('department', filters.department);
    params.append('format', 'json');
    
    return api.get(`/export/complete?${params.toString()}`);
};

export default {
    getOverview,
    getPlacementDetails,
    getPlacementTrends,
    getEmployers,
    getHigherEducation,
    getContributions,
    getAchievements,
    getContactStatus,
    getEngagement,
    getProgramOutcomes,
    getSummary,
    getFilterOptions,
    exportPlacements,
    exportHigherEducation,
    exportContributions,
    exportAchievements,
    exportNAAC,
    exportNIRF,
    exportNBA,
    exportComplete
};

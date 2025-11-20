import axios from "axios";

// Create axios instance
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  timeout: import.meta.env.VITE_API_TIMEOUT || 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
API.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem("token");
      window.location.href = "/login";
    }

    // Return error message from API or generic message
    const message =
      error.response?.data?.message || error.message || "An error occurred";
    return Promise.reject(new Error(message));
  }
);

// Auth service
export const authService = {
  // Set token for requests
  setToken: (token) => {
    localStorage.setItem("token", token);
  },

  // Remove token
  removeToken: () => {
    localStorage.removeItem("token");
  },

  // Login with email and password
  login: async (credentials) => {
    const response = await API.post("/auth/login", credentials);
    return response;
  },

  // Register new user
  register: async (userData) => {
    const response = await API.post("/auth/register", userData);
    return response;
  },

  // Google OAuth login
  googleLogin: async (googleData) => {
    const response = await API.post("/auth/google", googleData);
    return response;
  },

  // LinkedIn OAuth login
  linkedinLogin: async (linkedinData) => {
    const response = await API.post("/auth/linkedin", linkedinData);
    return response;
  },

  // Get current user profile
  getProfile: async () => {
    // Add cache-busting parameter to ensure fresh data
    const timestamp = Date.now();
    const response = await API.get(`/auth/profile?t=${timestamp}`);
    return response; // Return the full response (already includes success and data)
  },

  // Update user profile
  updateProfile: async (profileData) => {
    console.log("Calling API PUT /auth/profile with data:", profileData);
    const response = await API.put("/auth/profile", profileData);
    console.log("API response:", response);
    return response;
  },

  // Logout (optional API call for server-side logout)
  logout: async () => {
    try {
      await API.post("/auth/logout");
    } catch (error) {
      // Ignore errors on logout
      console.log("Logout error (ignored):", error.message);
    }
  },

  // Request password reset
  requestPasswordReset: async (email) => {
    const response = await API.post("/auth/forgot-password", { email });
    return response;
  },

  // Reset password with token
  resetPassword: async (token, newPassword) => {
    const response = await API.post("/auth/reset-password", {
      token,
      password: newPassword,
    });
    return response;
  },

  // Verify email
  verifyEmail: async (token) => {
    const response = await API.get(`/auth/verify-email?token=${token}`);
    return response;
  },

  // Resend verification email
  resendVerification: async (email) => {
    const response = await API.post("/auth/resend-verification", { email });
    return response;
  },

  // Complete onboarding after profile submission
  completeOnboarding: async () => {
    const response = await API.post("/auth/complete-onboarding");
    return response;
  },
};

export default API;

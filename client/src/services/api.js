import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
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
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },
  
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },
  
  googleAuth: async (token) => {
    const response = await api.post('/auth/google', { token });
    return response.data;
  },
  
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// Profile API calls
export const profileAPI = {
  getConstants: async () => {
    const response = await api.get('/profile/constants');
    return response.data;
  },
  
  getProfile: async () => {
    const response = await api.get('/profile/me');
    return response.data;
  },
  
  updateProfile: async (profileData) => {
    const response = await api.post('/profile/setup', profileData);
    return response.data;
  },
  
  getCompletion: async () => {
    const response = await api.get('/profile/completion');
    return response.data;
  },
  
  checkAgentRequirements: async (agentType) => {
    const response = await api.get(`/profile/agent-requirements/${agentType}`);
    return response.data;
  },
  
  // Work Experience
  getWorkExperiences: async () => {
    const response = await api.get('/profile/work-experience');
    return response.data;
  },
  
  createWorkExperience: async (workExpData) => {
    const response = await api.post('/profile/work-experience', workExpData);
    return response.data;
  },
  
  updateWorkExperience: async (id, workExpData) => {
    const response = await api.put(`/profile/work-experience/${id}`, workExpData);
    return response.data;
  },
  
  deleteWorkExperience: async (id) => {
    const response = await api.delete(`/profile/work-experience/${id}`);
    return response.data;
  },
};

export default api;
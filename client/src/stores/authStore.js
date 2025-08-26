import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import toast from 'react-hot-toast';

// Configure axios defaults
axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      loading: true,
      
      // Initialize auth on app start
      initializeAuth: async () => {
        const token = get().token;
        if (token) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          try {
            await get().getCurrentUser();
          } catch (error) {
            get().logout();
          }
        }
        set({ loading: false });
      },

      // Login user
      login: async (credentials) => {
        try {
          const response = await axios.post('/auth/login', credentials);
          const { access_token } = response.data;
          
          set({ token: access_token, loading: false });
          axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
          
          await get().getCurrentUser();
          
          toast.success('Welcome back!');
          return { success: true };
        } catch (error) {
          const message = error.response?.data?.detail || 'Login failed';
          toast.error(message);
          return { success: false, error: message };
        }
      },

      // Register user
      register: async (userData) => {
        try {
          await axios.post('/auth/register', userData);
          toast.success('Account created successfully! Please login.');
          return { success: true };
        } catch (error) {
          const message = error.response?.data?.detail || 'Registration failed';
          toast.error(message);
          return { success: false, error: message };
        }
      },

      // Google OAuth login
      loginWithGoogle: async (googleToken) => {
        try {
          const response = await axios.post('/auth/google', { token: googleToken });
          const { access_token } = response.data;
          
          set({ token: access_token });
          axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
          
          await get().getCurrentUser();
          
          toast.success('Welcome!');
          return { success: true };
        } catch (error) {
          const message = error.response?.data?.detail || 'Google login failed';
          toast.error(message);
          return { success: false, error: message };
        }
      },

      // Get current user
      getCurrentUser: async () => {
        try {
          const response = await axios.get('/auth/me');
          set({ user: response.data });
          return response.data;
        } catch (error) {
          throw error;
        }
      },

      // Logout
      logout: () => {
        set({ user: null, token: null });
        delete axios.defaults.headers.common['Authorization'];
        toast.success('Logged out successfully');
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        token: state.token,
        user: state.user 
      }),
    }
  )
);
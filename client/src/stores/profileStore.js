import { create } from 'zustand';
import axios from 'axios';
import toast from 'react-hot-toast';

export const useProfileStore = create((set, get) => ({
  profile: null,
  workExperiences: [],
  constants: null,
  completionStatus: null,
  loading: false,

  // Fetch profile constants
  fetchConstants: async () => {
    try {
      const response = await axios.get('/profile/constants');
      set({ constants: response.data });
      return response.data;
    } catch (error) {
      toast.error('Failed to load form options');
      throw error;
    }
  },

  // Get current user profile
  fetchProfile: async () => {
    set({ loading: true });
    try {
      const response = await axios.get('/profile/me');
      set({ profile: response.data, loading: false });
      return response.data;
    } catch (error) {
      set({ loading: false });
      if (error.response?.status === 404) {
        // Profile doesn't exist yet, that's ok
        return null;
      }
      toast.error('Failed to load profile');
      throw error;
    }
  },

  // Create or update profile with improved error handling
  updateProfile: async (profileData) => {
    try {
      console.log('Sending profile data:', profileData);
      const response = await axios.post('/profile/setup', profileData);
      set({ profile: response.data });
      toast.success('Profile updated successfully!');
      return response.data;
    } catch (error) {
      console.error('Profile update error:', error);
      
      // Handle different types of errors
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        
        if (Array.isArray(detail)) {
          // Pydantic validation errors
          const errorMessages = detail.map(err => {
            const field = err.loc?.slice(-1)[0] || 'field';
            return `${field}: ${err.msg}`;
          });
          
          // Show first error as toast, log all errors
          toast.error(`Validation error: ${errorMessages[0]}`);
          console.error('All validation errors:', errorMessages);
        } else if (typeof detail === 'string') {
          // Simple string error
          toast.error(detail);
        } else {
          // Object error
          toast.error('Invalid profile data provided');
        }
      } else if (error.response?.status === 422) {
        toast.error('Please check your input data and try again');
      } else if (error.response?.status === 400) {
        toast.error('Invalid request. Please check your data.');
      } else {
        toast.error('Failed to update profile. Please try again.');
      }
      
      throw error;
    }
  },

  // Get profile completion status
  fetchCompletionStatus: async () => {
    try {
      const response = await axios.get('/profile/completion');
      set({ completionStatus: response.data });
      return response.data;
    } catch (error) {
      toast.error('Failed to load completion status');
      throw error;
    }
  },

  // Check agent requirements
  checkAgentRequirements: async (agentType) => {
    try {
      const response = await axios.get(`/profile/agent-requirements/${agentType}`);
      return response.data;
    } catch (error) {
      console.error('Failed to check agent requirements:', error);
      return {
        requirements_met: false,
        missing_requirements: ['Unable to check requirements'],
        agent_type: agentType
      };
    }
  },

  // Work Experience methods
  fetchWorkExperiences: async () => {
    try {
      const response = await axios.get('/profile/work-experience');
      set({ workExperiences: response.data });
      return response.data;
    } catch (error) {
      toast.error('Failed to load work experiences');
      throw error;
    }
  },

  createWorkExperience: async (workData) => {
    try {
      const response = await axios.post('/profile/work-experience', workData);
      const experiences = get().workExperiences;
      set({ workExperiences: [...experiences, response.data] });
      toast.success('Work experience added!');
      return response.data;
    } catch (error) {
      console.error('Work experience creation error:', error);
      
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        
        if (Array.isArray(detail)) {
          const errorMessages = detail.map(err => `${err.loc?.slice(-1)[0]}: ${err.msg}`);
          toast.error(`Validation error: ${errorMessages[0]}`);
        } else {
          toast.error(typeof detail === 'string' ? detail : 'Invalid work experience data');
        }
      } else {
        toast.error('Failed to add work experience');
      }
      throw error;
    }
  },

  updateWorkExperience: async (id, workData) => {
    try {
      const response = await axios.put(`/profile/work-experience/${id}`, workData);
      const experiences = get().workExperiences;
      const updatedExperiences = experiences.map(exp => 
        exp.id === id ? response.data : exp
      );
      set({ workExperiences: updatedExperiences });
      toast.success('Work experience updated!');
      return response.data;
    } catch (error) {
      console.error('Work experience update error:', error);
      
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        
        if (Array.isArray(detail)) {
          const errorMessages = detail.map(err => `${err.loc?.slice(-1)[0]}: ${err.msg}`);
          toast.error(`Validation error: ${errorMessages[0]}`);
        } else {
          toast.error(typeof detail === 'string' ? detail : 'Invalid work experience data');
        }
      } else {
        toast.error('Failed to update work experience');
      }
      throw error;
    }
  },

  deleteWorkExperience: async (id) => {
    try {
      await axios.delete(`/profile/work-experience/${id}`);
      const experiences = get().workExperiences;
      const filteredExperiences = experiences.filter(exp => exp.id !== id);
      set({ workExperiences: filteredExperiences });
      toast.success('Work experience deleted!');
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to delete work experience';
      toast.error(message);
      throw error;
    }
  },

  // Clear store data
  clearProfile: () => {
    set({
      profile: null,
      workExperiences: [],
      completionStatus: null,
    });
  },
}));
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
      toast.error('Failed to load profile');
      throw error;
    }
  },

  // Create or update profile
  updateProfile: async (profileData) => {
    try {
      const response = await axios.post('/profile/setup', profileData);
      set({ profile: response.data });
      toast.success('Profile updated successfully!');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to update profile';
      toast.error(message);
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
      const message = error.response?.data?.detail || 'Failed to add work experience';
      toast.error(message);
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
      const message = error.response?.data?.detail || 'Failed to update work experience';
      toast.error(message);
      throw error;
    }
  },

  deleteWorkExperience: async (id) => {
    try {
      await axios.delete(`/profile/work-experience/${id}`);
      const experiences = get().workExperiences;
      set({ workExperiences: experiences.filter(exp => exp.id !== id) });
      toast.success('Work experience deleted!');
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to delete work experience';
      toast.error(message);
      throw error;
    }
  },

  // Check agent requirements
  checkAgentRequirements: async (agentType) => {
    try {
      const response = await axios.get(`/profile/agent-requirements/${agentType}`);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to check requirements';
      toast.error(message);
      throw error;
    }
  },
}));
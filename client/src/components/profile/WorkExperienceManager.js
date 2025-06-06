import React, { useState, useEffect } from 'react';
import Button from '../common/Button';
import Input from '../common/Input';
import { profileAPI } from '../../services/api';

const WorkExperienceForm = ({ experience = null, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    company_name: '',
    role: '',
    start_date: '',
    end_date: '',
    is_current: false,
    description: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (experience) {
      setFormData({
        company_name: experience.company_name || '',
        role: experience.role || '',
        start_date: experience.start_date || '',
        end_date: experience.end_date || '',
        is_current: experience.is_current || false,
        description: experience.description || '',
      });
    }
  }, [experience]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear end_date if marking as current
    if (name === 'is_current' && checked) {
      setFormData(prev => ({ ...prev, end_date: '' }));
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.company_name.trim()) newErrors.company_name = 'Company name is required';
    if (!formData.role.trim()) newErrors.role = 'Role is required';
    if (!formData.start_date) newErrors.start_date = 'Start date is required';
    if (!formData.is_current && !formData.end_date) {
      newErrors.end_date = 'End date is required (or mark as current position)';
    }

    // Date validation
    if (formData.start_date && formData.end_date) {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      if (endDate < startDate) {
        newErrors.end_date = 'End date cannot be before start date';
      }
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      // Clean data - remove end_date if current position
      const submitData = { ...formData };
      if (submitData.is_current) {
        submitData.end_date = null;
      }

      if (experience) {
        await profileAPI.updateWorkExperience(experience.id, submitData);
      } else {
        await profileAPI.createWorkExperience(submitData);
      }
      
      onSave();
    } catch (error) {
      console.error('Failed to save work experience:', error);
      setErrors({ submit: error.response?.data?.detail || 'Failed to save work experience' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Company Name"
          name="company_name"
          value={formData.company_name}
          onChange={handleChange}
          error={errors.company_name}
          placeholder="e.g., Google"
          required
        />
        
        <Input
          label="Role/Position"
          name="role"
          value={formData.role}
          onChange={handleChange}
          error={errors.role}
          placeholder="e.g., Software Engineer"
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Start Date"
          name="start_date"
          type="date"
          value={formData.start_date}
          onChange={handleChange}
          error={errors.start_date}
          required
        />
        
        <Input
          label="End Date"
          name="end_date"
          type="date"
          value={formData.end_date}
          onChange={handleChange}
          error={errors.end_date}
          disabled={formData.is_current}
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="is_current"
          name="is_current"
          checked={formData.is_current}
          onChange={handleChange}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="is_current" className="ml-2 text-sm text-gray-700">
          This is my current position
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description (Optional)
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows="3"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Brief description of your role and responsibilities..."
        />
      </div>

      {errors.submit && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-600">{errors.submit}</p>
        </div>
      )}

      <div className="flex justify-end space-x-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          {experience ? 'Update' : 'Add'} Experience
        </Button>
      </div>
    </form>
  );
};

const WorkExperienceManager = () => {
  const [experiences, setExperiences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingExperience, setEditingExperience] = useState(null);

  useEffect(() => {
    loadExperiences();
  }, []);

  const loadExperiences = async () => {
    try {
      const data = await profileAPI.getWorkExperiences();
      setExperiences(data);
    } catch (error) {
      console.error('Failed to load work experiences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingExperience(null);
    setShowForm(true);
  };

  const handleEdit = (experience) => {
    setEditingExperience(experience);
    setShowForm(true);
  };

  const handleDelete = async (experienceId) => {
    if (!window.confirm('Are you sure you want to delete this work experience?')) {
      return;
    }

    try {
      await profileAPI.deleteWorkExperience(experienceId);
      loadExperiences(); // Reload the list
    } catch (error) {
      console.error('Failed to delete work experience:', error);
    }
  };

  const handleFormSave = () => {
    setShowForm(false);
    setEditingExperience(null);
    loadExperiences(); // Reload the list
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingExperience(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short'
    });
  };

  const calculateDuration = (startDate, endDate, isCurrent) => {
    const start = new Date(startDate);
    const end = isCurrent ? new Date() : new Date(endDate);
    
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    
    if (months < 1) return '< 1 month';
    if (months < 12) return `${months} month${months > 1 ? 's' : ''}`;
    
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    
    let duration = `${years} year${years > 1 ? 's' : ''}`;
    if (remainingMonths > 0) {
      duration += ` ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
    }
    
    return duration;
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading work experiences...</p>
      </div>
    );
  }

  if (showForm) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {editingExperience ? 'Edit' : 'Add'} Work Experience
          </h2>
        </div>
        <WorkExperienceForm
          experience={editingExperience}
          onSave={handleFormSave}
          onCancel={handleFormCancel}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Work Experience</h2>
        <Button onClick={handleAdd}>
          Add Experience
        </Button>
      </div>

      {experiences.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No work experience added</h3>
          <p className="text-gray-600 mb-4">
            Add your work experiences to help AI assistants provide better recommendations.
          </p>
          <Button onClick={handleAdd}>
            Add Your First Experience
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {experiences.map((experience) => (
            <div key={experience.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{experience.role}</h3>
                      <p className="text-blue-600 font-medium">{experience.company_name}</p>
                    </div>
                    {experience.is_current && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Current
                      </span>
                    )}
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-2">
                    {formatDate(experience.start_date)} - {experience.is_current ? 'Present' : formatDate(experience.end_date)}
                    <span className="mx-2">•</span>
                    {calculateDuration(experience.start_date, experience.end_date, experience.is_current)}
                  </div>
                  
                  {experience.description && (
                    <p className="text-gray-700 text-sm mt-2">{experience.description}</p>
                  )}
                </div>
                
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => handleEdit(experience)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(experience.id)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WorkExperienceManager;
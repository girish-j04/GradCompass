import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  PlusIcon,
  BriefcaseIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useProfileStore } from '../stores/profileStore';
import { useThemeStore } from '../stores/themeStore';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import FormInput from '../components/ui/FormInput';
import FormTextarea from '../components/ui/FormTextarea';

const schema = yup.object({
  company_name: yup.string().required('Company name is required'),
  role: yup.string().required('Role is required'),
  start_date: yup.date().required('Start date is required'),
  end_date: yup.date().nullable().when('is_current', {
    is: false,
    then: (schema) => schema.required('End date is required for past positions'),
    otherwise: (schema) => schema.nullable(),
  }),
  is_current: yup.boolean(),
  description: yup.string(),
});

function WorkExperiencePage() {
  const [showForm, setShowForm] = useState(false);
  const [editingExperience, setEditingExperience] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const { 
    workExperiences, 
    fetchWorkExperiences, 
    createWorkExperience, 
    updateWorkExperience, 
    deleteWorkExperience 
  } = useProfileStore();
  const { theme } = useThemeStore();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      is_current: false,
    },
  });

  const watchIsCurrent = watch('is_current');

  useEffect(() => {
    fetchWorkExperiences();
  }, [fetchWorkExperiences]);

  const handleAddNew = () => {
    reset({
      company_name: '',
      role: '',
      start_date: '',
      end_date: '',
      is_current: false,
      description: '',
    });
    setEditingExperience(null);
    setShowForm(true);
  };

  const handleEdit = (experience) => {
    reset({
      company_name: experience.company_name,
      role: experience.role,
      start_date: experience.start_date,
      end_date: experience.end_date,
      is_current: experience.is_current,
      description: experience.description || '',
    });
    setEditingExperience(experience);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this work experience?')) {
      await deleteWorkExperience(id);
    }
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      if (editingExperience) {
        await updateWorkExperience(editingExperience.id, data);
      } else {
        await createWorkExperience(data);
      }
      setShowForm(false);
      setEditingExperience(null);
      reset();
    } catch (error) {
      console.error('Failed to save work experience:', error);
    } finally {
      setLoading(false);
    }
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
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    
    if (years === 0) {
      return `${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`;
    } else if (remainingMonths === 0) {
      return `${years} year${years !== 1 ? 's' : ''}`;
    } else {
      return `${years} year${years !== 1 ? 's' : ''} ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-4xl font-display font-bold ${
              theme === 'dark' ? 'text-mocha-text' : 'text-latte-text'
            }`}>
              Work Experience
            </h1>
            <p className={`mt-2 text-lg ${
              theme === 'dark' ? 'text-mocha-subtext0' : 'text-latte-subtext0'
            }`}>
              Add your professional background to strengthen your profile
            </p>
          </div>
          
          <button
            onClick={handleAddNew}
            className={`inline-flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-300 hover:scale-105 ${
              theme === 'dark'
                ? 'bg-mocha-mauve text-mocha-crust hover:bg-mocha-pink'
                : 'bg-latte-mauve text-latte-base hover:bg-latte-pink'
            }`}
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Experience
          </button>
        </div>
      </motion.div>

      {/* Experience Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-8 ${
                theme === 'dark'
                  ? 'bg-mocha-base border border-mocha-surface1'
                  : 'bg-latte-base border border-latte-surface1'
              }`}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-2xl font-bold ${
                  theme === 'dark' ? 'text-mocha-text' : 'text-latte-text'
                }`}>
                  {editingExperience ? 'Edit' : 'Add'} Work Experience
                </h2>
                <button
                  onClick={() => setShowForm(false)}
                  className={`p-2 rounded-lg transition-colors ${
                    theme === 'dark'
                      ? 'text-mocha-subtext0 hover:text-mocha-text hover:bg-mocha-surface0'
                      : 'text-latte-subtext0 hover:text-latte-text hover:bg-latte-surface0'
                  }`}
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormInput
                    label="Company Name"
                    {...register('company_name')}
                    error={errors.company_name?.message}
                    placeholder="e.g., Google"
                    theme={theme}
                  />

                  <FormInput
                    label="Role"
                    {...register('role')}
                    error={errors.role?.message}
                    placeholder="e.g., Software Engineer"
                    theme={theme}
                  />

                  <FormInput
                    label="Start Date"
                    type="date"
                    {...register('start_date')}
                    error={errors.start_date?.message}
                    theme={theme}
                  />

                  <div>
                    <div className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        {...register('is_current')}
                        className={`h-4 w-4 rounded border-2 ${
                          theme === 'dark'
                            ? 'border-mocha-surface2 text-mocha-mauve focus:ring-mocha-mauve bg-mocha-base'
                            : 'border-latte-surface2 text-latte-mauve focus:ring-latte-mauve bg-latte-base'
                        }`}
                      />
                      <label className={`ml-2 text-sm font-medium ${
                        theme === 'dark' ? 'text-mocha-text' : 'text-latte-text'
                      }`}>
                        I currently work here
                      </label>
                    </div>
                    
                    {!watchIsCurrent && (
                      <FormInput
                        label="End Date"
                        type="date"
                        {...register('end_date')}
                        error={errors.end_date?.message}
                        theme={theme}
                      />
                    )}
                  </div>
                </div>

                <FormTextarea
                  label="Description (Optional)"
                  {...register('description')}
                  error={errors.description?.message}
                  placeholder="Describe your key responsibilities and achievements..."
                  rows={4}
                  theme={theme}
                />

                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                      theme === 'dark'
                        ? 'text-mocha-text bg-mocha-surface0 hover:bg-mocha-surface1'
                        : 'text-latte-text bg-latte-surface0 hover:bg-latte-surface1'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className={`px-6 py-2 rounded-lg font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                      theme === 'dark'
                        ? 'bg-mocha-mauve text-mocha-crust hover:bg-mocha-pink'
                        : 'bg-latte-mauve text-latte-base hover:bg-latte-pink'
                    } ${!loading ? 'hover:scale-105' : ''}`}
                  >
                    {loading ? <LoadingSpinner size="sm" /> : editingExperience ? 'Update' : 'Add'} Experience
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Experience List */}
      <div className="space-y-6">
        {workExperiences.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className={`text-center py-12 rounded-2xl border-2 border-dashed ${
              theme === 'dark'
                ? 'border-mocha-surface1 text-mocha-subtext0'
                : 'border-latte-surface1 text-latte-subtext0'
            }`}
          >
            <BriefcaseIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No work experience added yet</h3>
            <p className="mb-4">Add your professional background to strengthen your profile</p>
            <button
              onClick={handleAddNew}
              className={`inline-flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-300 hover:scale-105 ${
                theme === 'dark'
                  ? 'bg-mocha-mauve text-mocha-crust hover:bg-mocha-pink'
                  : 'bg-latte-mauve text-latte-base hover:bg-latte-pink'
              }`}
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Your First Experience
            </button>
          </motion.div>
        ) : (
          workExperiences.map((experience, index) => (
            <motion.div
              key={experience.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className={`rounded-2xl p-6 backdrop-blur-sm border transition-all duration-300 hover:scale-[1.02] ${
                theme === 'dark'
                  ? 'bg-mocha-surface0/30 border-mocha-surface1/30 hover:bg-mocha-surface0/50'
                  : 'bg-latte-surface0/30 border-latte-surface1/30 hover:bg-latte-surface0/50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <BuildingOfficeIcon className={`h-5 w-5 mr-2 ${
                      theme === 'dark' ? 'text-mocha-mauve' : 'text-latte-mauve'
                    }`} />
                    <h3 className={`text-lg font-semibold ${
                      theme === 'dark' ? 'text-mocha-text' : 'text-latte-text'
                    }`}>
                      {experience.role}
                    </h3>
                  </div>
                  
                  <p className={`text-lg font-medium mb-2 ${
                    theme === 'dark' ? 'text-mocha-subtext0' : 'text-latte-subtext0'
                  }`}>
                    {experience.company_name}
                  </p>

                  <div className="flex items-center mb-3">
                    <CalendarIcon className={`h-4 w-4 mr-2 ${
                      theme === 'dark' ? 'text-mocha-subtext1' : 'text-latte-subtext1'
                    }`} />
                    <span className={`text-sm ${
                      theme === 'dark' ? 'text-mocha-subtext1' : 'text-latte-subtext1'
                    }`}>
                      {formatDate(experience.start_date)} - {experience.is_current ? 'Present' : formatDate(experience.end_date)}
                    </span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                      theme === 'dark'
                        ? 'bg-mocha-surface1/50 text-mocha-subtext0'
                        : 'bg-latte-surface1/50 text-latte-subtext0'
                    }`}>
                      {calculateDuration(experience.start_date, experience.end_date, experience.is_current)}
                    </span>
                  </div>

                  {experience.description && (
                    <p className={`text-sm ${
                      theme === 'dark' ? 'text-mocha-subtext0' : 'text-latte-subtext0'
                    }`}>
                      {experience.description}
                    </p>
                  )}

                  {experience.is_current && (
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-2 ${
                      theme === 'dark'
                        ? 'bg-mocha-green/20 text-mocha-green'
                        : 'bg-latte-green/20 text-latte-green'
                    }`}>
                      Current Position
                    </span>
                  )}
                </div>

                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => handleEdit(experience)}
                    className={`p-2 rounded-lg transition-colors ${
                      theme === 'dark'
                        ? 'text-mocha-blue hover:bg-mocha-blue/20'
                        : 'text-latte-blue hover:bg-latte-blue/20'
                    }`}
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(experience.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      theme === 'dark'
                        ? 'text-mocha-red hover:bg-mocha-red/20'
                        : 'text-latte-red hover:bg-latte-red/20'
                    }`}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

export default WorkExperiencePage;
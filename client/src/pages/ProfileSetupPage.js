import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  UserIcon,
  AcademicCapIcon,
  ClipboardDocumentListIcon,
  CogIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { useProfileStore } from '../stores/profileStore';
import { useThemeStore } from '../stores/themeStore';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import FormInput from '../components/ui/FormInput';
import FormSelect from '../components/ui/FormSelect';
import FormMultiSelect from '../components/ui/FormMultiSelect';

// Updated schema with proper date handling
const schema = yup.object({
  // Academic Background
  undergraduate_college: yup.string().required('College name is required'),
  major: yup.string().required('Major is required'),
  gpa: yup.number().required('GPA is required').positive('GPA must be positive'),
  gpa_scale: yup.string().required('GPA scale is required'),
  graduation_year: yup.number()
    .required('Graduation year is required')
    .min(1950, 'Graduation year must be after 1950')
    .max(new Date().getFullYear() + 10, `Graduation year must be before ${new Date().getFullYear() + 10}`),
  
  // Test Scores (at least one required) - Fixed date handling
  gre_score: yup.number()
    .nullable()
    .transform((value) => (value === '' || isNaN(value)) ? null : value)
    .min(260, 'GRE score must be between 260-340')
    .max(340, 'GRE score must be between 260-340'),
  gre_date: yup.date().nullable().transform((value) => value || null),
  toefl_score: yup.number()
    .nullable()
    .transform((value) => (value === '' || isNaN(value)) ? null : value)
    .min(0, 'TOEFL score must be between 0-120')
    .max(120, 'TOEFL score must be between 0-120'),
  toefl_date: yup.date().nullable().transform((value) => value || null),
  ielts_score: yup.number()
    .nullable()
    .transform((value) => (value === '' || isNaN(value)) ? null : value)
    .min(0, 'IELTS score must be between 0-9')
    .max(9, 'IELTS score must be between 0-9'),
  ielts_date: yup.date().nullable().transform((value) => value || null),
  
  // Goals & Preferences
  target_degree: yup.string().required('Target degree is required'),
  preferred_countries: yup.array().min(1, 'Select at least one country'),
  target_field: yup.string().required('Target field is required'),
  budget_range: yup.string().required('Budget range is required'),
  application_timeline: yup.string().required('Application timeline is required'),
}).test('at-least-one-test-score', 'At least one test score is required', function(values) {
  const { gre_score, toefl_score, ielts_score } = values;
  if (!gre_score && !toefl_score && !ielts_score) {
    return this.createError({
      message: 'Please provide at least one test score (GRE, TOEFL, or IELTS)',
      path: 'test_scores'
    });
  }
  return true;
});

const steps = [
  {
    id: 1,
    name: 'Academic Background',
    icon: AcademicCapIcon,
    fields: ['undergraduate_college', 'major', 'gpa', 'gpa_scale', 'graduation_year'],
  },
  {
    id: 2,
    name: 'Test Scores',
    icon: ClipboardDocumentListIcon,
    fields: ['gre_score', 'gre_date', 'toefl_score', 'toefl_date', 'ielts_score', 'ielts_date'],
  },
  {
    id: 3,
    name: 'Goals & Preferences',
    icon: CogIcon,
    fields: ['target_degree', 'preferred_countries', 'target_field', 'budget_range', 'application_timeline'],
  },
];

function ProfileSetupPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const { 
    profile, 
    constants, 
    fetchProfile, 
    fetchConstants, 
    updateProfile 
  } = useProfileStore();
  const { theme } = useThemeStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
    trigger,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      preferred_countries: [],
    },
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [profileData] = await Promise.all([
          fetchProfile(),
          fetchConstants(),
        ]);
        
        // Populate form with existing profile data
        if (profileData) {
          Object.keys(profileData).forEach((key) => {
            if (profileData[key] !== null && profileData[key] !== undefined) {
              // Handle date fields properly
              if (key.endsWith('_date') && profileData[key]) {
                setValue(key, profileData[key].split('T')[0]); // Convert to YYYY-MM-DD format
              } else {
                setValue(key, profileData[key]);
              }
            }
          });
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };
    
    loadData();
  }, [fetchProfile, fetchConstants, setValue]);

  // Function to format data before sending to backend
  const formatDataForBackend = (data) => {
    const formatted = { ...data };
    
    // Convert date strings to proper format
    ['gre_date', 'toefl_date', 'ielts_date'].forEach(dateField => {
      if (formatted[dateField]) {
        // Ensure date is in YYYY-MM-DD format
        const date = new Date(formatted[dateField]);
        if (!isNaN(date.getTime())) {
          formatted[dateField] = date.toISOString().split('T')[0];
        } else {
          formatted[dateField] = null;
        }
      } else {
        formatted[dateField] = null;
      }
    });
    
    // Convert empty strings to null for numeric fields
    ['gre_score', 'toefl_score', 'ielts_score'].forEach(scoreField => {
      if (formatted[scoreField] === '' || formatted[scoreField] === undefined) {
        formatted[scoreField] = null;
      } else if (formatted[scoreField] !== null) {
        formatted[scoreField] = Number(formatted[scoreField]);
      }
    });
    
    // Ensure GPA is a number
    if (formatted.gpa) {
      formatted.gpa = Number(formatted.gpa);
    }
    
    // Ensure graduation_year is a number
    if (formatted.graduation_year) {
      formatted.graduation_year = Number(formatted.graduation_year);
    }
    
    return formatted;
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const formattedData = formatDataForBackend(data);
      console.log('Sending data:', formattedData); // Debug log
      
      await updateProfile(formattedData);
      navigate('/dashboard');
    } catch (error) {
      console.error('Profile update error:', error);
      
      // Improved error handling
      if (error.response?.data?.detail) {
        const details = error.response.data.detail;
        if (Array.isArray(details)) {
          // Handle Pydantic validation errors
          const errorMessages = details.map(err => `${err.loc?.join('.')} - ${err.msg}`);
          console.error('Validation errors:', errorMessages);
        } else if (typeof details === 'string') {
          console.error('Error:', details);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    const currentStepFields = steps.find(step => step.id === currentStep)?.fields || [];
    const isValid = await trigger(currentStepFields);
    
    if (isValid) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const renderStepContent = () => {
    const currentStepData = steps.find(step => step.id === currentStep);
    if (!currentStepData) return null;

    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <FormInput
              label="Undergraduate College"
              type="text"
              {...register('undergraduate_college')}
              error={errors.undergraduate_college?.message}
              placeholder="e.g., University of California, Berkeley"
              theme={theme}
            />
            
            <FormInput
              label="Major"
              type="text"
              {...register('major')}
              error={errors.major?.message}
              placeholder="e.g., Computer Science"
              theme={theme}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="GPA"
                type="number"
                step="0.01"
                {...register('gpa')}
                error={errors.gpa?.message}
                placeholder="e.g., 3.75"
                theme={theme}
              />
              
              <Controller
                name="gpa_scale"
                control={control}
                render={({ field }) => (
                  <FormSelect
                    label="GPA Scale"
                    options={constants?.gpa_scales || []}
                    error={errors.gpa_scale?.message}
                    theme={theme}
                    {...field}
                  />
                )}
              />
            </div>
            
            <FormInput
              label="Graduation Year"
              type="number"
              {...register('graduation_year')}
              error={errors.graduation_year?.message}
              placeholder="e.g., 2024"
              theme={theme}
            />
          </div>
        );
      
      case 2:
        return (
          <div className="space-y-6">
            <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-mocha-subtext0' : 'text-latte-subtext0'}`}>
              Provide at least one test score. Leave others blank if not taken.
            </p>
            
            {errors.test_scores && (
              <div className={`p-3 rounded-lg border ${
                theme === 'dark' 
                  ? 'bg-mocha-red/10 border-mocha-red/20 text-mocha-red' 
                  : 'bg-latte-red/10 border-latte-red/20 text-latte-red'
              }`}>
                {errors.test_scores.message}
              </div>
            )}
            
            {/* GRE Section */}
            <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'border-mocha-surface1' : 'border-latte-surface1'}`}>
              <h3 className={`font-medium mb-3 ${theme === 'dark' ? 'text-mocha-text' : 'text-latte-text'}`}>GRE</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  label="GRE Score (260-340)"
                  type="number"
                  min="260"
                  max="340"
                  {...register('gre_score')}
                  error={errors.gre_score?.message}
                  placeholder="e.g., 325"
                  theme={theme}
                />
                <FormInput
                  label="Test Date"
                  type="date"
                  {...register('gre_date')}
                  error={errors.gre_date?.message}
                  theme={theme}
                />
              </div>
            </div>
            
            {/* TOEFL Section */}
            <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'border-mocha-surface1' : 'border-latte-surface1'}`}>
              <h3 className={`font-medium mb-3 ${theme === 'dark' ? 'text-mocha-text' : 'text-latte-text'}`}>TOEFL</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  label="TOEFL Score (0-120)"
                  type="number"
                  min="0"
                  max="120"
                  {...register('toefl_score')}
                  error={errors.toefl_score?.message}
                  placeholder="e.g., 110"
                  theme={theme}
                />
                <FormInput
                  label="Test Date"
                  type="date"
                  {...register('toefl_date')}
                  error={errors.toefl_date?.message}
                  theme={theme}
                />
              </div>
            </div>
            
            {/* IELTS Section */}
            <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'border-mocha-surface1' : 'border-latte-surface1'}`}>
              <h3 className={`font-medium mb-3 ${theme === 'dark' ? 'text-mocha-text' : 'text-latte-text'}`}>IELTS</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  label="IELTS Score (0-9)"
                  type="number"
                  step="0.5"
                  min="0"
                  max="9"
                  {...register('ielts_score')}
                  error={errors.ielts_score?.message}
                  placeholder="e.g., 8.0"
                  theme={theme}
                />
                <FormInput
                  label="Test Date"
                  type="date"
                  {...register('ielts_date')}
                  error={errors.ielts_date?.message}
                  theme={theme}
                />
              </div>
            </div>
          </div>
        );
      
      case 3:
        return (
          <div className="space-y-6">
            <Controller
              name="target_degree"
              control={control}
              render={({ field }) => (
                <FormSelect
                  label="Target Degree"
                  options={constants?.target_degrees || []}
                  error={errors.target_degree?.message}
                  theme={theme}
                  {...field}
                />
              )}
            />
            
            <Controller
              name="preferred_countries"
              control={control}
              render={({ field }) => (
                <FormMultiSelect
                  label="Preferred Countries"
                  options={constants?.preferred_countries || []}
                  error={errors.preferred_countries?.message}
                  theme={theme}
                  {...field}
                />
              )}
            />
            
            <Controller
              name="target_field"
              control={control}
              render={({ field }) => (
                <FormSelect
                  label="Target Field"
                  options={constants?.target_fields || []}
                  error={errors.target_field?.message}
                  theme={theme}
                  {...field}
                />
              )}
            />
            
            <Controller
              name="budget_range"
              control={control}
              render={({ field }) => (
                <FormSelect
                  label="Budget Range"
                  options={constants?.budget_ranges || []}
                  error={errors.budget_range?.message}
                  theme={theme}
                  {...field}
                />
              )}
            />
            
            <Controller
              name="application_timeline"
              control={control}
              render={({ field }) => (
                <FormSelect
                  label="Application Timeline"
                  options={constants?.application_timelines || []}
                  error={errors.application_timeline?.message}
                  theme={theme}
                  {...field}
                />
              )}
            />
          </div>
        );
      
      default:
        return null;
    }
  };

  if (!constants) {
    return <LoadingSpinner />;
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <h1 className={`text-3xl font-display font-bold ${
          theme === 'dark' ? 'text-mocha-text' : 'text-latte-text'
        }`}>
          Complete Your Profile
        </h1>
        <p className={`mt-2 text-lg ${
          theme === 'dark' ? 'text-mocha-subtext0' : 'text-latte-subtext0'
        }`}>
          Help us personalize your graduate school journey
        </p>
      </motion.div>

      {/* Progress Steps */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            
            return (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-200 ${
                    isCompleted
                      ? theme === 'dark'
                        ? 'bg-mocha-green border-mocha-green'
                        : 'bg-latte-green border-latte-green'
                      : isCurrent
                      ? theme === 'dark'
                        ? 'bg-mocha-mauve border-mocha-mauve'
                        : 'bg-latte-mauve border-latte-mauve'
                      : theme === 'dark'
                        ? 'bg-mocha-surface0 border-mocha-surface1'
                        : 'bg-latte-surface0 border-latte-surface1'
                  }`}>
                    {isCompleted ? (
                      <CheckCircleIcon className="w-6 h-6 text-white" />
                    ) : (
                      <Icon className={`w-6 h-6 ${
                        isCurrent 
                          ? 'text-white' 
                          : theme === 'dark' 
                            ? 'text-mocha-subtext1' 
                            : 'text-latte-subtext1'
                      }`} />
                    )}
                  </div>
                  <span className={`mt-2 text-xs font-medium text-center ${
                    isCurrent || isCompleted
                      ? theme === 'dark' ? 'text-mocha-text' : 'text-latte-text'
                      : theme === 'dark' ? 'text-mocha-subtext1' : 'text-latte-subtext1'
                  }`}>
                    {step.name}
                  </span>
                </div>
                
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-px mx-4 ${
                    isCompleted
                      ? theme === 'dark' ? 'bg-mocha-green' : 'bg-latte-green'
                      : theme === 'dark' ? 'bg-mocha-surface1' : 'bg-latte-surface1'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className={`rounded-2xl p-8 mb-8 border backdrop-blur-sm ${
            theme === 'dark'
              ? 'bg-mocha-surface0/50 border-mocha-surface1/30'
              : 'bg-latte-surface0/50 border-latte-surface1/30'
          }`}
        >
          <h2 className={`text-xl font-semibold mb-6 ${
            theme === 'dark' ? 'text-mocha-text' : 'text-latte-text'
          }`}>
            {steps.find(step => step.id === currentStep)?.name}
          </h2>
          
          {renderStepContent()}
        </motion.div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className={`inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg transition-all duration-200 ${
              currentStep === 1
                ? 'opacity-50 cursor-not-allowed'
                : ''
            } ${
              theme === 'dark'
                ? 'text-mocha-text bg-mocha-surface0 hover:bg-mocha-surface1'
                : 'text-latte-text bg-latte-surface0 hover:bg-latte-surface1'
            }`}
          >
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            Previous
          </button>

          {currentStep < steps.length ? (
            <button
              type="button"
              onClick={handleNext}
              className={`inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg transition-all duration-200 ${
                theme === 'dark'
                  ? 'text-mocha-crust bg-mocha-mauve hover:bg-mocha-pink'
                  : 'text-latte-base bg-latte-mauve hover:bg-latte-pink'
              } hover:scale-105 transform`}
            >
              Next
              <ArrowRightIcon className="ml-2 h-4 w-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className={`inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg transition-all duration-200 ${
                theme === 'dark'
                  ? 'text-mocha-crust bg-mocha-green hover:bg-mocha-teal'
                  : 'text-latte-base bg-latte-green hover:bg-latte-teal'
              } hover:scale-105 transform disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
            >
              {loading ? <LoadingSpinner size="sm" /> : (
                <>
                  Complete Profile
                  <CheckCircleIcon className="ml-2 h-4 w-4" />
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default ProfileSetupPage;
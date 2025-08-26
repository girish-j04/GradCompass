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

const schema = yup.object({
  // Academic Background
  undergraduate_college: yup.string().required('College name is required'),
  major: yup.string().required('Major is required'),
  gpa: yup.number().required('GPA is required').positive('GPA must be positive'),
  gpa_scale: yup.string().required('GPA scale is required'),
  graduation_year: yup.number().required('Graduation year is required'),
  
  // Test Scores (at least one required)
  gre_score: yup.number().nullable().transform((value) => value || null),
  gre_date: yup.date().nullable().transform((value) => value || null),
  toefl_score: yup.number().nullable().transform((value) => value || null),
  toefl_date: yup.date().nullable().transform((value) => value || null),
  ielts_score: yup.number().nullable().transform((value) => value || null),
  ielts_date: yup.date().nullable().transform((value) => value || null),
  
  // Goals & Preferences
  target_degree: yup.string().required('Target degree is required'),
  preferred_countries: yup.array().min(1, 'Select at least one country'),
  target_field: yup.string().required('Target field is required'),
  budget_range: yup.string().required('Budget range is required'),
  application_timeline: yup.string().required('Application timeline is required'),
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
        
        // Pre-fill form with existing profile data
        if (profileData) {
          Object.keys(profileData).forEach(key => {
            if (profileData[key] !== null && profileData[key] !== undefined) {
              setValue(key, profileData[key]);
            }
          });
        }
      } catch (error) {
        console.error('Failed to load profile data:', error);
      }
    };
    loadData();
  }, [fetchProfile, fetchConstants, setValue]);

  const watchedGpaScale = watch('gpa_scale');

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await updateProfile(data);
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    const currentStepFields = steps[currentStep - 1].fields;
    const isValid = await trigger(currentStepFields);
    
    if (isValid && currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!constants) {
    return <LoadingSpinner />;
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <AcademicCapIcon className={`h-12 w-12 mx-auto mb-4 ${
                theme === 'dark' ? 'text-mocha-mauve' : 'text-latte-mauve'
              }`} />
              <h2 className={`text-2xl font-bold ${
                theme === 'dark' ? 'text-mocha-text' : 'text-latte-text'
              }`}>
                Academic Background
              </h2>
              <p className={`mt-2 ${
                theme === 'dark' ? 'text-mocha-subtext0' : 'text-latte-subtext0'
              }`}>
                Tell us about your undergraduate education
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormInput
                label="Undergraduate College"
                {...register('undergraduate_college')}
                error={errors.undergraduate_college?.message}
                placeholder="e.g., University of California, Berkeley"
                theme={theme}
              />

              <FormInput
                label="Major"
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
                  placeholder="3.75"
                  theme={theme}
                />

                <FormSelect
                  label="GPA Scale"
                  {...register('gpa_scale')}
                  error={errors.gpa_scale?.message}
                  options={constants.gpa_scales}
                  theme={theme}
                />
              </div>

              <FormInput
                label="Graduation Year"
                type="number"
                {...register('graduation_year')}
                error={errors.graduation_year?.message}
                placeholder="2024"
                theme={theme}
              />
            </div>

            {watchedGpaScale && (
              <div className={`p-4 rounded-lg text-sm ${
                theme === 'dark'
                  ? 'bg-mocha-surface0/30 text-mocha-subtext0'
                  : 'bg-latte-surface0/30 text-latte-subtext0'
              }`}>
                <strong>GPA Range:</strong> {watchedGpaScale === '4.0' ? '0.0 - 4.0' : '0.0 - 10.0'}
              </div>
            )}
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <ClipboardDocumentListIcon className={`h-12 w-12 mx-auto mb-4 ${
                theme === 'dark' ? 'text-mocha-blue' : 'text-latte-blue'
              }`} />
              <h2 className={`text-2xl font-bold ${
                theme === 'dark' ? 'text-mocha-text' : 'text-latte-text'
              }`}>
                Test Scores
              </h2>
              <p className={`mt-2 ${
                theme === 'dark' ? 'text-mocha-subtext0' : 'text-latte-subtext0'
              }`}>
                Add your standardized test scores (at least one required)
              </p>
            </div>

            <div className="space-y-8">
              {/* GRE Section */}
              <div className={`p-6 rounded-xl border ${
                theme === 'dark'
                  ? 'bg-mocha-surface0/20 border-mocha-surface1/30'
                  : 'bg-latte-surface0/20 border-latte-surface1/30'
              }`}>
                <h3 className={`text-lg font-semibold mb-4 ${
                  theme === 'dark' ? 'text-mocha-text' : 'text-latte-text'
                }`}>
                  GRE (Graduate Record Examination)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput
                    label="GRE Score (260-340)"
                    type="number"
                    {...register('gre_score')}
                    error={errors.gre_score?.message}
                    placeholder="320"
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
              <div className={`p-6 rounded-xl border ${
                theme === 'dark'
                  ? 'bg-mocha-surface0/20 border-mocha-surface1/30'
                  : 'bg-latte-surface0/20 border-latte-surface1/30'
              }`}>
                <h3 className={`text-lg font-semibold mb-4 ${
                  theme === 'dark' ? 'text-mocha-text' : 'text-latte-text'
                }`}>
                  TOEFL (Test of English as a Foreign Language)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput
                    label="TOEFL Score (0-120)"
                    type="number"
                    {...register('toefl_score')}
                    error={errors.toefl_score?.message}
                    placeholder="100"
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
              <div className={`p-6 rounded-xl border ${
                theme === 'dark'
                  ? 'bg-mocha-surface0/20 border-mocha-surface1/30'
                  : 'bg-latte-surface0/20 border-latte-surface1/30'
              }`}>
                <h3 className={`text-lg font-semibold mb-4 ${
                  theme === 'dark' ? 'text-mocha-text' : 'text-latte-text'
                }`}>
                  IELTS (International English Language Testing System)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput
                    label="IELTS Score (0-9)"
                    type="number"
                    step="0.5"
                    {...register('ielts_score')}
                    error={errors.ielts_score?.message}
                    placeholder="7.5"
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
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <CogIcon className={`h-12 w-12 mx-auto mb-4 ${
                theme === 'dark' ? 'text-mocha-green' : 'text-latte-green'
              }`} />
              <h2 className={`text-2xl font-bold ${
                theme === 'dark' ? 'text-mocha-text' : 'text-latte-text'
              }`}>
                Goals & Preferences
              </h2>
              <p className={`mt-2 ${
                theme === 'dark' ? 'text-mocha-subtext0' : 'text-latte-subtext0'
              }`}>
                Tell us about your graduate school goals
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormSelect
                label="Target Degree"
                {...register('target_degree')}
                error={errors.target_degree?.message}
                options={constants.target_degrees}
                theme={theme}
              />

              <FormSelect
                label="Target Field"
                {...register('target_field')}
                error={errors.target_field?.message}
                options={constants.target_fields}
                theme={theme}
              />

              <div className="md:col-span-2">
                <Controller
                  name="preferred_countries"
                  control={control}
                  render={({ field }) => (
                    <FormMultiSelect
                      label="Preferred Countries"
                      {...field}
                      error={errors.preferred_countries?.message}
                      options={constants.preferred_countries}
                      theme={theme}
                    />
                  )}
                />
              </div>

              <FormSelect
                label="Budget Range"
                {...register('budget_range')}
                error={errors.budget_range?.message}
                options={constants.budget_ranges}
                theme={theme}
              />

              <FormSelect
                label="Application Timeline"
                {...register('application_timeline')}
                error={errors.application_timeline?.message}
                options={constants.application_timelines}
                theme={theme}
              />
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Progress Steps */}
      <div className="mb-8">
        <nav aria-label="Progress">
          <ol className="flex items-center justify-center space-x-4 sm:space-x-8">
            {steps.map((step) => (
              <li key={step.id} className="flex items-center">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                    currentStep >= step.id
                      ? theme === 'dark'
                        ? 'border-mocha-mauve bg-mocha-mauve text-mocha-crust'
                        : 'border-latte-mauve bg-latte-mauve text-latte-base'
                      : theme === 'dark'
                        ? 'border-mocha-surface1 text-mocha-subtext0'
                        : 'border-latte-surface1 text-latte-subtext0'
                  } transition-colors duration-200`}
                >
                  {currentStep > step.id ? (
                    <CheckCircleIcon className="h-6 w-6" />
                  ) : (
                    <step.icon className="h-5 w-5" />
                  )}
                </div>
                <span className={`ml-3 text-sm font-medium hidden sm:block ${
                  currentStep >= step.id
                    ? theme === 'dark' ? 'text-mocha-text' : 'text-latte-text'
                    : theme === 'dark' ? 'text-mocha-subtext0' : 'text-latte-subtext0'
                }`}>
                  {step.name}
                </span>
              </li>
            ))}
          </ol>
        </nav>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className={`rounded-2xl p-8 mb-8 backdrop-blur-sm border ${
          theme === 'dark'
            ? 'bg-mocha-surface0/30 border-mocha-surface1/30'
            : 'bg-latte-surface0/30 border-latte-surface1/30'
        }`}>
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentStep === 1}
            className={`inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg transition-all duration-200 ${
              currentStep === 1
                ? 'cursor-not-allowed opacity-50'
                : theme === 'dark'
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
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../common/Button';
import Input from '../common/Input';
import Select from '../common/Select';
import { profileAPI } from '../../services/api';

const ProfileSetupWizard = ({ onComplete, existingProfile = null }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [constants, setConstants] = useState({});
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    // Academic Background
    undergraduate_college: '',
    major: '',
    gpa: '',
    gpa_scale: '4.0',
    graduation_year: '',
    
    // Test Scores
    gre_score: '',
    gre_date: '',
    toefl_score: '',
    toefl_date: '',
    ielts_score: '',
    ielts_date: '',
    
    // Goals & Preferences
    target_degree: '',
    preferred_countries: [],
    target_field: '',
    budget_range: '',
    application_timeline: '',
  });

  const steps = [
    { number: 1, title: 'Academic Background', description: 'Your education details' },
    { number: 2, title: 'Test Scores', description: 'GRE, TOEFL, IELTS scores' },
    { number: 3, title: 'Goals & Preferences', description: 'Your target degree and preferences' },
    { number: 4, title: 'Review & Submit', description: 'Review your information' },
  ];

  useEffect(() => {
    loadConstants();
    if (existingProfile) {
      setFormData(prev => ({ ...prev, ...existingProfile }));
    }
  }, [existingProfile]);

  const loadConstants = async () => {
    try {
      const data = await profileAPI.getConstants();
      setConstants(data);
    } catch (error) {
      console.error('Failed to load constants:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value ? parseFloat(value) : '') : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleCountryChange = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setFormData(prev => ({
      ...prev,
      preferred_countries: selectedOptions
    }));
  };

  const validateStep = (step) => {
    const newErrors = {};
    
    switch (step) {
      case 1: // Academic Background
        if (!formData.undergraduate_college) newErrors.undergraduate_college = 'College name is required';
        if (!formData.major) newErrors.major = 'Major is required';
        if (!formData.gpa) newErrors.gpa = 'GPA is required';
        if (!formData.graduation_year) newErrors.graduation_year = 'Graduation year is required';
        
        // GPA validation
        if (formData.gpa) {
          const gpaNum = parseFloat(formData.gpa);
          if (formData.gpa_scale === '4.0' && (gpaNum < 0 || gpaNum > 4.0)) {
            newErrors.gpa = 'GPA must be between 0 and 4.0';
          } else if (formData.gpa_scale === '10.0' && (gpaNum < 0 || gpaNum > 10.0)) {
            newErrors.gpa = 'GPA must be between 0 and 10.0';
          }
        }
        
        // Graduation year validation
        if (formData.graduation_year) {
          const year = parseInt(formData.graduation_year);
          const currentYear = new Date().getFullYear();
          if (year < 1950 || year > currentYear + 10) {
            newErrors.graduation_year = `Year must be between 1950 and ${currentYear + 10}`;
          }
        }
        break;
        
      case 2: // Test Scores - At least one required
        const hasGRE = formData.gre_score;
        const hasTOEFL = formData.toefl_score;
        const hasIELTS = formData.ielts_score;
        
        if (!hasGRE && !hasTOEFL && !hasIELTS) {
          newErrors.test_scores = 'At least one test score is required';
        }
        
        // Individual test score validations
        if (formData.gre_score && (formData.gre_score < 260 || formData.gre_score > 340)) {
          newErrors.gre_score = 'GRE score must be between 260 and 340';
        }
        if (formData.toefl_score && (formData.toefl_score < 0 || formData.toefl_score > 120)) {
          newErrors.toefl_score = 'TOEFL score must be between 0 and 120';
        }
        if (formData.ielts_score && (formData.ielts_score < 0 || formData.ielts_score > 9)) {
          newErrors.ielts_score = 'IELTS score must be between 0 and 9';
        }
        break;
        
      case 3: // Goals & Preferences
        if (!formData.target_degree) newErrors.target_degree = 'Target degree is required';
        if (!formData.target_field) newErrors.target_field = 'Target field is required';
        if (!formData.preferred_countries.length) newErrors.preferred_countries = 'At least one country is required';
        if (!formData.budget_range) newErrors.budget_range = 'Budget range is required';
        if (!formData.application_timeline) newErrors.application_timeline = 'Application timeline is required';
        break;
    }
    
    return newErrors;
  };

  const handleNext = () => {
    const stepErrors = validateStep(currentStep);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    
    setErrors({});
    setCurrentStep(prev => Math.min(prev + 1, steps.length));
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    // Validate all steps
    let allErrors = {};
    for (let i = 1; i <= 3; i++) {
      const stepErrors = validateStep(i);
      allErrors = { ...allErrors, ...stepErrors };
    }
    
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      setCurrentStep(1); // Go back to first step with errors
      return;
    }
    
    setLoading(true);
    try {
      // Clean data - remove empty strings and convert to proper types
      const cleanData = {};
      Object.keys(formData).forEach(key => {
        const value = formData[key];
        if (value !== '' && value !== null && value !== undefined) {
          if (key.includes('date') && value) {
            cleanData[key] = value; // Keep date as string
          } else if (key.includes('score') || key === 'gpa' || key === 'graduation_year') {
            cleanData[key] = value ? parseFloat(value) : null;
          } else {
            cleanData[key] = value;
          }
        }
      });
      
      await profileAPI.updateProfile(cleanData);
      
      if (onComplete) {
        onComplete();
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Profile setup failed:', error);
      setErrors({ submit: error.response?.data?.detail || 'Failed to save profile' });
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Academic Background</h3>
            
            <Input
              label="Undergraduate College/University"
              name="undergraduate_college"
              value={formData.undergraduate_college}
              onChange={handleInputChange}
              error={errors.undergraduate_college}
              placeholder="e.g., Indian Institute of Technology Delhi"
              required
            />
            
            <Input
              label="Major/Field of Study"
              name="major"
              value={formData.major}
              onChange={handleInputChange}
              error={errors.major}
              placeholder="e.g., Computer Science Engineering"
              required
            />
            
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="GPA/CGPA"
                name="gpa"
                type="number"
                step="0.01"
                value={formData.gpa}
                onChange={handleInputChange}
                error={errors.gpa}
                placeholder="e.g., 3.8"
                required
              />
              
              <Select
                label="GPA Scale"
                name="gpa_scale"
                value={formData.gpa_scale}
                onChange={handleInputChange}
                options={constants.gpa_scales || []}
                required
              />
            </div>
            
            <Input
              label="Graduation Year"
              name="graduation_year"
              type="number"
              value={formData.graduation_year}
              onChange={handleInputChange}
              error={errors.graduation_year}
              placeholder="e.g., 2023"
              required
            />
          </div>
        );
        
      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Scores</h3>
            <p className="text-sm text-gray-600 mb-4">Add at least one test score</p>
            
            {errors.test_scores && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{errors.test_scores}</p>
              </div>
            )}
            
            {/* GRE Section */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">GRE (Graduate Record Examination)</h4>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="GRE Score"
                  name="gre_score"
                  type="number"
                  value={formData.gre_score}
                  onChange={handleInputChange}
                  error={errors.gre_score}
                  placeholder="260-340"
                />
                <Input
                  label="Test Date"
                  name="gre_date"
                  type="date"
                  value={formData.gre_date}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            
            {/* TOEFL Section */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">TOEFL (Test of English as a Foreign Language)</h4>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="TOEFL Score"
                  name="toefl_score"
                  type="number"
                  value={formData.toefl_score}
                  onChange={handleInputChange}
                  error={errors.toefl_score}
                  placeholder="0-120"
                />
                <Input
                  label="Test Date"
                  name="toefl_date"
                  type="date"
                  value={formData.toefl_date}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            
            {/* IELTS Section */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">IELTS (International English Language Testing System)</h4>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="IELTS Score"
                  name="ielts_score"
                  type="number"
                  step="0.5"
                  value={formData.ielts_score}
                  onChange={handleInputChange}
                  error={errors.ielts_score}
                  placeholder="0-9 (e.g., 7.5)"
                />
                <Input
                  label="Test Date"
                  name="ielts_date"
                  type="date"
                  value={formData.ielts_date}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </div>
        );
        
      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Goals & Preferences</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Target Degree"
                name="target_degree"
                value={formData.target_degree}
                onChange={handleInputChange}
                error={errors.target_degree}
                options={constants.target_degrees || []}
                required
              />
              
              <Select
                label="Target Field"
                name="target_field"
                value={formData.target_field}
                onChange={handleInputChange}
                error={errors.target_field}
                options={constants.target_fields || []}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preferred Countries <span className="text-red-500">*</span>
              </label>
              <select
                multiple
                value={formData.preferred_countries}
                onChange={handleCountryChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-32"
              >
                {(constants.preferred_countries || []).map((country) => (
                  <option key={country.value} value={country.value}>
                    {country.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple countries</p>
              {errors.preferred_countries && (
                <p className="text-sm text-red-600 mt-1">{errors.preferred_countries}</p>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Budget Range"
                name="budget_range"
                value={formData.budget_range}
                onChange={handleInputChange}
                error={errors.budget_range}
                options={constants.budget_ranges || []}
                required
              />
              
              <Select
                label="Application Timeline"
                name="application_timeline"
                value={formData.application_timeline}
                onChange={handleInputChange}
                error={errors.application_timeline}
                options={constants.application_timelines || []}
                required
              />
            </div>
          </div>
        );
        
      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Review & Submit</h3>
            
            {/* Academic Background Review */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Academic Background</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="font-medium">College:</span> {formData.undergraduate_college}</div>
                <div><span className="font-medium">Major:</span> {formData.major}</div>
                <div><span className="font-medium">GPA:</span> {formData.gpa}/{formData.gpa_scale}</div>
                <div><span className="font-medium">Graduation:</span> {formData.graduation_year}</div>
              </div>
            </div>
            
            {/* Test Scores Review */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Test Scores</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {formData.gre_score && <div><span className="font-medium">GRE:</span> {formData.gre_score}</div>}
                {formData.toefl_score && <div><span className="font-medium">TOEFL:</span> {formData.toefl_score}</div>}
                {formData.ielts_score && <div><span className="font-medium">IELTS:</span> {formData.ielts_score}</div>}
              </div>
            </div>
            
            {/* Goals Review */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Goals & Preferences</h4>
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">Target Degree:</span> {formData.target_degree}</div>
                <div><span className="font-medium">Field:</span> {formData.target_field}</div>
                <div><span className="font-medium">Countries:</span> {formData.preferred_countries.join(', ')}</div>
                <div><span className="font-medium">Budget:</span> {formData.budget_range}</div>
                <div><span className="font-medium">Timeline:</span> {formData.application_timeline}</div>
              </div>
            </div>
            
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                currentStep >= step.number 
                  ? 'bg-blue-600 border-blue-600 text-white' 
                  : 'border-gray-300 text-gray-500'
              }`}>
                {currentStep > step.number ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  step.number
                )}
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-1 mx-4 ${
                  currentStep > step.number ? 'bg-blue-600' : 'bg-gray-300'
                }`} />
              )}
            </div>
          ))}
        </div>
        <div className="mt-4">
          <h2 className="text-xl font-semibold text-gray-900">{steps[currentStep - 1]?.title}</h2>
          <p className="text-gray-600">{steps[currentStep - 1]?.description}</p>
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        {renderStepContent()}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 1}
        >
          Previous
        </Button>
        
        <div className="flex space-x-4">
          {currentStep < steps.length ? (
            <Button onClick={handleNext}>
              Next
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              loading={loading}
            >
              Complete Profile
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileSetupWizard;
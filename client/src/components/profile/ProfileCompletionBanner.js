import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Button from '../common/Button';
import { profileAPI } from '../../services/api';

const ProfileCompletionBanner = () => {
  const [completionData, setCompletionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    loadCompletionStatus();
  }, []);

  const loadCompletionStatus = async () => {
    try {
      const data = await profileAPI.getCompletion();
      setCompletionData(data);
    } catch (error) {
      console.error('Failed to load completion status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || dismissed || !completionData || completionData.is_complete) {
    return null;
  }

  const { completion_percentage, missing_fields, completed_sections } = completionData;

  return (
    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-6 mb-6 relative">
      {/* Dismiss Button */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      <div className="flex items-start space-x-4">
        {/* Icon */}
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900">
              Complete Your Profile
            </h3>
            <span className="text-sm font-medium text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full">
              {completion_percentage}% Complete
            </span>
          </div>

          <p className="text-gray-700 mb-4">
            Complete your profile to get personalized recommendations from our AI assistants. 
            The more information you provide, the better we can help you!
          </p>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Progress</span>
              <span>{completion_percentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-yellow-400 to-orange-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${completion_percentage}%` }}
              ></div>
            </div>
          </div>

          {/* Completed Sections */}
          {completed_sections.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Completed:</p>
              <div className="flex flex-wrap gap-2">
                {completed_sections.map((section, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                  >
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {section}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Missing Fields */}
          {missing_fields.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Still needed:</p>
              <div className="flex flex-wrap gap-2">
                {missing_fields.slice(0, 5).map((field, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"
                  >
                    {field}
                  </span>
                ))}
                {missing_fields.length > 5 && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    +{missing_fields.length - 5} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Link to="/profile/setup">
              <Button size="sm" className="btn-hover-lift">
                Complete Profile
              </Button>
            </Link>
            <Link to="/profile">
              <Button variant="outline" size="sm">
                View Profile
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileCompletionBanner;
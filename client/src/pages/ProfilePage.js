import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/common/Button';
import ProfileSetupWizard from '../components/profile/ProfileSetupWizard';
import WorkExperienceManager from '../components/profile/WorkExperienceManager';
import { profileAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const ProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [completionData, setCompletionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      const [profileData, completionStatus] = await Promise.all([
        profileAPI.getProfile(),
        profileAPI.getCompletion()
      ]);
      setProfile(profileData);
      setCompletionData(completionStatus);
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = () => {
    setEditMode(false);
    loadProfileData(); // Reload to get updated data
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (editMode) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <button
                  onClick={() => setEditMode(false)}
                  className="mr-4 text-gray-600 hover:text-gray-900"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
                <h1 className="text-xl font-semibold text-gray-900">Edit Profile</h1>
              </div>
              <Button variant="outline" size="sm" onClick={() => setEditMode(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </header>

        <div className="py-8">
          <ProfileSetupWizard 
            existingProfile={profile} 
            onComplete={handleProfileUpdate}
          />
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: '👤' },
    { id: 'academic', name: 'Academic', icon: '🎓' },
    { id: 'tests', name: 'Test Scores', icon: '📝' },
    { id: 'experience', name: 'Experience', icon: '💼' },
    { id: 'goals', name: 'Goals', icon: '🎯' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/dashboard')}
                className="mr-4 text-gray-600 hover:text-gray-900"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <h1 className="text-xl font-semibold text-gray-900">My Profile</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button onClick={() => setEditMode(true)}>
                Edit Profile
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Completion Status */}
        {completionData && !completionData.is_complete && (
          <div className="mb-8">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Profile Completion</h2>
                <span className="text-sm font-medium text-blue-700 bg-blue-100 px-3 py-1 rounded-full">
                  {completionData.completion_percentage}% Complete
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${completionData.completion_percentage}%` }}
                ></div>
              </div>
              <p className="text-gray-700 text-sm">
                Complete your profile to unlock all AI assistant features and get better recommendations.
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-1/4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="text-center">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-blue-600">
                    {user?.full_name?.charAt(0) || 'U'}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{user?.full_name}</h3>
                <p className="text-gray-600">{user?.email}</p>
                {completionData?.is_complete && (
                  <span className="inline-flex items-center mt-2 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Profile Complete
                  </span>
                )}
              </div>
            </div>

            {/* Navigation */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <nav className="space-y-1 p-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <span className="mr-3">{tab.icon}</span>
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:w-3/4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {activeTab === 'overview' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Profile Overview</h2>
                  
                  {/* Quick Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-blue-600">{profile?.gpa || 'N/A'}</div>
                      <div className="text-sm text-gray-600">GPA</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-green-600">
                        {profile?.gre_score || profile?.toefl_score || profile?.ielts_score || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-600">
                        {profile?.gre_score ? 'GRE' : profile?.toefl_score ? 'TOEFL' : profile?.ielts_score ? 'IELTS' : 'Test Score'}
                      </div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-purple-600">{profile?.target_degree || 'N/A'}</div>
                      <div className="text-sm text-gray-600">Target Degree</div>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
                    <div className="space-y-3">
                      <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Profile created</p>
                          <p className="text-xs text-gray-500">
                            {new Date(profile?.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'academic' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Academic Background</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">University</label>
                      <p className="text-gray-900">{profile?.undergraduate_college || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Major</label>
                      <p className="text-gray-900">{profile?.major || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">GPA</label>
                      <p className="text-gray-900">
                        {profile?.gpa ? `${profile.gpa}/${profile.gpa_scale}` : 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Graduation Year</label>
                      <p className="text-gray-900">{profile?.graduation_year || 'Not specified'}</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'tests' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Test Scores</h2>
                  <div className="space-y-6">
                    {/* GRE */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-medium text-gray-900 mb-3">GRE</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-500 mb-1">Score</label>
                          <p className="text-gray-900">{profile?.gre_score || 'Not taken'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500 mb-1">Date</label>
                          <p className="text-gray-900">
                            {profile?.gre_date ? new Date(profile.gre_date).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* TOEFL */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-medium text-gray-900 mb-3">TOEFL</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-500 mb-1">Score</label>
                          <p className="text-gray-900">{profile?.toefl_score || 'Not taken'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500 mb-1">Date</label>
                          <p className="text-gray-900">
                            {profile?.toefl_date ? new Date(profile.toefl_date).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* IELTS */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-medium text-gray-900 mb-3">IELTS</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-500 mb-1">Score</label>
                          <p className="text-gray-900">{profile?.ielts_score || 'Not taken'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500 mb-1">Date</label>
                          <p className="text-gray-900">
                            {profile?.ielts_date ? new Date(profile.ielts_date).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'experience' && (
                <WorkExperienceManager />
              )}

              {activeTab === 'goals' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Goals & Preferences</h2>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Target Degree</label>
                        <p className="text-gray-900">{profile?.target_degree || 'Not specified'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Target Field</label>
                        <p className="text-gray-900">{profile?.target_field || 'Not specified'}</p>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Preferred Countries</label>
                      <div className="flex flex-wrap gap-2">
                        {profile?.preferred_countries?.length > 0 ? (
                          profile.preferred_countries.map((country, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                            >
                              {country}
                            </span>
                          ))
                        ) : (
                          <p className="text-gray-900">Not specified</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Budget Range</label>
                        <p className="text-gray-900">{profile?.budget_range || 'Not specified'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Application Timeline</label>
                        <p className="text-gray-900">{profile?.application_timeline || 'Not specified'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import ProfileCompletionBanner from '../components/profile/ProfileCompletionBanner';

const DashboardPage = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  const agentCards = [
    {
      id: 1,
      title: 'Profile Analysis',
      description: 'Analyze your academic profile and get personalized recommendations',
      icon: '👤',
      status: 'Setup Required',
      statusColor: 'bg-yellow-100 text-yellow-800',
      progress: 0,
      agentType: 'profile_analyzer'
    },
    {
      id: 2,
      title: 'University Matcher',
      description: 'Find universities that match your profile and goals',
      icon: '🏫',
      status: 'Ready',
      statusColor: 'bg-green-100 text-green-800',
      progress: 0,
      agentType: 'university_matcher'
    },
    {
      id: 3,
      title: 'Document Helper',
      description: 'Get help with SOP, Resume, and other application documents',
      icon: '📝',
      status: 'Not Started',
      statusColor: 'bg-gray-100 text-gray-800',
      progress: 0,
      agentType: 'document_helper'
    },
    {
      id: 4,
      title: 'Exam Planner',
      description: 'Create study plans for GRE, TOEFL, and other exams',
      icon: '📚',
      status: 'Not Started',
      statusColor: 'bg-gray-100 text-gray-800',
      progress: 0,
      agentType: 'exam_planner'
    },
    {
      id: 5,
      title: 'Finance Planner',
      description: 'Plan your budget and find scholarships',
      icon: '💰',
      status: 'Not Started',
      statusColor: 'bg-gray-100 text-gray-800',
      progress: 0,
      agentType: 'finance_planner'
    },
    {
      id: 6,
      title: 'Visa Assistant',
      description: 'Prepare for visa interviews and documentation',
      icon: '✈️',
      status: 'Not Started',
      statusColor: 'bg-gray-100 text-gray-800',
      progress: 0,
      agentType: 'visa_assistant'
    }
  ];

  const quickStats = [
    { label: 'Applications Started', value: '0', change: '+0%' },
    { label: 'Universities Shortlisted', value: '0', change: '+0%' },
    { label: 'Documents Ready', value: '0/5', change: '+0%' },
    { label: 'Days to Deadline', value: '---', change: '' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">GP</span>
                </div>
              </div>
              <div className="ml-4">
                <h1 className="text-xl font-semibold text-gray-900">GradPath</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/profile">
                <div className="flex items-center space-x-2 hover:bg-gray-50 rounded-lg px-3 py-2 transition-colors">
                  <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-medium text-sm">
                      {user?.full_name?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-700">{user?.full_name}</span>
                </div>
              </Link>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Completion Banner */}
        <ProfileCompletionBanner />

        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.full_name?.split(' ')[0]}! 👋
          </h2>
          <p className="text-gray-600">
            Let's continue your graduate school application journey. Here's what you can work on today.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {quickStats.map((stat, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                {stat.change && (
                  <span className="text-sm text-gray-500">{stat.change}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Agent Cards */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Your AI Assistants</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agentCards.map((agent) => (
              <div
                key={agent.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer card-hover"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="text-3xl">{agent.icon}</div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${agent.statusColor}`}>
                    {agent.status}
                  </span>
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">{agent.title}</h4>
                <p className="text-gray-600 text-sm mb-4">{agent.description}</p>
                
                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Progress</span>
                    <span>{agent.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${agent.progress}%` }}
                    ></div>
                  </div>
                </div>
                
                <Button
                  variant={agent.status === 'Ready' ? 'primary' : 'outline'}
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    if (agent.status === 'Setup Required') {
                      // Redirect to profile setup for agents that need profile completion
                      window.location.href = '/profile/setup';
                    } else {
                      // Future: Navigate to agent-specific pages
                      console.log(`Opening ${agent.agentType} agent...`);
                    }
                  }}
                >
                  {agent.status === 'Setup Required' ? 'Complete Profile First' : 
                   agent.status === 'Not Started' ? 'Get Started' : 'Continue'}
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="text-center py-8">
            <div className="mx-auto h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm">No recent activity yet</p>
            <p className="text-gray-400 text-xs mt-1">Start using the AI assistants to see your progress here</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;

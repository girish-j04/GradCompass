import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  UserIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  ChartBarIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  CurrencyDollarIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowRightIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../stores/authStore';
import { useProfileStore } from '../stores/profileStore';
import { useInterviewStore } from '../stores/interviewStore';
import { useThemeStore } from '../stores/themeStore';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const agentCards = [
  {
    name: 'University Matcher',
    description: 'Find universities that match your profile and preferences',
    icon: AcademicCapIcon,
    color: 'from-mocha-mauve to-mocha-pink dark:from-latte-mauve dark:to-latte-pink',
    agentType: 'university_matcher',
    requiredFields: ['GPA', 'Target Field', 'Preferred Countries', 'Target Degree'],
  },
  {
    name: 'Document Helper',
    description: 'Get assistance with SOPs and application essays',
    icon: DocumentTextIcon,
    color: 'from-mocha-blue to-mocha-sapphire dark:from-latte-blue dark:to-latte-sapphire',
    agentType: 'document_helper',
    requiredFields: ['Work Experience', 'Target Field', 'Target Degree'],
  },
  {
    name: 'Exam Planner',
    description: 'Plan your GRE, TOEFL, or IELTS preparation',
    icon: ClipboardDocumentListIcon,
    color: 'from-mocha-green to-mocha-teal dark:from-latte-green dark:to-latte-teal',
    agentType: 'exam_planner',
    requiredFields: ['At least one test score'],
  },
  {
    name: 'Finance Planner',
    description: 'Plan your budget and explore funding options',
    icon: CurrencyDollarIcon,
    color: 'from-mocha-peach to-mocha-yellow dark:from-latte-peach dark:to-latte-yellow',
    agentType: 'finance_planner',
    requiredFields: ['Budget Range', 'Preferred Countries'],
  },
  {
    name: 'Visa Assistant',
    description: 'Get guidance on visa requirements and mock interviews',
    icon: GlobeAltIcon,
    color: 'from-mocha-red to-mocha-maroon dark:from-latte-red dark:to-latte-maroon',
    agentType: 'visa_assistant',
    requiredFields: ['Preferred Countries', 'Target Degree'],
  },
];

const quickActions = [
  {
    name: 'Complete Profile',
    description: 'Fill in your academic and personal details',
    href: '/profile/setup',
    icon: UserIcon,
    color: 'mocha-mauve dark:latte-mauve',
  },
  {
    name: 'Add Work Experience',
    description: 'Add your professional background',
    href: '/profile/work-experience',
    icon: BriefcaseIcon,
    color: 'mocha-blue dark:latte-blue',
  },
];

function DashboardPage() {
  const { user } = useAuthStore();
  const { 
    profile, 
    completionStatus, 
    fetchProfile, 
    fetchCompletionStatus, 
    checkAgentRequirements,
    loading 
  } = useProfileStore();
  const { fetchSessions } = useInterviewStore();
  const { theme } = useThemeStore();
  const navigate = useNavigate();
  const [recentSessions, setRecentSessions] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchProfile();
        await fetchCompletionStatus();
        // Load recent interview sessions
        const sessions = await fetchSessions();
        setRecentSessions(sessions.slice(0, 3)); // Show only 3 most recent
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      }
    };
    loadData();
  }, [fetchProfile, fetchCompletionStatus, fetchSessions]);

  const getCompletionColor = (percentage) => {
    if (percentage >= 80) return theme === 'dark' ? 'text-mocha-green' : 'text-latte-green';
    if (percentage >= 50) return theme === 'dark' ? 'text-mocha-yellow' : 'text-latte-yellow';
    return theme === 'dark' ? 'text-mocha-red' : 'text-latte-red';
  };

  const getCompletionBgColor = (percentage) => {
    if (percentage >= 80) return theme === 'dark' ? 'from-mocha-green/20 to-mocha-teal/20' : 'from-latte-green/20 to-latte-teal/20';
    if (percentage >= 50) return theme === 'dark' ? 'from-mocha-yellow/20 to-mocha-peach/20' : 'from-latte-yellow/20 to-latte-peach/20';
    return theme === 'dark' ? 'from-mocha-red/20 to-mocha-maroon/20' : 'from-latte-red/20 to-latte-maroon/20';
  };

  // Handle agent click
  const handleAgentClick = async (agent) => {
    if (agent.agentType === 'visa_assistant') {
      // Check if profile requirements are met for visa assistant
      const canAccess = completionStatus?.completion_percentage >= 70; // Require 70% completion
      
      if (!canAccess) {
        // Show requirements not met
        return;
      }
      
      // Navigate to visa interview
      navigate('/visa-interview');
    } else {
      // Handle other agents (existing functionality)
      console.log(`Clicked on ${agent.name}`);
    }
  };

  // Check if agent can be accessed
  const canAccessAgent = (agent) => {
    if (agent.agentType === 'visa_assistant') {
      return completionStatus?.completion_percentage >= 70;
    }
    // Add other agent requirements as needed
    return true;
  };

  if (loading && !completionStatus) {
    return <LoadingSpinner />;
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <h1 className={`text-4xl font-display font-bold ${
          theme === 'dark' ? 'text-mocha-text' : 'text-latte-text'
        }`}>
          Welcome back, {user?.full_name?.split(' ')[0] || 'there'}!
        </h1>
        <p className={`mt-2 text-lg ${
          theme === 'dark' ? 'text-mocha-subtext0' : 'text-latte-subtext0'
        }`}>
          Continue building your path to graduate success
        </p>
      </motion.div>

      {/* Profile Completion Card */}
      {completionStatus && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className={`rounded-2xl p-8 mb-8 bg-gradient-to-br ${getCompletionBgColor(completionStatus.completion_percentage)} backdrop-blur-sm border ${
            theme === 'dark' 
              ? 'border-mocha-surface1/30' 
              : 'border-latte-surface1/30'
          }`}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className={`text-xl font-semibold ${
                theme === 'dark' ? 'text-mocha-text' : 'text-latte-text'
              }`}>
                Profile Completion
              </h3>
              <p className={`${
                theme === 'dark' ? 'text-mocha-subtext0' : 'text-latte-subtext0'
              }`}>
                Complete your profile to unlock all features
              </p>
            </div>
            <div className={`text-3xl font-bold ${getCompletionColor(completionStatus.completion_percentage)}`}>
              {completionStatus.completion_percentage}%
            </div>
          </div>
          
          <div className={`w-full bg-gray-200 rounded-full h-3 mb-4 ${
            theme === 'dark' ? 'bg-mocha-surface1' : 'bg-latte-surface1'
          }`}>
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                completionStatus.completion_percentage >= 80
                  ? theme === 'dark' ? 'bg-mocha-green' : 'bg-latte-green'
                  : completionStatus.completion_percentage >= 50
                  ? theme === 'dark' ? 'bg-mocha-yellow' : 'bg-latte-yellow'
                  : theme === 'dark' ? 'bg-mocha-red' : 'bg-latte-red'
              }`}
              style={{ width: `${completionStatus.completion_percentage}%` }}
            />
          </div>
          
          {completionStatus.missing_fields?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {completionStatus.missing_fields.map((field) => (
                <span
                  key={field}
                  className={`px-3 py-1 text-xs rounded-full ${
                    theme === 'dark' 
                      ? 'bg-mocha-surface0 text-mocha-subtext1' 
                      : 'bg-latte-surface0 text-latte-subtext1'
                  }`}
                >
                  Missing: {field}
                </span>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Recent Interview Sessions */}
      {recentSessions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-2xl font-semibold ${
              theme === 'dark' ? 'text-mocha-text' : 'text-latte-text'
            }`}>
              Recent Interview Sessions
            </h2>
            <button
              onClick={() => navigate('/visa-interview')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'bg-mocha-blue hover:bg-mocha-blue/80 text-white'
                  : 'bg-latte-blue hover:bg-latte-blue/80 text-white'
              }`}
            >
              <PlayIcon className="w-4 h-4" />
              Start New Interview
            </button>
          </div>
          
          <div className="grid gap-4 md:grid-cols-3">
            {recentSessions.map((session) => (
              <motion.div
                key={session.id}
                whileHover={{ y: -2 }}
                className={`p-6 rounded-xl border backdrop-blur-sm cursor-pointer transition-colors ${
                  theme === 'dark'
                    ? 'bg-mocha-surface0/50 border-mocha-surface1/30 hover:border-mocha-surface2'
                    : 'bg-latte-surface0/50 border-latte-surface1/30 hover:border-latte-surface2'
                }`}
                onClick={() => navigate(`/visa-interview/${session.id}`)}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2 rounded-lg ${
                    session.status === 'completed'
                      ? theme === 'dark' ? 'bg-mocha-green/20' : 'bg-latte-green/20'
                      : theme === 'dark' ? 'bg-mocha-blue/20' : 'bg-latte-blue/20'
                  }`}>
                    {session.status === 'completed' ? (
                      <CheckCircleIcon className={`w-5 h-5 ${
                        theme === 'dark' ? 'text-mocha-green' : 'text-latte-green'
                      }`} />
                    ) : (
                      <GlobeAltIcon className={`w-5 h-5 ${
                        theme === 'dark' ? 'text-mocha-blue' : 'text-latte-blue'
                      }`} />
                    )}
                  </div>
                  
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    session.status === 'completed'
                      ? theme === 'dark' ? 'bg-mocha-green/20 text-mocha-green' : 'bg-latte-green/20 text-latte-green'
                      : theme === 'dark' ? 'bg-mocha-blue/20 text-mocha-blue' : 'bg-latte-blue/20 text-latte-blue'
                  }`}>
                    {session.status}
                  </span>
                </div>
                
                <h3 className={`font-semibold mb-2 ${
                  theme === 'dark' ? 'text-mocha-text' : 'text-latte-text'
                }`}>
                  F1 Visa Interview
                </h3>
                
                <p className={`text-sm mb-4 ${
                  theme === 'dark' ? 'text-mocha-subtext0' : 'text-latte-subtext0'
                }`}>
                  {new Date(session.created_at).toLocaleDateString()}
                </p>
                
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${
                    theme === 'dark' ? 'text-mocha-subtext1' : 'text-latte-subtext1'
                  }`}>
                    {session.messages?.length || 0} messages
                  </span>
                  <ArrowRightIcon className={`w-4 h-4 ${
                    theme === 'dark' ? 'text-mocha-subtext1' : 'text-latte-subtext1'
                  }`} />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Quick Actions */}
      {completionStatus?.completion_percentage < 100 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <h2 className={`text-2xl font-semibold mb-6 ${
            theme === 'dark' ? 'text-mocha-text' : 'text-latte-text'
          }`}>
            Quick Actions
          </h2>
          
          <div className="grid gap-4 md:grid-cols-2">
            {quickActions.map((action, index) => (
              <motion.div
                key={action.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
              >
                <Link
                  to={action.href}
                  className={`block p-6 rounded-xl border backdrop-blur-sm transition-all duration-200 hover:scale-[1.02] ${
                    theme === 'dark'
                      ? 'bg-mocha-surface0/50 border-mocha-surface1/30 hover:border-mocha-surface2'
                      : 'bg-latte-surface0/50 border-latte-surface1/30 hover:border-latte-surface2'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg bg-${action.color}/20`}>
                      <action.icon className={`w-6 h-6 text-${action.color}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-semibold mb-2 ${
                        theme === 'dark' ? 'text-mocha-text' : 'text-latte-text'
                      }`}>
                        {action.name}
                      </h3>
                      <p className={`text-sm ${
                        theme === 'dark' ? 'text-mocha-subtext0' : 'text-latte-subtext0'
                      }`}>
                        {action.description}
                      </p>
                    </div>
                    <ArrowRightIcon className={`w-5 h-5 ${
                      theme === 'dark' ? 'text-mocha-subtext1' : 'text-latte-subtext1'
                    }`} />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* AI Agents Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <h2 className={`text-2xl font-semibold mb-6 ${
          theme === 'dark' ? 'text-mocha-text' : 'text-latte-text'
        }`}>
          AI Assistants
        </h2>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {agentCards.map((agent, index) => {
            const canAccess = canAccessAgent(agent);
            const Icon = agent.icon;
            
            return (
              <motion.div
                key={agent.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 + index * 0.1 }}
                whileHover={canAccess ? { y: -4 } : {}}
                className={`relative group ${canAccess ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'}`}
                onClick={() => canAccess && handleAgentClick(agent)}
              >
                <div className={`h-full p-8 rounded-2xl border backdrop-blur-sm transition-all duration-200 ${
                  theme === 'dark'
                    ? 'bg-mocha-surface0/50 border-mocha-surface1/30'
                    : 'bg-latte-surface0/50 border-latte-surface1/30'
                } ${
                  canAccess 
                    ? theme === 'dark' 
                      ? 'hover:border-mocha-surface2 hover:bg-mocha-surface0/70' 
                      : 'hover:border-latte-surface2 hover:bg-latte-surface0/70'
                    : ''
                }`}>
                  {/* Status indicator */}
                  <div className="absolute top-4 right-4">
                    {canAccess ? (
                      <CheckCircleIcon className={`w-5 h-5 ${
                        theme === 'dark' ? 'text-mocha-green' : 'text-latte-green'
                      }`} />
                    ) : (
                      <ExclamationCircleIcon className={`w-5 h-5 ${
                        theme === 'dark' ? 'text-mocha-yellow' : 'text-latte-yellow'
                      }`} />
                    )}
                  </div>
                  
                  {/* Icon */}
                  <div className={`p-4 rounded-xl bg-gradient-to-br ${agent.color} mb-6`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  
                  {/* Content */}
                  <h3 className={`text-xl font-semibold mb-3 ${
                    theme === 'dark' ? 'text-mocha-text' : 'text-latte-text'
                  }`}>
                    {agent.name}
                  </h3>
                  
                  <p className={`text-sm mb-6 ${
                    theme === 'dark' ? 'text-mocha-subtext0' : 'text-latte-subtext0'
                  }`}>
                    {agent.description}
                  </p>
                  
                  {/* Requirements */}
                  <div className="space-y-2">
                    <p className={`text-xs font-medium ${
                      theme === 'dark' ? 'text-mocha-subtext1' : 'text-latte-subtext1'
                    }`}>
                      Requirements:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {agent.requiredFields.map((field) => (
                        <span
                          key={field}
                          className={`px-2 py-1 text-xs rounded-md ${
                            theme === 'dark' 
                              ? 'bg-mocha-surface1 text-mocha-subtext0' 
                              : 'bg-latte-surface1 text-latte-subtext0'
                          }`}
                        >
                          {field}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {/* Special button for Visa Assistant */}
                  {agent.agentType === 'visa_assistant' && canAccess && (
                    <div className="mt-6 pt-6 border-t border-opacity-20">
                      <button className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-colors ${
                        theme === 'dark'
                          ? 'bg-mocha-red/10 hover:bg-mocha-red/20 text-mocha-red border border-mocha-red/30'
                          : 'bg-latte-red/10 hover:bg-latte-red/20 text-latte-red border border-latte-red/30'
                      }`}>
                        <PlayIcon className="w-4 h-4" />
                        Start Mock Interview
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

export default DashboardPage;
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
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
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../stores/authStore';
import { useProfileStore } from '../stores/profileStore';
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
    description: 'Get guidance on visa requirements and processes',
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
  const { theme } = useThemeStore();

  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchProfile();
        await fetchCompletionStatus();
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      }
    };
    loadData();
  }, [fetchProfile, fetchCompletionStatus]);

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
            theme === 'dark' ? 'border-mocha-surface1/30' : 'border-latte-surface1/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`text-2xl font-bold ${
                theme === 'dark' ? 'text-mocha-text' : 'text-latte-text'
              }`}>
                Profile Completion
              </h3>
              <p className={`mt-1 ${
                theme === 'dark' ? 'text-mocha-subtext0' : 'text-latte-subtext0'
              }`}>
                {completionStatus.is_complete 
                  ? 'Your profile is complete! You can now access all AI agents.' 
                  : `${completionStatus.missing_fields?.length || 0} items remaining`}
              </p>
            </div>
            <div className="text-right">
              <div className={`text-4xl font-bold ${getCompletionColor(completionStatus.completion_percentage)}`}>
                {completionStatus.completion_percentage}%
              </div>
              {completionStatus.is_complete ? (
                <CheckCircleIcon className={`h-8 w-8 mt-2 ${
                  theme === 'dark' ? 'text-mocha-green' : 'text-latte-green'
                }`} />
              ) : (
                <ExclamationCircleIcon className={`h-8 w-8 mt-2 ${
                  theme === 'dark' ? 'text-mocha-yellow' : 'text-latte-yellow'
                }`} />
              )}
            </div>
          </div>
          
          <div className="mt-6">
            <div className={`bg-gray-200 rounded-full h-2 dark:bg-gray-700`}>
              <div
                className={`h-2 rounded-full bg-gradient-to-r transition-all duration-1000 ease-out ${
                  completionStatus.completion_percentage >= 80
                    ? theme === 'dark' ? 'from-mocha-green to-mocha-teal' : 'from-latte-green to-latte-teal'
                    : completionStatus.completion_percentage >= 50
                    ? theme === 'dark' ? 'from-mocha-yellow to-mocha-peach' : 'from-latte-yellow to-latte-peach'
                    : theme === 'dark' ? 'from-mocha-red to-mocha-maroon' : 'from-latte-red to-latte-maroon'
                }`}
                style={{ width: `${completionStatus.completion_percentage}%` }}
              />
            </div>
          </div>

          {!completionStatus.is_complete && (
            <div className="mt-4 flex flex-wrap gap-2">
              {completionStatus.missing_fields?.slice(0, 3).map((field, index) => (
                <span
                  key={index}
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                    theme === 'dark'
                      ? 'bg-mocha-surface0/50 text-mocha-subtext0'
                      : 'bg-latte-surface0/50 text-latte-subtext0'
                  }`}
                >
                  {field}
                </span>
              ))}
              {(completionStatus.missing_fields?.length || 0) > 3 && (
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  theme === 'dark'
                    ? 'bg-mocha-surface0/50 text-mocha-subtext0'
                    : 'bg-latte-surface0/50 text-latte-subtext0'
                }`}>
                  +{(completionStatus.missing_fields?.length || 0) - 3} more
                </span>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* Quick Actions */}
      {(!completionStatus?.is_complete) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <h2 className={`text-2xl font-bold mb-6 ${
            theme === 'dark' ? 'text-mocha-text' : 'text-latte-text'
          }`}>
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickActions.map((action, index) => (
              <Link
                key={action.name}
                to={action.href}
                className={`group p-6 rounded-2xl transition-all duration-300 hover:scale-105 backdrop-blur-sm border ${
                  theme === 'dark'
                    ? 'bg-mocha-surface0/30 border-mocha-surface1/30 hover:bg-mocha-surface0/50'
                    : 'bg-latte-surface0/30 border-latte-surface1/30 hover:bg-latte-surface0/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`p-3 rounded-xl bg-${action.color}/10`}>
                      <action.icon className={`h-6 w-6 text-${action.color}`} />
                    </div>
                    <div className="ml-4">
                      <h3 className={`font-semibold ${
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
                  </div>
                  <ArrowRightIcon className={`h-5 w-5 transition-transform group-hover:translate-x-1 ${
                    theme === 'dark' ? 'text-mocha-subtext0' : 'text-latte-subtext0'
                  }`} />
                </div>
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {/* AI Agents */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <h2 className={`text-2xl font-bold mb-6 ${
          theme === 'dark' ? 'text-mocha-text' : 'text-latte-text'
        }`}>
          AI Assistants
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agentCards.map((agent, index) => (
            <AgentCard
              key={agent.name}
              agent={agent}
              index={index}
              completionStatus={completionStatus}
              checkAgentRequirements={checkAgentRequirements}
              theme={theme}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function AgentCard({ agent, index, completionStatus, checkAgentRequirements, theme }) {
  const [requirements, setRequirements] = React.useState(null);

  React.useEffect(() => {
    const loadRequirements = async () => {
      try {
        const result = await checkAgentRequirements(agent.agentType);
        setRequirements(result);
      } catch (error) {
        console.error('Failed to check requirements:', error);
      }
    };
    if (completionStatus) {
      loadRequirements();
    }
  }, [completionStatus, agent.agentType, checkAgentRequirements]);

  const isEnabled = requirements?.requirements_met || false;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.1 * index }}
      className={`relative group rounded-2xl p-6 transition-all duration-300 backdrop-blur-sm border ${
        isEnabled 
          ? 'cursor-pointer hover:scale-105' 
          : 'cursor-not-allowed opacity-60'
      } ${
        theme === 'dark'
          ? 'bg-mocha-surface0/30 border-mocha-surface1/30'
          : 'bg-latte-surface0/30 border-latte-surface1/30'
      } ${isEnabled && (theme === 'dark' ? 'hover:bg-mocha-surface0/50' : 'hover:bg-latte-surface0/50')}`}
    >
      {!isEnabled && (
        <div className={`absolute top-3 right-3 p-1 rounded-full ${
          theme === 'dark' ? 'bg-mocha-yellow/20' : 'bg-latte-yellow/20'
        }`}>
          <ExclamationCircleIcon className={`h-4 w-4 ${
            theme === 'dark' ? 'text-mocha-yellow' : 'text-latte-yellow'
          }`} />
        </div>
      )}
      
      <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${agent.color} flex items-center justify-center mb-4 shadow-lg`}>
        <agent.icon className="h-7 w-7 text-white" />
      </div>
      
      <h3 className={`text-lg font-semibold mb-2 ${
        theme === 'dark' ? 'text-mocha-text' : 'text-latte-text'
      }`}>
        {agent.name}
      </h3>
      
      <p className={`text-sm mb-4 ${
        theme === 'dark' ? 'text-mocha-subtext0' : 'text-latte-subtext0'
      }`}>
        {agent.description}
      </p>

      {!isEnabled && requirements && (
        <div className="mb-4">
          <p className={`text-xs font-medium mb-2 ${
            theme === 'dark' ? 'text-mocha-yellow' : 'text-latte-yellow'
          }`}>
            Missing Requirements:
          </p>
          <div className="flex flex-wrap gap-1">
            {requirements.missing_requirements?.slice(0, 2).map((req, i) => (
              <span
                key={i}
                className={`inline-block px-2 py-1 rounded text-xs ${
                  theme === 'dark'
                    ? 'bg-mocha-yellow/10 text-mocha-yellow'
                    : 'bg-latte-yellow/10 text-latte-yellow'
                }`}
              >
                {req}
              </span>
            ))}
            {(requirements.missing_requirements?.length || 0) > 2 && (
              <span className={`inline-block px-2 py-1 rounded text-xs ${
                theme === 'dark'
                  ? 'bg-mocha-yellow/10 text-mocha-yellow'
                  : 'bg-latte-yellow/10 text-latte-yellow'
              }`}>
                +{(requirements.missing_requirements?.length || 0) - 2}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
          isEnabled
            ? theme === 'dark'
              ? 'bg-mocha-green/20 text-mocha-green'
              : 'bg-latte-green/20 text-latte-green'
            : theme === 'dark'
              ? 'bg-mocha-surface1/50 text-mocha-subtext0'
              : 'bg-latte-surface1/50 text-latte-subtext0'
        }`}>
          {isEnabled ? 'Ready' : 'Locked'}
        </div>
        
        {isEnabled && (
          <ArrowRightIcon className={`h-4 w-4 transition-transform group-hover:translate-x-1 ${
            theme === 'dark' ? 'text-mocha-subtext0' : 'text-latte-subtext0'
          }`} />
        )}
      </div>
    </motion.div>
  );
}

export default DashboardPage;
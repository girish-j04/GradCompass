import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  AcademicCapIcon, 
  GlobeAltIcon, 
  ChartBarIcon, 
  DocumentTextIcon,
  SparklesIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { useThemeStore } from '../stores/themeStore';

const features = [
  {
    name: 'University Matching',
    description: 'AI-powered recommendations based on your profile and preferences.',
    icon: AcademicCapIcon,
    color: 'from-mocha-mauve to-mocha-pink dark:from-latte-mauve dark:to-latte-pink',
  },
  {
    name: 'Global Opportunities',
    description: 'Explore programs across 17+ countries with personalized insights.',
    icon: GlobeAltIcon,
    color: 'from-mocha-blue to-mocha-sapphire dark:from-latte-blue dark:to-latte-sapphire',
  },
  {
    name: 'Profile Analytics',
    description: 'Track your application readiness with detailed completion metrics.',
    icon: ChartBarIcon,
    color: 'from-mocha-green to-mocha-teal dark:from-latte-green dark:to-latte-teal',
  },
  {
    name: 'Document Assistance',
    description: 'Get help crafting compelling SOPs and application essays.',
    icon: DocumentTextIcon,
    color: 'from-mocha-peach to-mocha-yellow dark:from-latte-peach dark:to-latte-yellow',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delayChildren: 0.3,
      staggerChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  }
};

function LandingPage() {
  const { theme } = useThemeStore();

  return (
    <div className="relative overflow-hidden">
      {/* Hero Section */}
      <section className="relative px-6 lg:px-8 py-24 sm:py-32">
        <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
          <div
            className={`relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem] ${
              theme === 'dark'
                ? 'bg-gradient-to-tr from-mocha-mauve to-mocha-pink'
                : 'bg-gradient-to-tr from-latte-mauve to-latte-pink'
            }`}
          />
        </div>
        
        <motion.div
          className="mx-auto max-w-4xl text-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants} className="mb-8">
            <div className="flex justify-center mb-6">
              <div className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-medium backdrop-blur-sm ${
                theme === 'dark'
                  ? 'bg-mocha-surface0/20 text-mocha-lavender border border-mocha-surface1/30'
                  : 'bg-latte-surface0/20 text-latte-lavender border border-latte-surface1/30'
              }`}>
                <SparklesIcon className="mr-2 h-4 w-4" />
                AI-Powered Graduate Applications
              </div>
            </div>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className={`text-5xl sm:text-7xl font-display font-bold tracking-tight ${
              theme === 'dark' ? 'text-mocha-text' : 'text-latte-text'
            }`}
          >
            Your Path to
            <span className={`block bg-gradient-to-r ${
              theme === 'dark'
                ? 'from-mocha-mauve via-mocha-pink to-mocha-blue'
                : 'from-latte-mauve via-latte-pink to-latte-blue'
            } bg-clip-text text-transparent`}>
              Graduate Success
            </span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className={`mt-6 text-xl leading-8 ${
              theme === 'dark' ? 'text-mocha-subtext0' : 'text-latte-subtext0'
            }`}
          >
            Transform your graduate school journey with AI-driven insights, personalized recommendations, 
            and comprehensive application support tailored to your unique profile.
          </motion.p>

          <motion.div variants={itemVariants} className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className={`group inline-flex items-center justify-center rounded-2xl px-8 py-4 text-lg font-semibold transition-all duration-300 ${
                theme === 'dark'
                  ? 'bg-gradient-to-r from-mocha-mauve to-mocha-pink hover:from-mocha-pink hover:to-mocha-mauve text-mocha-crust shadow-lg hover:shadow-mocha-mauve/25'
                  : 'bg-gradient-to-r from-latte-mauve to-latte-pink hover:from-latte-pink hover:to-latte-mauve text-latte-base shadow-lg hover:shadow-latte-mauve/25'
              } hover:scale-105 transform`}
            >
              Start Your Journey
              <ArrowRightIcon className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            
            <Link
              to="/login"
              className={`inline-flex items-center justify-center rounded-2xl px-8 py-4 text-lg font-semibold transition-all duration-300 backdrop-blur-sm ${
                theme === 'dark'
                  ? 'bg-mocha-surface0/20 text-mocha-text border-2 border-mocha-surface1/30 hover:bg-mocha-surface0/30 hover:border-mocha-mauve/50'
                  : 'bg-latte-surface0/20 text-latte-text border-2 border-latte-surface1/30 hover:bg-latte-surface0/30 hover:border-latte-mauve/50'
              } hover:scale-105 transform`}
            >
              Sign In
            </Link>
          </motion.div>
        </motion.div>

        <div className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]">
          <div
            className={`relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 opacity-20 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem] ${
              theme === 'dark'
                ? 'bg-gradient-to-tr from-mocha-blue to-mocha-sapphire'
                : 'bg-gradient-to-tr from-latte-blue to-latte-sapphire'
            }`}
          />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            className="mx-auto max-w-2xl text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className={`text-3xl font-display font-bold tracking-tight sm:text-4xl ${
              theme === 'dark' ? 'text-mocha-text' : 'text-latte-text'
            }`}>
              Everything you need to succeed
            </h2>
            <p className={`mt-4 text-lg leading-8 ${
              theme === 'dark' ? 'text-mocha-subtext0' : 'text-latte-subtext0'
            }`}>
              Comprehensive tools and insights to guide you through every step of your graduate application journey.
            </p>
          </motion.div>

          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-4">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.name}
                  className="flex flex-col"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <dt className="flex flex-col items-start">
                    <div className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.color} mb-6 shadow-lg`}>
                      <feature.icon className="h-8 w-8 text-white" aria-hidden="true" />
                    </div>
                    <div className={`text-lg font-semibold leading-7 ${
                      theme === 'dark' ? 'text-mocha-text' : 'text-latte-text'
                    }`}>
                      {feature.name}
                    </div>
                  </dt>
                  <dd className={`mt-2 flex flex-auto flex-col text-base leading-7 ${
                    theme === 'dark' ? 'text-mocha-subtext0' : 'text-latte-subtext0'
                  }`}>
                    <p className="flex-auto">{feature.description}</p>
                  </dd>
                </motion.div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={`py-24 sm:py-32 ${
        theme === 'dark' 
          ? 'bg-gradient-to-r from-mocha-surface0/30 via-mocha-mantle/30 to-mocha-surface0/30' 
          : 'bg-gradient-to-r from-latte-surface0/30 via-latte-mantle/30 to-latte-surface0/30'
      } backdrop-blur-sm`}>
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            className="mx-auto max-w-2xl text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className={`text-3xl font-display font-bold tracking-tight sm:text-4xl ${
              theme === 'dark' ? 'text-mocha-text' : 'text-latte-text'
            }`}>
              Ready to get started?
            </h2>
            <p className={`mt-6 text-lg leading-8 ${
              theme === 'dark' ? 'text-mocha-subtext0' : 'text-latte-subtext0'
            }`}>
              Join thousands of students who have successfully navigated their graduate applications with GradPath.
            </p>
            <div className="mt-10">
              <Link
                to="/register"
                className={`inline-flex items-center justify-center rounded-2xl px-8 py-4 text-lg font-semibold transition-all duration-300 ${
                  theme === 'dark'
                    ? 'bg-gradient-to-r from-mocha-mauve to-mocha-pink hover:from-mocha-pink hover:to-mocha-mauve text-mocha-crust shadow-lg hover:shadow-mocha-mauve/25'
                    : 'bg-gradient-to-r from-latte-mauve to-latte-pink hover:from-latte-pink hover:to-latte-mauve text-latte-base shadow-lg hover:shadow-latte-mauve/25'
                } hover:scale-105 transform group`}
              >
                Create Your Account
                <ArrowRightIcon className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

export default LandingPage;
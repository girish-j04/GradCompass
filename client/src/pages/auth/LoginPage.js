import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const schema = yup.object({
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().required('Password is required'),
});

function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuthStore();
  const { theme } = useThemeStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data) => {
    setLoading(true);
    const result = await login(data);
    setLoading(false);
    
    if (result.success) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-center py-12 px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="sm:mx-auto sm:w-full sm:max-w-md"
      >
        <div className="flex justify-center">
          <div className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${
            theme === 'dark'
              ? 'from-mocha-mauve to-mocha-pink'
              : 'from-latte-mauve to-latte-pink'
          } flex items-center justify-center shadow-lg`}>
            <span className="text-white font-bold text-xl">GP</span>
          </div>
        </div>
        <h2 className={`mt-6 text-center text-3xl font-display font-bold tracking-tight ${
          theme === 'dark' ? 'text-mocha-text' : 'text-latte-text'
        }`}>
          Welcome back
        </h2>
        <p className={`mt-2 text-center text-sm ${
          theme === 'dark' ? 'text-mocha-subtext0' : 'text-latte-subtext0'
        }`}>
          Don't have an account?{' '}
          <Link
            to="/register"
            className={`font-medium transition-colors ${
              theme === 'dark'
                ? 'text-mocha-mauve hover:text-mocha-pink'
                : 'text-latte-mauve hover:text-latte-pink'
            }`}
          >
            Sign up here
          </Link>
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md"
      >
        <div className={`rounded-2xl px-8 py-10 shadow-xl backdrop-blur-sm ${
          theme === 'dark'
            ? 'bg-mocha-surface0/30 border border-mocha-surface1/30'
            : 'bg-latte-surface0/30 border border-latte-surface1/30'
        }`}>
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label htmlFor="email" className={`block text-sm font-medium leading-6 ${
                theme === 'dark' ? 'text-mocha-text' : 'text-latte-text'
              }`}>
                Email address
              </label>
              <div className="mt-2">
                <input
                  {...register('email')}
                  type="email"
                  autoComplete="email"
                  className={`block w-full rounded-lg border-0 py-3 px-4 shadow-sm ring-1 ring-inset transition-colors placeholder:text-gray-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6 ${
                    theme === 'dark'
                      ? 'bg-mocha-base text-mocha-text ring-mocha-surface2 focus:ring-mocha-mauve'
                      : 'bg-latte-base text-latte-text ring-latte-surface2 focus:ring-latte-mauve'
                  } ${errors.email ? 'ring-red-500' : ''}`}
                  placeholder="Enter your email"
                />
                {errors.email && (
                  <p className="mt-2 text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="password" className={`block text-sm font-medium leading-6 ${
                theme === 'dark' ? 'text-mocha-text' : 'text-latte-text'
              }`}>
                Password
              </label>
              <div className="mt-2 relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={`block w-full rounded-lg border-0 py-3 px-4 pr-10 shadow-sm ring-1 ring-inset transition-colors placeholder:text-gray-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6 ${
                    theme === 'dark'
                      ? 'bg-mocha-base text-mocha-text ring-mocha-surface2 focus:ring-mocha-mauve'
                      : 'bg-latte-base text-latte-text ring-latte-surface2 focus:ring-latte-mauve'
                  } ${errors.password ? 'ring-red-500' : ''}`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className={`absolute inset-y-0 right-0 pr-3 flex items-center ${
                    theme === 'dark' ? 'text-mocha-subtext0' : 'text-latte-subtext0'
                  }`}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
                {errors.password && (
                  <p className="mt-2 text-sm text-red-500">{errors.password.message}</p>
                )}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className={`flex w-full justify-center items-center rounded-lg px-4 py-3 text-sm font-semibold shadow-sm transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  theme === 'dark'
                    ? 'bg-gradient-to-r from-mocha-mauve to-mocha-pink hover:from-mocha-pink hover:to-mocha-mauve text-mocha-crust focus-visible:outline-mocha-mauve'
                    : 'bg-gradient-to-r from-latte-mauve to-latte-pink hover:from-latte-pink hover:to-latte-mauve text-latte-base focus-visible:outline-latte-mauve'
                } ${!loading ? 'hover:scale-105 transform' : ''}`}
              >
                {loading ? <LoadingSpinner size="sm" /> : 'Sign in'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
export default LoginPage;
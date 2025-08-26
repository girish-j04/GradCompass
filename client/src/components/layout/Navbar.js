import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bars3Icon,
  XMarkIcon,
  SunIcon,
  MoonIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  ChartBarIcon,
  UserIcon,
  BriefcaseIcon
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';

function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
    setProfileMenuOpen(false);
    setMobileMenuOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  const navigation = user ? [
    { name: 'Dashboard', href: '/dashboard', icon: ChartBarIcon },
    { name: 'Profile Setup', href: '/profile/setup', icon: UserIcon },
    { name: 'Work Experience', href: '/profile/work-experience', icon: BriefcaseIcon },
  ] : [];

  return (
    <header className={`sticky top-0 z-50 backdrop-blur-lg ${
      theme === 'dark'
        ? 'bg-mocha-base/80 border-b border-mocha-surface1/30'
        : 'bg-latte-base/80 border-b border-latte-surface1/30'
    }`}>
      <nav className="mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8" aria-label="Global">
        {/* Logo */}
        <div className="flex lg:flex-1">
          <Link to={user ? "/dashboard" : "/"} className="-m-1.5 p-1.5">
            <span className="sr-only">GradCompass</span>
            <div className="flex items-center">
              <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${
                theme === 'dark'
                  ? 'from-mocha-mauve to-mocha-pink'
                  : 'from-latte-mauve to-latte-pink'
              } flex items-center justify-center`}>
                <span className="text-white font-bold text-sm">GP</span>
              </div>
              <span className={`ml-2 text-xl font-display font-bold ${
                theme === 'dark' ? 'text-mocha-text' : 'text-latte-text'
              }`}>
                GradCompass
              </span>
            </div>
          </Link>
        </div>

        {/* Mobile menu button */}
        <div className="flex lg:hidden">
          <button
            type="button"
            className={`-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 ${
              theme === 'dark' ? 'text-mocha-text' : 'text-latte-text'
            }`}
            onClick={() => setMobileMenuOpen(true)}
          >
            <span className="sr-only">Open main menu</span>
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        {/* Desktop navigation */}
        <div className="hidden lg:flex lg:gap-x-8">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? theme === 'dark'
                    ? 'text-mocha-mauve'
                    : 'text-latte-mauve'
                  : theme === 'dark'
                    ? 'text-mocha-subtext0 hover:text-mocha-text'
                    : 'text-latte-subtext0 hover:text-latte-text'
              }`}
            >
              <item.icon className="mr-2 h-4 w-4" />
              {item.name}
            </Link>
          ))}
        </div>

        {/* Right side actions */}
        <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:gap-x-4">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg transition-colors ${
              theme === 'dark'
                ? 'text-mocha-text hover:bg-mocha-surface0'
                : 'text-latte-text hover:bg-latte-surface0'
            }`}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <SunIcon className="h-5 w-5" />
            ) : (
              <MoonIcon className="h-5 w-5" />
            )}
          </button>

          {user ? (
            /* User menu */
            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className={`flex items-center p-2 rounded-lg transition-colors ${
                  theme === 'dark'
                    ? 'text-mocha-text hover:bg-mocha-surface0'
                    : 'text-latte-text hover:bg-latte-surface0'
                }`}
              >
                <UserCircleIcon className="h-6 w-6" />
                <span className="ml-2 text-sm font-medium">{user.full_name}</span>
              </button>

              <AnimatePresence>
                {profileMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className={`absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-2xl shadow-lg ring-1 ${
                      theme === 'dark'
                        ? 'bg-mocha-surface0 ring-mocha-surface2'
                        : 'bg-latte-surface0 ring-latte-surface2'
                    }`}
                  >
                    <div className="py-1">
                      <button
                        onClick={handleLogout}
                        className={`group flex w-full items-center px-4 py-2 text-sm transition-colors ${
                          theme === 'dark'
                            ? 'text-mocha-text hover:bg-mocha-surface1'
                            : 'text-latte-text hover:bg-latte-surface1'
                        }`}
                      >
                        <ArrowRightOnRectangleIcon className="mr-3 h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            /* Auth buttons */
            <div className="flex gap-x-4">
              <Link
                to="/login"
                className={`text-sm font-semibold leading-6 ${
                  theme === 'dark' ? 'text-mocha-text' : 'text-latte-text'
                }`}
              >
                Log in
              </Link>
              <Link
                to="/register"
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  theme === 'dark'
                    ? 'bg-mocha-mauve text-mocha-crust hover:bg-mocha-pink'
                    : 'bg-latte-mauve text-latte-base hover:bg-latte-pink'
                }`}
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="fixed inset-0 z-10" />
            <motion.div
              className={`fixed inset-y-0 right-0 z-10 w-full overflow-y-auto px-6 py-6 sm:max-w-sm ${
                theme === 'dark' ? 'bg-mocha-base' : 'bg-latte-base'
              }`}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
            >
              <div className="flex items-center justify-between">
                <Link to={user ? "/dashboard" : "/"} className="-m-1.5 p-1.5">
                  <div className="flex items-center">
                    <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${
                      theme === 'dark'
                        ? 'from-mocha-mauve to-mocha-pink'
                        : 'from-latte-mauve to-latte-pink'
                    } flex items-center justify-center`}>
                      <span className="text-white font-bold text-sm">GP</span>
                    </div>
                    <span className={`ml-2 text-xl font-display font-bold ${
                      theme === 'dark' ? 'text-mocha-text' : 'text-latte-text'
                    }`}>
                      GradCompass
                    </span>
                  </div>
                </Link>
                <button
                  type="button"
                  className={`-m-2.5 rounded-md p-2.5 ${
                    theme === 'dark' ? 'text-mocha-text' : 'text-latte-text'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="sr-only">Close menu</span>
                  <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>
              
              <div className="mt-6 flow-root">
                <div className="-my-6 divide-y divide-gray-500/10">
                  {user && (
                    <div className="space-y-2 py-6">
                      {navigation.map((item) => (
                        <Link
                          key={item.name}
                          to={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`-mx-3 flex items-center rounded-lg px-3 py-2 text-base font-semibold leading-7 transition-colors ${
                            isActive(item.href)
                              ? theme === 'dark'
                                ? 'text-mocha-mauve bg-mocha-surface0'
                                : 'text-latte-mauve bg-latte-surface0'
                              : theme === 'dark'
                                ? 'text-mocha-text hover:bg-mocha-surface0'
                                : 'text-latte-text hover:bg-latte-surface0'
                          }`}
                        >
                          <item.icon className="mr-3 h-5 w-5" />
                          {item.name}
                        </Link>
                      ))}
                    </div>
                  )}
                  
                  <div className="py-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className={`text-sm font-medium ${
                        theme === 'dark' ? 'text-mocha-subtext0' : 'text-latte-subtext0'
                      }`}>
                        Theme
                      </span>
                      <button
                        onClick={toggleTheme}
                        className={`p-2 rounded-lg transition-colors ${
                          theme === 'dark'
                            ? 'text-mocha-text hover:bg-mocha-surface0'
                            : 'text-latte-text hover:bg-latte-surface0'
                        }`}
                      >
                        {theme === 'dark' ? (
                          <SunIcon className="h-5 w-5" />
                        ) : (
                          <MoonIcon className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                    
                    {user ? (
                      <button
                        onClick={handleLogout}
                        className={`-mx-3 flex w-full items-center rounded-lg px-3 py-2.5 text-base font-semibold leading-7 transition-colors ${
                          theme === 'dark'
                            ? 'text-mocha-red hover:bg-mocha-surface0'
                            : 'text-latte-red hover:bg-latte-surface0'
                        }`}
                      >
                        <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5" />
                        Sign out
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <Link
                          to="/login"
                          onClick={() => setMobileMenuOpen(false)}
                          className={`-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 transition-colors ${
                            theme === 'dark'
                              ? 'text-mocha-text hover:bg-mocha-surface0'
                              : 'text-latte-text hover:bg-latte-surface0'
                          }`}
                        >
                          Log in
                        </Link>
                        <Link
                          to="/register"
                          onClick={() => setMobileMenuOpen(false)}
                          className={`-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 transition-colors ${
                            theme === 'dark'
                              ? 'bg-mocha-mauve text-mocha-crust hover:bg-mocha-pink'
                              : 'bg-latte-mauve text-latte-base hover:bg-latte-pink'
                          }`}
                        >
                          Sign up
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

export default Navbar;
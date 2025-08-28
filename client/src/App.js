import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './stores/authStore';
import { useThemeStore } from './stores/themeStore';

// Components
import Navbar from './components/layout/Navbar';
import LoadingSpinner from './components/ui/LoadingSpinner';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ProfileSetupPage from './pages/ProfileSetupPage';
import WorkExperiencePage from './pages/WorkExperiencePage';
import VisaInterviewPage from './pages/VisaInterviewPage';

// Protected Route Component
function ProtectedRoute({ children }) {
  const { user, loading } = useAuthStore();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  return user ? children : <Navigate to="/login" />;
}

// Public Route Component (redirect to dashboard if logged in)
function PublicRoute({ children }) {
  const { user, loading } = useAuthStore();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  return !user ? children : <Navigate to="/dashboard" />;
}

function App() {
  const { initializeAuth } = useAuthStore();
  const { theme } = useThemeStore();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    // Apply theme to document
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      theme === 'dark' 
        ? 'bg-mocha-base text-mocha-text' 
        : 'bg-latte-base text-latte-text'
    }`}>
      <Router>
        <Navbar />
        
        <Routes>
          {/* Public Routes */}
          <Route 
            path="/" 
            element={
              <PublicRoute>
                <LandingPage />
              </PublicRoute>
            } 
          />
          <Route 
            path="/login" 
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            } 
          />
          <Route 
            path="/register" 
            element={
              <PublicRoute>
                <RegisterPage />
              </PublicRoute>
            } 
          />
          
          {/* Protected Routes */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile/setup" 
            element={
              <ProtectedRoute>
                <ProfileSetupPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile/work-experience" 
            element={
              <ProtectedRoute>
                <WorkExperiencePage />
              </ProtectedRoute>
            } 
          />
          
          {/* Visa Interview Routes */}
          <Route 
            path="/visa-interview" 
            element={
              <ProtectedRoute>
                <VisaInterviewPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/visa-interview/:sessionId" 
            element={
              <ProtectedRoute>
                <VisaInterviewPage />
              </ProtectedRoute>
            } 
          />
          
          {/* Catch all - redirect to appropriate home */}
          <Route 
            path="*" 
            element={<Navigate to="/" replace />} 
          />
        </Routes>
        
        {/* Toast notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: theme === 'dark' ? '#181825' : '#eff1f5',
              color: theme === 'dark' ? '#cdd6f4' : '#4c4f69',
              border: `1px solid ${theme === 'dark' ? '#313244' : '#dce0e8'}`,
            },
            success: {
              iconTheme: {
                primary: theme === 'dark' ? '#a6e3a1' : '#40a02b',
                secondary: theme === 'dark' ? '#181825' : '#eff1f5',
              },
            },
            error: {
              iconTheme: {
                primary: theme === 'dark' ? '#f38ba8' : '#d20f39',
                secondary: theme === 'dark' ? '#181825' : '#eff1f5',
              },
            },
          }}
        />
      </Router>
    </div>
  );
}

export default App;
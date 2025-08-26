import React from 'react';
import { useThemeStore } from '../../stores/themeStore';

function LoadingSpinner({ size = 'md', className = '' }) {
  const { theme } = useThemeStore();
  
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className={`${sizes[size]} animate-spin rounded-full border-2 border-solid ${
          theme === 'dark'
            ? 'border-mocha-surface1 border-t-mocha-mauve'
            : 'border-latte-surface1 border-t-latte-mauve'
        }`}
      />
    </div>
  );
}

export default LoadingSpinner;
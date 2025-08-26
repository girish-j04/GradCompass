import React, { forwardRef } from 'react';

const FormInput = forwardRef(({ 
  label, 
  error, 
  theme, 
  className = '',
  ...props 
}, ref) => {
  return (
    <div className={className}>
      <label className={`block text-sm font-medium leading-6 mb-2 ${
        theme === 'dark' ? 'text-mocha-text' : 'text-latte-text'
      }`}>
        {label}
      </label>
      <input
        ref={ref}
        className={`block w-full rounded-lg border-0 py-3 px-4 shadow-sm ring-1 ring-inset transition-colors placeholder:text-gray-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6 ${
          theme === 'dark'
            ? 'bg-mocha-base text-mocha-text ring-mocha-surface2 focus:ring-mocha-mauve'
            : 'bg-latte-base text-latte-text ring-latte-surface2 focus:ring-latte-mauve'
        } ${error ? 'ring-red-500 focus:ring-red-500' : ''}`}
        {...props}
      />
      {error && (
        <p className="mt-2 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
});

FormInput.displayName = 'FormInput';

export default FormInput;
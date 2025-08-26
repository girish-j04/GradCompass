import React, { forwardRef } from 'react';

const FormSelect = forwardRef(({ 
  label, 
  error, 
  options = [], 
  theme, 
  className = '',
  placeholder = 'Select an option',
  ...props 
}, ref) => {
  return (
    <div className={className}>
      <label className={`block text-sm font-medium leading-6 mb-2 ${
        theme === 'dark' ? 'text-mocha-text' : 'text-latte-text'
      }`}>
        {label}
      </label>
      <select
        ref={ref}
        className={`block w-full rounded-lg border-0 py-3 px-4 shadow-sm ring-1 ring-inset transition-colors focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6 ${
          theme === 'dark'
            ? 'bg-mocha-base text-mocha-text ring-mocha-surface2 focus:ring-mocha-mauve'
            : 'bg-latte-base text-latte-text ring-latte-surface2 focus:ring-latte-mauve'
        } ${error ? 'ring-red-500 focus:ring-red-500' : ''}`}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-2 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
});

FormSelect.displayName = 'FormSelect';

export default FormSelect;
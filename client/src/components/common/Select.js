import React, { forwardRef } from 'react';

const Select = forwardRef(({ 
  label, 
  error, 
  options = [], 
  placeholder = "Select an option",
  className = '', 
  required = false,
  multiple = false,
  ...props 
}, ref) => {
  const baseClasses = 'w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 bg-white';
  const errorClasses = error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : '';
  
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        ref={ref}
        className={`${baseClasses} ${errorClasses} ${className}`}
        multiple={multiple}
        {...props}
      >
        {!multiple && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option, index) => (
          <option key={index} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-sm text-red-600 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
});

Select.displayName = 'Select';

export default Select;
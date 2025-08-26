import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline';

function FormMultiSelect({ 
  label, 
  error, 
  options = [], 
  value = [], 
  onChange, 
  theme, 
  className = '',
  placeholder = 'Select options'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !value.includes(option.value)
  );

  const handleSelect = (optionValue) => {
    const newValue = [...value, optionValue];
    onChange(newValue);
    setSearchTerm('');
  };

  const handleRemove = (optionValue) => {
    const newValue = value.filter(v => v !== optionValue);
    onChange(newValue);
  };

  const getSelectedLabels = () => {
    return value.map(v => {
      const option = options.find(opt => opt.value === v);
      return option ? option.label : v;
    });
  };

  return (
    <div className={className} ref={dropdownRef}>
      <label className={`block text-sm font-medium leading-6 mb-2 ${
        theme === 'dark' ? 'text-mocha-text' : 'text-latte-text'
      }`}>
        {label}
      </label>
      
      <div className="relative">
        <div
          onClick={() => setIsOpen(!isOpen)}
          className={`min-h-[3rem] w-full rounded-lg border-0 p-3 shadow-sm ring-1 ring-inset transition-colors cursor-pointer flex items-center justify-between ${
            theme === 'dark'
              ? 'bg-mocha-base text-mocha-text ring-mocha-surface2'
              : 'bg-latte-base text-latte-text ring-latte-surface2'
          } ${error ? 'ring-red-500' : ''} ${isOpen ? (theme === 'dark' ? 'ring-mocha-mauve' : 'ring-latte-mauve') : ''}`}
        >
          <div className="flex flex-wrap gap-2 flex-1">
            {value.length === 0 ? (
              <span className="text-gray-400">{placeholder}</span>
            ) : (
              getSelectedLabels().map((label, index) => (
                <motion.span
                  key={value[index]}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                    theme === 'dark'
                      ? 'bg-mocha-mauve/20 text-mocha-mauve'
                      : 'bg-latte-mauve/20 text-latte-mauve'
                  }`}
                >
                  {label}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(value[index]);
                    }}
                    className="hover:bg-black/10 rounded"
                  >
                    <XMarkIcon className="h-3 w-3" />
                  </button>
                </motion.span>
              ))
            )}
          </div>
          
          <ChevronDownIcon 
            className={`h-5 w-5 transition-transform ${
              isOpen ? 'transform rotate-180' : ''
            } ${theme === 'dark' ? 'text-mocha-subtext0' : 'text-latte-subtext0'}`} 
          />
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className={`absolute z-10 mt-2 w-full rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 ${
                theme === 'dark'
                  ? 'bg-mocha-surface0 ring-mocha-surface2'
                  : 'bg-latte-surface0 ring-latte-surface2'
              }`}
            >
              <div className="p-2">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search options..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full px-3 py-2 text-sm rounded-md border-0 ring-1 ring-inset transition-colors focus:ring-2 focus:ring-inset ${
                    theme === 'dark'
                      ? 'bg-mocha-base text-mocha-text ring-mocha-surface2 focus:ring-mocha-mauve placeholder:text-mocha-subtext1'
                      : 'bg-latte-base text-latte-text ring-latte-surface2 focus:ring-latte-mauve placeholder:text-latte-subtext1'
                  }`}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              
              <div className="max-h-48 overflow-auto">
                {filteredOptions.length === 0 ? (
                  <div className={`px-3 py-2 text-sm ${
                    theme === 'dark' ? 'text-mocha-subtext0' : 'text-latte-subtext0'
                  }`}>
                    No options available
                  </div>
                ) : (
                  filteredOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSelect(option.value)}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors hover:${
                        theme === 'dark' ? 'bg-mocha-surface1' : 'bg-latte-surface1'
                      } ${theme === 'dark' ? 'text-mocha-text' : 'text-latte-text'}`}
                    >
                      {option.label}
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {error && (
        <p className="mt-2 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}

export default FormMultiSelect;
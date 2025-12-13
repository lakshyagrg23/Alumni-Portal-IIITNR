import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import styles from './AutocompleteInput.module.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const AutocompleteInput = ({
  value,
  onChange,
  onSelect,
  apiEndpoint, // e.g., "companies", "cities", "industries"
  placeholder,
  name,
  minChars = 2,
  debounceMs = 300,
  className = '',
  disabled = false,
  required = false,
  ...props
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [error, setError] = useState(null);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const debounceTimer = useRef(null);

  // Fetch suggestions from API
  const fetchSuggestions = async (query) => {
    if (!query || query.length < minChars) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/alumni/search/suggestions`,
        {
          params: { 
            type: apiEndpoint, 
            query: query.trim() 
          },
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      const data = response.data?.data || [];
      setSuggestions(data);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Autocomplete fetch error:', error);
      setError('Failed to load suggestions');
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    onChange(e);

    // Reset highlighted index
    setHighlightedIndex(-1);

    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new timer
    debounceTimer.current = setTimeout(() => {
      fetchSuggestions(newValue);
    }, debounceMs);
  };

  // Handle suggestion selection
  const handleSelectSuggestion = (suggestion) => {
    if (onSelect) {
      onSelect(suggestion);
    } else {
      // Default behavior: update input value
      const syntheticEvent = {
        target: {
          name: name,
          value: suggestion,
        },
      };
      onChange(syntheticEvent);
    }
    
    setShowSuggestions(false);
    setSuggestions([]);
    setHighlightedIndex(-1);
    
    // Focus back on input
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) {
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          handleSelectSuggestion(suggestions[highlightedIndex]);
        }
        break;
      
      case 'Escape':
        e.preventDefault();
        setShowSuggestions(false);
        setHighlightedIndex(-1);
        break;
      
      case 'Tab':
        // Allow tab to close suggestions
        setShowSuggestions(false);
        break;
      
      default:
        break;
    }
  };

  // Handle input focus
  const handleFocus = () => {
    // Show suggestions if we have some and input has value
    if (value && value.length >= minChars && suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  // Handle input blur (with delay to allow click on suggestions)
  const handleBlur = () => {
    setTimeout(() => {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }, 200);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return (
    <div ref={wrapperRef} className={styles.autocompleteWrapper}>
      <div className={styles.inputContainer}>
        <input
          ref={inputRef}
          type="text"
          name={name}
          value={value || ''}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={`${className} ${styles.autocompleteInput}`}
          disabled={disabled}
          required={required}
          autoComplete="off"
          {...props}
        />
        
        {loading && (
          <span className={styles.loadingSpinner} title="Loading suggestions...">
            ⏳
          </span>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <ul className={styles.suggestionsList} role="listbox">
          {suggestions.map((suggestion, index) => (
            <li
              key={`${suggestion}-${index}`}
              role="option"
              aria-selected={index === highlightedIndex}
              className={`${styles.suggestionItem} ${
                index === highlightedIndex ? styles.highlighted : ''
              }`}
              onClick={() => handleSelectSuggestion(suggestion)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}

      {showSuggestions && suggestions.length === 0 && !loading && value && value.length >= minChars && (
        <div className={styles.noResults}>
          No suggestions found. Your entry will be added as new.
        </div>
      )}

      {error && <div className={styles.errorMessage}>{error}</div>}
    </div>
  );
};

export default AutocompleteInput;

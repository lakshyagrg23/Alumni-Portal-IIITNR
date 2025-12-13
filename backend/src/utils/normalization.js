/**
 * Utility functions for normalizing and standardizing user input data
 * to prevent duplicate entries with different casings/spellings
 */

/**
 * Normalize text by trimming, standardizing case
 * @param {string} text - Input text
 * @returns {string} - Normalized text
 */
const normalizeText = (text) => {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .trim()
    .split(/\s+/) // Split by whitespace
    .map(word => 
      // Capitalize first letter, lowercase rest
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join(' ');
};

/**
 * Normalize company name
 * Handles: "google" -> "Google", "MICROSOFT" -> "Microsoft"
 * Preserves: "IBM", "TCS", "IIT" (all caps acronyms)
 * @param {string} company - Company name
 * @returns {string} - Normalized company name
 */
const normalizeCompanyName = (company) => {
  if (!company) return '';
  
  const trimmed = company.trim();
  
  // Check if it's likely an acronym (all caps, length <= 6)
  if (trimmed.length <= 6 && trimmed === trimmed.toUpperCase() && /^[A-Z]+$/.test(trimmed)) {
    return trimmed; // Keep acronyms as-is (IBM, TCS, etc.)
  }
  
  // Normalize like normal text
  return normalizeText(trimmed);
};

/**
 * Normalize city name
 * Handles: "bangalore" -> "Bangalore", "NEW DELHI" -> "New Delhi"
 * Special cases: "bengaluru" -> "Bangalore" (common alternate spellings)
 * @param {string} city - City name
 * @returns {string} - Normalized city name
 */
const normalizeCityName = (city) => {
  if (!city) return '';
  
  const normalized = normalizeText(city);
  
  // Map common alternate spellings to canonical form
  const cityMappings = {
    'Bengaluru': 'Bangalore',
    'Banguluru': 'Bangalore',
    'Bengalooru': 'Bangalore',
    'Mumbay': 'Mumbai',
    'Bombay': 'Mumbai',
    'Calcutta': 'Kolkata',
    'Madras': 'Chennai',
    'Pune': 'Pune',
    'Poona': 'Pune',
  };
  
  return cityMappings[normalized] || normalized;
};

/**
 * Normalize state name
 * @param {string} state - State name
 * @returns {string} - Normalized state name
 */
const normalizeStateName = (state) => {
  if (!state) return '';
  return normalizeText(state);
};

/**
 * Normalize country name
 * @param {string} country - Country name
 * @returns {string} - Normalized country name
 */
const normalizeCountryName = (country) => {
  if (!country) return '';
  
  const normalized = normalizeText(country);
  
  // Map common variations to standard names
  const countryMappings = {
    'Usa': 'United States',
    'Us': 'United States',
    'United States Of America': 'United States',
    'Uk': 'United Kingdom',
    'Great Britain': 'United Kingdom',
    'Uae': 'United Arab Emirates',
  };
  
  return countryMappings[normalized] || normalized;
};

/**
 * Normalize industry/sector name
 * @param {string} industry - Industry name
 * @returns {string} - Normalized industry name
 */
const normalizeIndustry = (industry) => {
  if (!industry) return '';
  return normalizeText(industry);
};

/**
 * Parse location string "City, State, Country" into components
 * @param {string} locationString - Combined location string
 * @returns {Object} - { city, state, country }
 */
const parseLocationString = (locationString) => {
  if (!locationString || typeof locationString !== 'string') {
    return { city: '', state: '', country: '' };
  }
  
  const parts = locationString
    .split(',')
    .map(part => part.trim())
    .filter(part => part.length > 0);
  
  if (parts.length === 3) {
    // "Bangalore, Karnataka, India"
    return {
      city: normalizeCityName(parts[0]),
      state: normalizeStateName(parts[1]),
      country: normalizeCountryName(parts[2]),
    };
  } else if (parts.length === 2) {
    // "Bangalore, India" (missing state)
    return {
      city: normalizeCityName(parts[0]),
      state: '',
      country: normalizeCountryName(parts[1]),
    };
  } else if (parts.length === 1) {
    // "Bangalore" (only city)
    return {
      city: normalizeCityName(parts[0]),
      state: '',
      country: '',
    };
  }
  
  return { city: '', state: '', country: '' };
};

/**
 * Format location components into standard string
 * @param {string} city - City name
 * @param {string} state - State name
 * @param {string} country - Country name
 * @returns {string} - Formatted "City, State, Country"
 */
const formatLocationString = (city, state, country) => {
  const parts = [];
  
  if (city) parts.push(normalizeCityName(city));
  if (state) parts.push(normalizeStateName(state));
  if (country) parts.push(normalizeCountryName(country));
  
  return parts.join(', ');
};

/**
 * Fuzzy match two strings (for duplicate detection)
 * Returns true if strings are likely the same despite minor differences
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {boolean} - Whether strings match
 */
const fuzzyMatch = (str1, str2) => {
  if (!str1 || !str2) return false;
  
  const norm1 = str1.toLowerCase().replace(/[^a-z0-9]/g, '');
  const norm2 = str2.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  return norm1 === norm2;
};

/**
 * Normalize profile data before saving to database
 * @param {Object} profileData - Profile data object
 * @returns {Object} - Normalized profile data
 */
const normalizeProfileData = (profileData) => {
  const normalized = { ...profileData };
  
  // Normalize company
  if (normalized.currentCompany) {
    normalized.currentCompany = normalizeCompanyName(normalized.currentCompany);
  }
  if (normalized.currentEmployer) {
    normalized.currentEmployer = normalizeCompanyName(normalized.currentEmployer);
  }
  
  // Normalize location
  if (normalized.currentCity) {
    normalized.currentCity = normalizeCityName(normalized.currentCity);
  }
  if (normalized.currentState) {
    normalized.currentState = normalizeStateName(normalized.currentState);
  }
  if (normalized.currentCountry) {
    normalized.currentCountry = normalizeCountryName(normalized.currentCountry);
  }
  
  // Normalize industry
  if (normalized.industry) {
    normalized.industry = normalizeIndustry(normalized.industry);
  }
  if (normalized.industrySector || normalized.industry_sector) {
    const field = normalized.industrySector ? 'industrySector' : 'industry_sector';
    normalized[field] = normalizeIndustry(normalized[field]);
  }
  
  return normalized;
};

export {
  normalizeText,
  normalizeCompanyName,
  normalizeCityName,
  normalizeStateName,
  normalizeCountryName,
  normalizeIndustry,
  parseLocationString,
  formatLocationString,
  fuzzyMatch,
  normalizeProfileData,
};

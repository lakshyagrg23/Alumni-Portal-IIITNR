---
name: Alumni Directory with Search & Filters
about: Build the alumni directory page with advanced search, filtering, and pagination
title: "[FRONTEND] Alumni Directory with Search & Filters"
labels: ["frontend", "Priority: High", "directory"]
assignees: []
---

## 🔍 Alumni Directory with Search & Filters

### **Description**
Create a comprehensive alumni directory that allows users to search, filter, and browse through alumni profiles with advanced filtering options, pagination, and responsive design.

### **Acceptance Criteria**
- [ ] Alumni directory page with grid/list view
- [ ] Real-time search functionality
- [ ] Advanced filtering options
- [ ] Pagination with customizable page sizes
- [ ] Sorting options (name, graduation year, company)
- [ ] Responsive design (mobile/tablet/desktop)
- [ ] Loading states and empty states
- [ ] Alumni profile cards with essential information
- [ ] Quick contact/connect buttons

### **Directory Features**

#### **Search Functionality**
- [ ] **Global Search**: Search across name, company, position, location
- [ ] **Real-time Search**: Results update as user types (debounced)
- [ ] **Search Suggestions**: Auto-complete for common searches
- [ ] **Search History**: Recently searched terms
- [ ] **Clear Search**: Easy way to reset search

#### **Filter Options**
```javascript
const FILTER_OPTIONS = {
  graduationYear: ['2010', '2011', '2012', ..., '2024', '2025'],
  course: [
    'Computer Science & Engineering',
    'Electronics & Communication',
    'Information Technology',
    'Data Science & AI',
    'Cybersecurity'
  ],
  location: ['Bangalore', 'Hyderabad', 'Mumbai', 'Delhi', 'Pune', 'Other'],
  company: ['Google', 'Microsoft', 'Amazon', 'Meta', 'Apple', 'Other'],
  experience: ['0-2 years', '2-5 years', '5-10 years', '10+ years']
};
```

#### **Sorting Options**
- [ ] **Alphabetical**: First name A-Z, Z-A
- [ ] **Graduation Year**: Newest first, Oldest first
- [ ] **Recently Joined**: Latest members first
- [ ] **Location**: Group by location
- [ ] **Company**: Group by current company

### **Component Structure**
```
/src/components/directory/
├── AlumniDirectory.jsx      // Main directory page
├── SearchBar.jsx            // Search input with suggestions
├── FilterPanel.jsx          // Filter sidebar/drawer
├── AlumniCard.jsx          // Individual alumni card
├── AlumniGrid.jsx          // Grid layout for cards
├── AlumniList.jsx          // List layout for cards
├── Pagination.jsx          // Pagination controls
├── SortControls.jsx        // Sort dropdown/buttons
├── ViewToggle.jsx          // Grid/List view toggle
└── LoadingSkeletons.jsx    // Loading placeholders
```

### **Main Directory Component**
```javascript
// components/directory/AlumniDirectory.jsx
const AlumniDirectory = () => {
  const [alumni, setAlumni] = useState([]);
  const [filteredAlumni, setFilteredAlumni] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    graduationYear: '',
    course: '',
    location: '',
    company: '',
    experience: ''
  });
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // Data fetching and filtering logic
  // Search implementation
  // Filter and sort logic
  // Pagination logic
  
  return (
    <div className={styles.directoryContainer}>
      <DirectoryHeader />
      <SearchBar />
      <div className={styles.directoryContent}>
        <FilterPanel />
        <div className={styles.resultsSection}>
          <ResultsHeader />
          <ViewControls />
          {viewMode === 'grid' ? <AlumniGrid /> : <AlumniList />}
          <Pagination />
        </div>
      </div>
    </div>
  );
};
```

### **Search Implementation**
```javascript
// components/directory/SearchBar.jsx
import { useMemo, useState, useCallback } from 'react';
import { debounce } from 'lodash';

const SearchBar = ({ onSearch, suggestions = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const debouncedSearch = useCallback(
    debounce((term) => {
      onSearch(term);
    }, 300),
    [onSearch]
  );

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    debouncedSearch(value);
  };

  const filteredSuggestions = useMemo(() => {
    if (!searchTerm) return [];
    return suggestions.filter(suggestion =>
      suggestion.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 5);
  }, [searchTerm, suggestions]);

  return (
    <div className={styles.searchContainer}>
      <div className={styles.searchInputWrapper}>
        <input
          type="text"
          placeholder="Search alumni by name, company, or location..."
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setShowSuggestions(true)}
          className={styles.searchInput}
        />
        <SearchIcon className={styles.searchIcon} />
      </div>
      
      {showSuggestions && filteredSuggestions.length > 0 && (
        <SuggestionsList suggestions={filteredSuggestions} />
      )}
    </div>
  );
};
```

### **Filter Panel Component**
```javascript
// components/directory/FilterPanel.jsx
const FilterPanel = ({ filters, onFilterChange, onClearFilters }) => {
  const [isOpen, setIsOpen] = useState(false); // For mobile drawer

  return (
    <div className={`${styles.filterPanel} ${isOpen ? styles.open : ''}`}>
      <div className={styles.filterHeader}>
        <h3>Filters</h3>
        <button onClick={onClearFilters} className={styles.clearButton}>
          Clear All
        </button>
      </div>

      <div className={styles.filterSection}>
        <FilterGroup
          title="Graduation Year"
          options={FILTER_OPTIONS.graduationYear}
          value={filters.graduationYear}
          onChange={(value) => onFilterChange('graduationYear', value)}
        />
        
        <FilterGroup
          title="Course"
          options={FILTER_OPTIONS.course}
          value={filters.course}
          onChange={(value) => onFilterChange('course', value)}
        />
        
        <FilterGroup
          title="Location"
          options={FILTER_OPTIONS.location}
          value={filters.location}
          onChange={(value) => onFilterChange('location', value)}
        />
        
        <FilterGroup
          title="Company"
          options={FILTER_OPTIONS.company}
          value={filters.company}
          onChange={(value) => onFilterChange('company', value)}
        />
      </div>

      {/* Mobile close button */}
      <button 
        className={styles.mobileCloseButton}
        onClick={() => setIsOpen(false)}
      >
        Apply Filters
      </button>
    </div>
  );
};
```

### **Alumni Card Component**
```javascript
// components/directory/AlumniCard.jsx
const AlumniCard = ({ alumni, viewMode = 'grid' }) => {
  const {
    id, first_name, last_name, graduation_year, course,
    current_company, current_position, location,
    profile_image_url, linkedin_url, is_public
  } = alumni;

  if (!is_public) return null; // Respect privacy settings

  return (
    <div className={`${styles.alumniCard} ${styles[viewMode]}`}>
      <div className={styles.cardHeader}>
        <img
          src={profile_image_url || '/default-avatar.png'}
          alt={`${first_name} ${last_name}`}
          className={styles.profileImage}
        />
        <div className={styles.nameSection}>
          <h3 className={styles.fullName}>
            {first_name} {last_name}
          </h3>
          <p className={styles.graduationInfo}>
            {course} • Class of {graduation_year}
          </p>
        </div>
      </div>

      <div className={styles.cardBody}>
        {current_company && (
          <div className={styles.workInfo}>
            <p className={styles.position}>{current_position}</p>
            <p className={styles.company}>{current_company}</p>
          </div>
        )}
        
        {location && (
          <p className={styles.location}>
            <LocationIcon /> {location}
          </p>
        )}
      </div>

      <div className={styles.cardActions}>
        <Link 
          to={`/profile/${id}`} 
          className={styles.viewProfileButton}
        >
          View Profile
        </Link>
        
        {linkedin_url && (
          <a 
            href={linkedin_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className={styles.linkedinButton}
          >
            <LinkedInIcon />
          </a>
        )}
        
        <button className={styles.connectButton}>
          <ConnectIcon /> Connect
        </button>
      </div>
    </div>
  );
};
```

### **Pagination Component**
```javascript
// components/directory/Pagination.jsx
const Pagination = ({ 
  currentPage, 
  totalPages, 
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange 
}) => {
  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];
    
    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  return (
    <div className={styles.paginationContainer}>
      <div className={styles.paginationInfo}>
        Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalItems)} of {totalItems} alumni
      </div>
      
      <div className={styles.paginationControls}>
        <button 
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={styles.pageButton}
        >
          Previous
        </button>
        
        {getVisiblePages().map((page, index) => (
          <button
            key={index}
            onClick={() => typeof page === 'number' && onPageChange(page)}
            className={`${styles.pageButton} ${
              page === currentPage ? styles.active : ''
            } ${typeof page !== 'number' ? styles.dots : ''}`}
            disabled={typeof page !== 'number'}
          >
            {page}
          </button>
        ))}
        
        <button 
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={styles.pageButton}
        >
          Next
        </button>
      </div>

      <div className={styles.pageSizeSelector}>
        <label>Show:</label>
        <select 
          value={pageSize} 
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className={styles.pageSizeSelect}
        >
          <option value={12}>12</option>
          <option value={24}>24</option>
          <option value={48}>48</option>
        </select>
        <span>per page</span>
      </div>
    </div>
  );
};
```

### **Advanced Features**

#### **Saved Searches**
```javascript
// Save user's frequently used search/filter combinations
const savedSearches = [
  {
    id: 1,
    name: "CS 2020 Bangalore",
    filters: { course: "Computer Science", graduationYear: "2020", location: "Bangalore" }
  }
];
```

#### **Export Functionality**
```javascript
// Export search results to CSV
const exportToCSV = (alumni) => {
  const csvData = alumni.map(alumni => ({
    name: `${alumni.first_name} ${alumni.last_name}`,
    graduation_year: alumni.graduation_year,
    course: alumni.course,
    company: alumni.current_company,
    location: alumni.location
  }));
  
  // CSV generation and download logic
};
```

### **Responsive Design Requirements**

#### **Mobile (< 768px)**
- [ ] Filter panel as slide-out drawer
- [ ] Single column card layout
- [ ] Simplified pagination (Previous/Next only)
- [ ] Touch-friendly buttons
- [ ] Condensed card information

#### **Tablet (768px - 1024px)**
- [ ] Two-column card layout
- [ ] Collapsible filter sidebar
- [ ] Horizontal scroll for filter chips

#### **Desktop (> 1024px)**
- [ ] Three-column card layout
- [ ] Full filter sidebar
- [ ] Complete pagination controls

### **Performance Optimizations**
- [ ] **Virtual Scrolling**: For large result sets
- [ ] **Image Lazy Loading**: Load profile images as needed
- [ ] **Debounced Search**: Prevent excessive API calls
- [ ] **Memoized Components**: Optimize re-renders
- [ ] **Infinite Scroll**: Alternative to pagination

### **Files to Create/Modify**
- `/src/pages/Directory.jsx`
- `/src/components/directory/` (all components above)
- `/src/hooks/useAlumniDirectory.js`
- `/src/services/directoryService.js`
- `/src/utils/searchUtils.js`
- `/src/utils/filterUtils.js`

### **API Integration**
```javascript
// services/directoryService.js
export const searchAlumni = async (params) => {
  const queryParams = new URLSearchParams({
    search: params.searchTerm,
    graduation_year: params.graduationYear,
    course: params.course,
    location: params.location,
    company: params.company,
    page: params.page,
    limit: params.pageSize,
    sort_by: params.sortBy,
    sort_order: params.sortOrder
  });

  const response = await fetch(`/api/profiles/search?${queryParams}`);
  return response.json();
};
```

### **Definition of Done**
- [ ] All acceptance criteria met
- [ ] Search functionality working smoothly
- [ ] All filter options functional
- [ ] Pagination working correctly
- [ ] Responsive design implemented
- [ ] Performance optimized
- [ ] Loading and empty states
- [ ] Code reviewed and documented

### **Priority**: 🔴 High
### **Estimated Time**: 12-16 hours
### **Dependencies**: Alumni Profile Management (#4)

---
name: Alumni Profile Management (Full-Stack)
about: Complete alumni profile system with creation, editing, and profile viewing
title: "[FULL-STACK] Alumni Profile Management System"
labels: ["full-stack", "Priority: High", "profiles"]
assignees: []
---

## 👤 Alumni Profile Management System

### **Description**
Implement a comprehensive alumni profile management system that allows users to create, edit, and view detailed alumni profiles with professional information, achievements, and contact details.

### **Acceptance Criteria**

#### **Backend API**
- [ ] Profile creation endpoint
- [ ] Profile update endpoint
- [ ] Profile retrieval (public/private data)
- [ ] Profile image upload
- [ ] Profile search and filtering
- [ ] Privacy settings management

#### **Frontend UI**
- [ ] Profile creation form (multi-step)
- [ ] Profile editing interface
- [ ] Profile viewing page
- [ ] Image upload with preview
- [ ] Privacy controls
- [ ] Profile completion progress

#### **Data Management**
- [ ] Validation for all profile fields
- [ ] Image processing and storage
- [ ] Privacy level handling
- [ ] Professional information management

### **Database Schema Enhancement**
The `alumni_profiles` table already exists. Ensure these fields are properly handled:

```sql
-- Key fields from existing schema
id, user_id, first_name, last_name, graduation_year, course, 
current_company, current_position, location, bio, skills,
linkedin_url, github_url, website_url, phone, achievements,
is_public, profile_image_url, created_at, updated_at
```

### **Backend Implementation**

#### **API Endpoints** (`/api/profiles/`)
```javascript
POST   /                    // Create new profile
GET    /:id                 // Get profile by ID (with privacy)
PUT    /:id                 // Update profile
DELETE /:id                 // Delete profile
POST   /:id/image          // Upload profile image
GET    /search             // Search profiles with filters
GET    /me                 // Get current user's profile
PUT    /privacy            // Update privacy settings
```

#### **Profile Controller**
```javascript
// controllers/profileController.js
exports.createProfile = async (req, res) => {
  try {
    const { user_id } = req.user;
    const profileData = req.body;
    
    // Validation
    // Create profile
    // Return response
  } catch (error) {
    // Error handling
  }
};

exports.updateProfile = async (req, res) => {
  // Update logic with privacy checks
};

exports.getProfile = async (req, res) => {
  // Get profile with privacy filtering
};
```

#### **Image Upload Handling**
```javascript
// middleware/upload.js
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: 'uploads/profiles/',
  filename: (req, file, cb) => {
    cb(null, `${req.user.id}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb('Error: Images Only!');
    }
  }
});
```

### **Frontend Implementation**

#### **Components Structure**
```
/src/components/profiles/
├── ProfileForm.jsx          // Multi-step profile creation/edit
├── ProfileView.jsx          // Display profile information
├── ProfileCard.jsx          // Compact profile display
├── ImageUpload.jsx          // Profile image upload
├── PrivacySettings.jsx      // Privacy controls
├── ProfessionalInfo.jsx     // Work experience section
├── AchievementsSection.jsx  // Achievements display
└── ContactInfo.jsx          // Contact information
```

#### **Multi-Step Profile Form**
```javascript
// components/profiles/ProfileForm.jsx
const ProfileForm = ({ mode = 'create', existingProfile = null }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Personal Information
    first_name: '',
    last_name: '',
    graduation_year: '',
    course: '',
    bio: '',
    
    // Professional Information
    current_company: '',
    current_position: '',
    location: '',
    skills: [],
    
    // Contact & Social
    linkedin_url: '',
    github_url: '',
    website_url: '',
    phone: '',
    
    // Privacy
    is_public: true,
    
    // Image
    profile_image: null
  });

  const steps = [
    { title: 'Personal Info', component: PersonalInfoStep },
    { title: 'Professional', component: ProfessionalInfoStep },
    { title: 'Contact & Social', component: ContactInfoStep },
    { title: 'Privacy & Image', component: PrivacyImageStep }
  ];
  
  // Step navigation logic
  // Form submission
  // Validation
};
```

#### **Profile View Component**
```javascript
// components/profiles/ProfileView.jsx
const ProfileView = ({ profileId, isOwnProfile = false }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Fetch profile data
  // Handle privacy restrictions
  // Display profile information
  
  return (
    <div className={styles.profileContainer}>
      <ProfileHeader profile={profile} isOwnProfile={isOwnProfile} />
      <ProfileTabs profile={profile} />
      {isOwnProfile && <EditButton />}
    </div>
  );
};
```

### **Validation Rules**

#### **Required Fields**
- [ ] First Name (2-50 characters)
- [ ] Last Name (2-50 characters)
- [ ] Graduation Year (2010-2030)
- [ ] Course (from predefined list)

#### **Optional Fields with Validation**
- [ ] Bio (max 500 characters)
- [ ] Phone (valid format with country code)
- [ ] LinkedIn URL (valid LinkedIn profile format)
- [ ] GitHub URL (valid GitHub profile format)
- [ ] Website URL (valid URL format)
- [ ] Skills (array of strings, max 20 skills)

#### **Image Validation**
- [ ] File types: JPEG, PNG, GIF
- [ ] Maximum size: 5MB
- [ ] Minimum dimensions: 200x200px
- [ ] Automatic resizing for optimization

### **Privacy Features**

#### **Privacy Levels**
```javascript
const PRIVACY_LEVELS = {
  PUBLIC: 'public',           // Visible to all users
  ALUMNI_ONLY: 'alumni_only', // Visible to verified alumni only
  CONNECTIONS: 'connections',  // Visible to connected alumni only
  PRIVATE: 'private'          // Not visible in directory
};
```

#### **Field-Level Privacy**
- [ ] Contact information (phone, email)
- [ ] Current company and position
- [ ] Location information
- [ ] Social media links

### **Search and Filtering**

#### **Search Parameters**
```javascript
// API: GET /api/profiles/search
{
  "query": "search term",
  "graduation_year": "2020",
  "course": "Computer Science",
  "location": "Bangalore",
  "company": "Google",
  "skills": ["React", "Node.js"],
  "page": 1,
  "limit": 20,
  "sort_by": "graduation_year",
  "sort_order": "desc"
}
```

### **UI/UX Requirements**

#### **Profile Completion Indicator**
```javascript
const calculateCompleteness = (profile) => {
  const fields = [
    'first_name', 'last_name', 'graduation_year', 'course',
    'bio', 'current_company', 'current_position', 'location',
    'linkedin_url', 'profile_image_url'
  ];
  
  const completed = fields.filter(field => 
    profile[field] && profile[field].trim() !== ''
  ).length;
  
  return Math.round((completed / fields.length) * 100);
};
```

#### **Responsive Design**
- [ ] Mobile-optimized profile forms
- [ ] Touch-friendly image upload
- [ ] Collapsible sections on mobile
- [ ] Horizontal scrolling for skills tags

### **Files to Create/Modify**

#### **Backend**
- `/backend/src/routes/profiles.js`
- `/backend/src/controllers/profileController.js`
- `/backend/src/models/AlumniProfile.js`
- `/backend/src/middleware/upload.js`
- `/backend/src/utils/imageProcessor.js`

#### **Frontend**
- `/src/pages/Profile.jsx`
- `/src/pages/ProfileEdit.jsx`
- `/src/components/profiles/` (all components above)
- `/src/services/profileService.js`
- `/src/hooks/useProfile.js`

### **Testing Requirements**

#### **Backend Testing**
- [ ] Profile CRUD operations
- [ ] Image upload functionality
- [ ] Privacy filtering
- [ ] Search and filtering
- [ ] Validation error handling

#### **Frontend Testing**
- [ ] Multi-step form navigation
- [ ] Form validation
- [ ] Image upload and preview
- [ ] Profile viewing with different privacy levels
- [ ] Responsive design testing

### **Definition of Done**
- [ ] All acceptance criteria met
- [ ] Complete profile management workflow
- [ ] Image upload working properly
- [ ] Privacy controls functional
- [ ] Search and filtering operational
- [ ] Responsive design implemented
- [ ] Comprehensive testing completed
- [ ] Code reviewed and documented

### **Priority**: 🔴 High
### **Estimated Time**: 16-20 hours
### **Dependencies**: 
- Database Setup (#1)
- Backend Authentication (#2)
- Frontend Authentication (#3)

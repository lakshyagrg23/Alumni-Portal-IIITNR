# Local Testing Guide - Profile Picture Upload System

## 🧪 Testing the Profile Picture Upload Locally

This guide will help you test the complete profile picture upload system on your local development environment before deploying to the server.

---

## ✅ Prerequisites Checklist

- [x] Backend folder structure includes `uploads/profile_pics`
- [ ] Backend server is running
- [ ] Frontend development server is running
- [ ] You have a test user account to login
- [ ] PostgreSQL database is running locally

---

## 🚀 Step 1: Start Backend Server

Open a terminal and run:

```powershell
cd "d:\Web Development\WebD Projects\Projects\Alumni Portal\backend"
npm run dev:local
```

You should see:
```
✅ Database connection has been established successfully.
🚀 Server is running on port 5000
🌐 Environment: development
```

**Note**: The backend is configured to serve uploads from `http://localhost:5000/uploads/profile_pics/`

---

## 🎨 Step 2: Start Frontend Server

Open another terminal and run:

```powershell
cd "d:\Web Development\WebD Projects\Projects\Alumni Portal\frontend"
npm run dev
```

You should see:
```
VITE ready in XXX ms
➜  Local:   http://localhost:3000/
```

---

## 🔐 Step 3: Login to Your Account

1. Navigate to `http://localhost:3000`
2. Login with your test account
3. Navigate to your profile page (usually `/profile` or `/profile/edit`)

---

## 🖼️ Step 4: Integrate ProfilePictureUpload Component

If you haven't added the component to your profile page yet, here's how:

### Option A: Quick Test in Existing Profile Page

Find your profile edit page (likely in `frontend/src/pages/Profile.jsx` or similar) and add:

```jsx
import ProfilePictureUpload from '../components/profile/ProfilePictureUpload';

// Inside your component
const [profileData, setProfileData] = useState({});

// Add this where you want the upload component
<ProfilePictureUpload
  currentPictureUrl={profileData.profile_picture_url}
  onUploadSuccess={(newUrl) => {
    setProfileData(prev => ({
      ...prev,
      profile_picture_url: newUrl
    }));
  }}
/>
```

### Option B: Create a Test Page

Create `frontend/src/pages/TestUpload.jsx`:

```jsx
import { useState, useEffect } from 'react';
import ProfilePictureUpload from '../components/profile/ProfilePictureUpload';
import axios from 'axios';

const TestUpload = () => {
  const [profileData, setProfileData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch current profile
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          'http://localhost:5000/api/alumni/profile',
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        setProfileData(response.data.profile);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleUploadSuccess = (newUrl) => {
    setProfileData(prev => ({
      ...prev,
      profile_picture_url: newUrl
    }));
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Test Profile Picture Upload</h1>
      
      <ProfilePictureUpload
        currentPictureUrl={profileData.profile_picture_url}
        onUploadSuccess={handleUploadSuccess}
      />

      <div style={{ marginTop: '2rem', padding: '1rem', background: '#f3f4f6', borderRadius: '8px' }}>
        <h3>Current Profile Data:</h3>
        <pre>{JSON.stringify(profileData, null, 2)}</pre>
      </div>
    </div>
  );
};

export default TestUpload;
```

Add route in your `App.jsx`:
```jsx
import TestUpload from './pages/TestUpload';

// In your routes
<Route path="/test-upload" element={<TestUpload />} />
```

Then navigate to `http://localhost:3000/test-upload`

---

## 🧪 Step 5: Test Upload Flow

### Test 1: Upload a Profile Picture

1. Click **"Select Picture"**
2. Choose an image file (JPEG, PNG, or WebP)
3. See the preview appear
4. Click **"Upload Picture"**
5. Wait for success message
6. Verify the image is displayed

**Expected Result:**
- ✅ Preview shows before upload
- ✅ Upload button becomes active
- ✅ Success message appears
- ✅ Image persists after refresh
- ✅ File created in `backend/uploads/profile_pics/`

### Test 2: Replace Existing Picture

1. Upload a different image
2. Click **"Upload Picture"**
3. Check `backend/uploads/profile_pics/` folder

**Expected Result:**
- ✅ Old image file is deleted
- ✅ New image file is created
- ✅ Database updated with new URL

### Test 3: Delete Profile Picture

1. Click **"Delete Picture"**
2. Confirm deletion
3. Wait for success message

**Expected Result:**
- ✅ Image disappears
- ✅ Placeholder shown
- ✅ File deleted from `backend/uploads/profile_pics/`
- ✅ Database `profile_picture_url` set to NULL

### Test 4: Validation Tests

**File Too Large:**
1. Try uploading an image > 2MB
2. **Expected:** Error message "File size too large. Maximum size is 2MB."

**Invalid File Type:**
1. Try uploading a PDF or text file
2. **Expected:** Error message "Please select a valid image file..."

**No Authentication:**
1. Logout
2. Try accessing upload endpoint directly
3. **Expected:** 401 Unauthorized

---

## 🔍 Step 6: Verify Database Changes

Open PostgreSQL and check:

```sql
SELECT user_id, profile_picture_url, updated_at 
FROM alumni_profiles 
WHERE user_id = 'YOUR_USER_ID';
```

**Expected:**
- `profile_picture_url` should contain `/uploads/profile_pics/filename.jpg`
- `updated_at` should reflect the upload time

---

## 🖥️ Step 7: Test Image Serving

### Direct URL Access

Open browser and navigate to:
```
http://localhost:5000/uploads/profile_pics/YOUR_FILENAME.jpg
```

**Expected:** Image displays correctly

### In Application

The ProfilePictureUpload component automatically constructs the correct URL:
```
http://localhost:5000/uploads/profile_pics/filename.jpg
```

---

## 🛠️ Debugging Tips

### Check Backend Logs

Watch terminal where backend is running. You should see:
```
POST /api/alumni/profile/upload-picture 200
Deleted old profile picture: old-filename.jpg
```

### Check Upload Folder

```powershell
ls "d:\Web Development\WebD Projects\Projects\Alumni Portal\backend\uploads\profile_pics"
```

Should list your uploaded images.

### Common Issues

**Issue: 404 when accessing image**
```powershell
# Verify static file serving is working
curl http://localhost:5000/uploads/
```

**Issue: File not uploading**
- Check browser console for errors
- Verify token is being sent in request headers
- Check file size and type

**Issue: CORS error**
- Verify frontend is running on `http://localhost:3000`
- Check backend CORS configuration allows `localhost:3000`

---

## 🧪 API Testing with Postman/Thunder Client

### Upload Picture

```http
POST http://localhost:5000/api/alumni/profile/upload-picture
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: multipart/form-data

Body (form-data):
profilePicture: [select file]
```

### Delete Picture

```http
DELETE http://localhost:5000/api/alumni/profile/delete-picture
Authorization: Bearer YOUR_JWT_TOKEN
```

### Get Profile (verify picture URL)

```http
GET http://localhost:5000/api/alumni/profile
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## ✅ Local Testing Checklist

- [ ] Backend server running on port 5000
- [ ] Frontend server running on port 3000
- [ ] `uploads/profile_pics` folder exists
- [ ] Logged in with test account
- [ ] ProfilePictureUpload component integrated
- [ ] Successfully uploaded an image
- [ ] Image visible in browser
- [ ] File exists in `backend/uploads/profile_pics/`
- [ ] Database updated with correct URL
- [ ] Successfully replaced image (old file deleted)
- [ ] Successfully deleted image
- [ ] Tested file size validation (>2MB rejected)
- [ ] Tested file type validation (non-images rejected)
- [ ] Image accessible via direct URL
- [ ] Image persists after page refresh

---

## 🎯 Next: Deploy to Server

Once all local tests pass, follow the **PROFILE_PICTURE_DEPLOYMENT_GUIDE.md** for production deployment.

---

## 🆘 Need Help?

**Check logs:**
```powershell
# Backend logs (in terminal)
# Frontend logs (browser console - F12)
```

**Verify environment:**
```powershell
# Backend .env.local should have:
PORT=5000
NODE_ENV=development

# Frontend .env should have:
VITE_API_URL=http://localhost:5000/api
```

**Reset and try again:**
```powershell
# Clear uploads folder
rm "d:\Web Development\WebD Projects\Projects\Alumni Portal\backend\uploads\profile_pics\*"

# Restart backend
# Ctrl+C then npm run dev:local
```

---

**Status**: Ready for Local Testing ✅

You can now test the complete profile picture upload system on your local machine before deploying to production!

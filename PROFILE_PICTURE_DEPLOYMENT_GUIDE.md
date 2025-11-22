# Profile Picture Upload System - Deployment Guide

## 📋 Overview

This guide covers the complete setup for profile picture upload, storage, and retrieval on your IIIT Naya Raipur Alumni Portal server.

---

## ✅ What's Been Implemented

### Backend (`/backend`)
- ✅ Multer middleware for file uploads (`src/models/middleware/upload.js`)
- ✅ Upload endpoint: `POST /api/alumni/profile/upload-picture`
- ✅ Delete endpoint: `DELETE /api/alumni/profile/delete-picture`
- ✅ Static file serving configured in `server.js`
- ✅ File validation (JPEG, PNG, WebP only, max 2MB)
- ✅ Automatic cleanup of old profile pictures
- ✅ Secure filename generation (user-id + timestamp + random)

### Frontend (`/frontend`)
- ✅ ProfilePictureUpload component (`src/components/profile/ProfilePictureUpload.jsx`)
- ✅ Preview functionality
- ✅ Upload/Delete capabilities
- ✅ Client-side validation
- ✅ Responsive design matching IIIT NR color scheme

### Database
- ✅ `profile_picture_url` column already exists in `alumni_profiles` table

---

## 🚀 Server Deployment Steps

### 1. Create Upload Directory

SSH into your server and create the required folder structure:

\`\`\`bash
cd /home/alumni/Alumni-Portal-IIITNR/backend
mkdir -p uploads/profile_pics
\`\`\`

Set appropriate permissions:

\`\`\`bash
chmod -R 755 uploads
chown -R alumni:alumni uploads
\`\`\`

> **Important**: Replace `alumni:alumni` with your actual user:group if different.

---

### 2. Configure Nginx

Edit your Nginx configuration:

\`\`\`bash
sudo nano /etc/nginx/sites-available/alumni
\`\`\`

Add this location block inside your server configuration:

\`\`\`nginx
server {
    listen 80;
    server_name alumni.iiitnr.ac.in;

    # ... existing configuration ...

    # Serve uploaded profile pictures
    location /api/uploads/ {
        alias /home/alumni/Alumni-Portal-IIITNR/backend/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
        
        # Security headers
        add_header X-Content-Type-Options "nosniff";
        
        # Only allow image files
        location ~ \.(jpg|jpeg|png|webp)$ {
            try_files $uri =404;
        }
    }

    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # Increase client body size for file uploads
        client_max_body_size 5M;
    }

    # ... rest of configuration ...
}
\`\`\`

Test and reload Nginx:

\`\`\`bash
sudo nginx -t
sudo systemctl reload nginx
\`\`\`

---

### 3. Restart Backend Server

If using PM2:

\`\`\`bash
cd /home/alumni/Alumni-Portal-IIITNR/backend
pm2 restart alumni-portal-backend
pm2 save
\`\`\`

If using systemd:

\`\`\`bash
sudo systemctl restart alumni-backend
\`\`\`

---

## 💻 Frontend Integration

### Usage in Profile Page

Import and use the component in your profile edit page:

\`\`\`jsx
import ProfilePictureUpload from '../components/profile/ProfilePictureUpload';

const ProfilePage = () => {
  const [profileData, setProfileData] = useState({});

  const handlePictureUploadSuccess = (newPictureUrl) => {
    // Update local state with new picture URL
    setProfileData(prev => ({
      ...prev,
      profile_picture_url: newPictureUrl
    }));
  };

  return (
    <div>
      <h2>Edit Profile</h2>
      
      <ProfilePictureUpload
        currentPictureUrl={profileData.profile_picture_url}
        onUploadSuccess={handlePictureUploadSuccess}
      />
      
      {/* Other profile fields */}
    </div>
  );
};
\`\`\`

### Displaying Profile Pictures

To display profile pictures anywhere in your app:

\`\`\`jsx
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const AlumniCard = ({ alumni }) => {
  const getImageUrl = (url) => {
    if (!url) return '/default-avatar.png';
    if (url.startsWith('http')) return url;
    return \`\${API_BASE_URL}\${url}\`;
  };

  return (
    <div>
      <img
        src={getImageUrl(alumni.profile_picture_url)}
        alt={\`\${alumni.first_name} \${alumni.last_name}\`}
        className="profile-avatar"
      />
    </div>
  );
};
\`\`\`

---

## 🔒 Security Features

### File Validation
- ✅ Only JPEG, JPG, PNG, and WebP allowed
- ✅ Max file size: 2MB
- ✅ MIME type checking
- ✅ File extension validation

### Storage Security
- ✅ Unique filenames prevent overwriting
- ✅ Files stored outside public directories
- ✅ Old pictures automatically deleted on new upload
- ✅ Authentication required for upload/delete
- ✅ User can only modify their own picture

### Server Security
- ✅ Read-only serving through Nginx
- ✅ No directory listing
- ✅ Content-Type validation
- ✅ File size limits enforced

---

## 📝 Environment Variables

Ensure these are set in your `.env` files:

**Backend** (`.env` or `.env.production`):
\`\`\`env
NODE_ENV=production
PORT=5001
CORS_ORIGINS=https://alumni.iiitnr.ac.in
\`\`\`

**Frontend** (`.env.production`):
\`\`\`env
VITE_API_BASE_URL=https://alumni.iiitnr.ac.in
\`\`\`

---

## 🧪 Testing the Implementation

### 1. Test Upload Endpoint

\`\`\`bash
curl -X POST https://alumni.iiitnr.ac.in/api/alumni/profile/upload-picture \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -F "profilePicture=@/path/to/test-image.jpg"
\`\`\`

Expected response:
\`\`\`json
{
  "success": true,
  "message": "Profile picture uploaded successfully",
  "data": {
    "profilePictureUrl": "/uploads/profile_pics/user-id-timestamp-random.jpg",
    "filename": "user-id-timestamp-random.jpg"
  }
}
\`\`\`

### 2. Test Image Serving

\`\`\`bash
curl -I https://alumni.iiitnr.ac.in/api/uploads/profile_pics/filename.jpg
\`\`\`

Should return `200 OK` with proper headers.

### 3. Test Delete Endpoint

\`\`\`bash
curl -X DELETE https://alumni.iiitnr.ac.in/api/alumni/profile/delete-picture \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
\`\`\`

---

## 🗂️ File Structure

\`\`\`
backend/
├── uploads/
│   └── profile_pics/         # User uploaded images stored here
│       ├── user1-123456-789.jpg
│       └── user2-123457-890.png
├── src/
│   ├── models/
│   │   └── middleware/
│   │       └── upload.js     # Multer configuration
│   └── routes/
│       └── alumni.js         # Upload/Delete endpoints
frontend/
├── src/
│   └── components/
│       └── profile/
│           ├── ProfilePictureUpload.jsx    # Upload component
│           └── ProfilePictureUpload.module.css
\`\`\`

---

## 🔧 Troubleshooting

### Issue: 404 Not Found when accessing images

**Solution**: Check Nginx configuration and ensure the alias path is correct:
\`\`\`bash
# Verify the path exists
ls -la /home/alumni/Alumni-Portal-IIITNR/backend/uploads/profile_pics/

# Check Nginx error log
sudo tail -f /var/log/nginx/error.log
\`\`\`

### Issue: Permission Denied

**Solution**: Fix ownership and permissions:
\`\`\`bash
sudo chown -R alumni:alumni /home/alumni/Alumni-Portal-IIITNR/backend/uploads
sudo chmod -R 755 /home/alumni/Alumni-Portal-IIITNR/backend/uploads
\`\`\`

### Issue: File size too large error

**Solution**: Increase Nginx client body size limit:
\`\`\`nginx
client_max_body_size 5M;  # Inside location /api/ block
\`\`\`

### Issue: CORS errors in browser

**Solution**: Ensure CORS is properly configured in backend:
\`\`\`javascript
// In server.js, verify corsOptions includes your domain
const corsOptions = {
  origin: ['https://alumni.iiitnr.ac.in'],
  credentials: true
};
\`\`\`

---

## 🎯 Next Steps (Optional Enhancements)

### 1. Image Optimization

Install Sharp for automatic image resizing:

\`\`\`bash
cd backend
npm install sharp
\`\`\`

Modify upload middleware to create thumbnails:
\`\`\`javascript
import sharp from 'sharp';

// After file upload, create thumbnail
await sharp(req.file.path)
  .resize(200, 200, { fit: 'cover' })
  .toFile(thumbnailPath);
\`\`\`

### 2. Cloud Storage Migration

To move to AWS S3 or Azure Blob Storage later:
- Install SDK (\`aws-sdk\` or \`@azure/storage-blob\`)
- Update upload middleware to use cloud storage
- Update image serving URLs
- Keep database URLs abstract (no hardcoded paths)

### 3. CDN Integration

For better performance:
- Set up CloudFlare or Cloudinary
- Configure CDN to cache images
- Update frontend to use CDN URLs

---

## 📞 Support

If you encounter issues:
1. Check server logs: \`pm2 logs alumni-portal-backend\`
2. Check Nginx logs: \`sudo tail -f /var/log/nginx/error.log\`
3. Verify file permissions and ownership
4. Test endpoints with curl/Postman before browser

---

## ✅ Deployment Checklist

- [ ] Created \`uploads/profile_pics\` directory on server
- [ ] Set correct permissions (755) and ownership
- [ ] Updated Nginx configuration with \`/api/uploads/\` location
- [ ] Tested Nginx configuration (\`nginx -t\`)
- [ ] Reloaded Nginx
- [ ] Restarted backend server
- [ ] Tested upload endpoint with curl/Postman
- [ ] Verified images are accessible via browser
- [ ] Integrated ProfilePictureUpload component in frontend
- [ ] Updated \`.env.production\` with correct API URL
- [ ] Rebuilt and deployed frontend
- [ ] Tested end-to-end upload flow in production

---

**System Status**: ✅ Production Ready

The profile picture upload system is now fully implemented and ready for deployment on your IIIT Naya Raipur server.

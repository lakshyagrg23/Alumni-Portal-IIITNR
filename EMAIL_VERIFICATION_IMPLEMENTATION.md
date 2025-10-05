# Email Verification Implementation Guide

## 🎯 Overview

This guide explains how to implement email verification for local (email/password) registration in the Alumni Portal. Users will receive a verification email and must click the link before their profile is created and they can access the portal.

---

## 📋 What We're Building

### Current Flow (Without Verification):
```
Register → Create user → Create profile → Auto-login → Access granted
```

### New Flow (With Verification):
```
Register → Create user (unverified) → Send verification email
   ↓
User checks email → Click verification link → Verify email → Create profile → Redirect to login
   ↓
Login → Access granted
```

---

## 🔧 Required Components

### 1. **Email Service** (Nodemailer)
- Send verification emails
- Send password reset emails (future)

### 2. **Token Generation**
- Crypto library for secure random tokens
- Token storage in database

### 3. **Database Changes**
- Use existing `email_verification_token` column
- Add `token_expires_at` column for security

### 4. **Backend Routes**
- Verification endpoint
- Resend verification endpoint

### 5. **Frontend Pages**
- Verification success/error page
- Email sent confirmation page

---

## 📦 Step 1: Install Dependencies

### Backend Dependencies:

```bash
cd backend
npm install nodemailer
```

**What is Nodemailer?**
- Most popular Node.js email sending library
- Supports Gmail, SendGrid, Mailgun, custom SMTP
- Free for Gmail (with app-specific password)

---

## 🗄️ Step 2: Database Schema Updates

### Update the `users` table:

```sql
-- Add token expiration column
ALTER TABLE users 
ADD COLUMN email_verification_token_expires TIMESTAMP;

-- Update schema to ensure proper defaults
ALTER TABLE users 
ALTER COLUMN email_verified SET DEFAULT FALSE;

ALTER TABLE users 
ALTER COLUMN is_approved SET DEFAULT FALSE;
```

**Why these changes?**
- `email_verification_token_expires`: Tokens expire after 24 hours for security
- `email_verified`: Start as FALSE, becomes TRUE after verification
- `is_approved`: Only approve after email verification

---

## ⚙️ Step 3: Environment Variables

Add to `backend/.env`:

```env
# Email Configuration
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password
EMAIL_FROM=IIIT Naya Raipur Alumni Portal <your-email@gmail.com>

# Frontend URL for verification links
FRONTEND_URL=http://localhost:3000

# Token expiration (in hours)
EMAIL_VERIFICATION_TOKEN_EXPIRY=24
```

### 🔑 How to Get Gmail App Password:

1. **Enable 2-Factor Authentication** on your Google account
2. Go to: https://myaccount.google.com/apppasswords
3. Select "Mail" and "Other (Custom name)"
4. Name it: "Alumni Portal"
5. Copy the 16-character password
6. Use this in `EMAIL_PASSWORD` (no spaces)

**Alternative Email Services:**
- **SendGrid**: 100 free emails/day (better for production)
- **Mailgun**: 5000 free emails/month
- **AWS SES**: Very cheap, scalable

---

## 📧 Step 4: Create Email Service

Create `backend/src/services/emailService.js`:

```javascript
const nodemailer = require('nodemailer');

/**
 * Email Service for sending verification and notification emails
 */
class EmailService {
  constructor() {
    // Create transporter based on environment
    if (process.env.NODE_ENV === 'production') {
      // Production: Use SendGrid/Mailgun/AWS SES
      this.transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      });
    } else {
      // Development: Use Gmail or Ethereal (fake SMTP)
      this.transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      });
    }
  }

  /**
   * Send email verification link
   * @param {string} email - Recipient email
   * @param {string} verificationToken - Unique verification token
   * @param {string} firstName - User's first name
   */
  async sendVerificationEmail(email, verificationToken, firstName = 'there') {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'IIIT Naya Raipur Alumni Portal',
      to: email,
      subject: 'Verify Your Email - IIIT Naya Raipur Alumni Portal',
      html: this.getVerificationEmailTemplate(firstName, verificationUrl),
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Verification email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending verification email:', error);
      throw new Error('Failed to send verification email');
    }
  }

  /**
   * HTML template for verification email
   */
  getVerificationEmailTemplate(firstName, verificationUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
            color: white;
            padding: 30px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
          }
          .content {
            padding: 40px 30px;
            color: #333;
            line-height: 1.6;
          }
          .button {
            display: inline-block;
            padding: 14px 40px;
            background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
            color: white !important;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
            font-weight: 600;
            transition: transform 0.2s;
          }
          .button:hover {
            transform: translateY(-2px);
          }
          .footer {
            background: #f8f9fa;
            padding: 20px 30px;
            text-align: center;
            color: #666;
            font-size: 14px;
          }
          .warning {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 12px;
            margin: 20px 0;
            border-radius: 4px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎓 IIIT Naya Raipur Alumni Portal</h1>
          </div>
          <div class="content">
            <h2>Welcome, ${firstName}! 👋</h2>
            <p>Thank you for registering with the IIIT Naya Raipur Alumni Portal. We're excited to have you join our community!</p>
            
            <p>To complete your registration and activate your account, please verify your email address by clicking the button below:</p>
            
            <center>
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </center>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="background: #f8f9fa; padding: 12px; border-radius: 4px; word-break: break-all; font-size: 13px;">
              ${verificationUrl}
            </p>
            
            <div class="warning">
              <strong>⏰ Important:</strong> This verification link will expire in 24 hours.
            </div>
            
            <p>If you didn't create an account with us, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} IIIT Naya Raipur Alumni Portal</p>
            <p>This is an automated email. Please do not reply to this message.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Send welcome email after verification
   */
  async sendWelcomeEmail(email, firstName) {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Welcome to IIIT Naya Raipur Alumni Portal! 🎉',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; }
            .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; color: #333; line-height: 1.6; }
            .button { display: inline-block; padding: 12px 30px; background: #f97316; color: white; text-decoration: none; border-radius: 6px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome to the Family!</h1>
            </div>
            <div class="content">
              <h2>Hello ${firstName}!</h2>
              <p>Your email has been verified successfully. Welcome to the IIIT Naya Raipur Alumni Portal!</p>
              
              <p><strong>Next Steps:</strong></p>
              <ul>
                <li>Complete your profile with academic and professional details</li>
                <li>Connect with fellow alumni</li>
                <li>Explore events and opportunities</li>
                <li>Share your achievements</li>
              </ul>
              
              <center>
                <a href="${process.env.FRONTEND_URL}/login" class="button">Login to Your Account</a>
              </center>
              
              <p>We're thrilled to have you in our community!</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log('Welcome email sent to:', email);
    } catch (error) {
      console.error('Error sending welcome email:', error);
      // Don't throw - welcome email is not critical
    }
  }
}

module.exports = new EmailService();
```

---

## 🔐 Step 5: Create Token Utility

Create `backend/src/utils/tokenUtils.js`:

```javascript
const crypto = require('crypto');

/**
 * Generate secure random token
 * @param {number} length - Token length in bytes (default 32)
 * @returns {string} - Hexadecimal token
 */
const generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Generate token expiration date
 * @param {number} hours - Hours until expiration (default 24)
 * @returns {Date} - Expiration date
 */
const generateTokenExpiry = (hours = 24) => {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
};

/**
 * Check if token has expired
 * @param {Date} expiryDate - Token expiration date
 * @returns {boolean} - True if expired
 */
const isTokenExpired = (expiryDate) => {
  return new Date() > new Date(expiryDate);
};

module.exports = {
  generateToken,
  generateTokenExpiry,
  isTokenExpired,
};
```

---

## 🔄 Step 6: Update User Model

Update `backend/src/models/User.js`:

Add these methods to the User class:

```javascript
/**
 * Generate and save email verification token
 * @param {string} userId - User ID
 * @returns {Promise<string>} - Verification token
 */
static async generateVerificationToken(userId) {
  const { generateToken, generateTokenExpiry } = require('../utils/tokenUtils');
  
  const token = generateToken(32);
  const expires = generateTokenExpiry(24); // 24 hours
  
  await this.update(userId, {
    email_verification_token: token,
    email_verification_token_expires: expires,
  });
  
  return token;
}

/**
 * Verify email with token
 * @param {string} token - Verification token
 * @returns {Promise<Object|null>} - User if verified, null if invalid
 */
static async verifyEmail(token) {
  const { isTokenExpired } = require('../utils/tokenUtils');
  
  // Find user with this token
  const result = await query(
    'SELECT * FROM users WHERE email_verification_token = $1',
    [token]
  );
  
  if (result.rows.length === 0) {
    return { success: false, message: 'Invalid verification token' };
  }
  
  const user = result.rows[0];
  
  // Check if token expired
  if (isTokenExpired(user.email_verification_token_expires)) {
    return { success: false, message: 'Verification token has expired' };
  }
  
  // Check if already verified
  if (user.email_verified) {
    return { success: false, message: 'Email already verified', alreadyVerified: true };
  }
  
  // Mark as verified and approved
  await query(
    `UPDATE users 
     SET email_verified = TRUE, 
         is_approved = TRUE,
         email_verification_token = NULL,
         email_verification_token_expires = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [user.id]
  );
  
  return { success: true, user };
}
```

---

## 🛣️ Step 7: Update Registration Route

Update `backend/src/routes/auth.js`:

```javascript
const emailService = require('../services/emailService');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user with email verification
 * @access  Public
 */
router.post("/register", async (req, res) => {
  try {
    const { email, password, firstName, lastName, provider } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      // If user exists but email not verified, allow resending
      if (!existingUser.email_verified) {
        return res.status(400).json({
          success: false,
          message: "An account with this email already exists but is not verified. Please check your email for the verification link or request a new one.",
          canResendVerification: true,
          email: email,
        });
      }
      
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    // Determine provider (should be 'local' for email/password registration)
    const providerName = provider === "google" ? "google" : "local";

    // Create new user WITHOUT auto-approval
    const userData = {
      email: email.toLowerCase(),
      password,
      role: "alumni",
      provider: providerName,
      is_approved: false,      // ❌ Not approved until verified
      is_active: true,
      email_verified: false,   // ❌ Not verified yet
    };

    const user = await User.create(userData);

    // Generate verification token
    const verificationToken = await User.generateVerificationToken(user.id);

    // Send verification email
    try {
      await emailService.sendVerificationEmail(
        email,
        verificationToken,
        firstName
      );
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
      // Delete the created user if email fails
      await User.delete(user.id);
      
      return res.status(500).json({
        success: false,
        message: "Failed to send verification email. Please try again.",
      });
    }

    // DO NOT create alumni profile yet - wait for verification
    // DO NOT auto-login - require verification first

    res.status(201).json({
      success: true,
      message: "Registration successful! Please check your email to verify your account.",
      requiresVerification: true,
      email: email,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during registration",
    });
  }
});
```

---

## ✅ Step 8: Create Verification Routes

Add to `backend/src/routes/auth.js`:

```javascript
/**
 * @route   GET /api/auth/verify-email
 * @desc    Verify email with token
 * @access  Public
 */
router.get("/verify-email", async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Verification token is required",
      });
    }

    // Verify the email
    const result = await User.verifyEmail(token);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
        alreadyVerified: result.alreadyVerified || false,
      });
    }

    // Email verified successfully - now create alumni profile
    const AlumniProfile = require("../models/AlumniProfile");
    
    // Get user data to extract name
    const user = await User.findById(result.user.id);
    
    // Check if profile already exists
    const existingProfile = await AlumniProfile.findByUserId(user.id);
    
    if (!existingProfile) {
      // Create basic alumni profile
      const profileData = {
        userId: user.id,
        firstName: "", // Will be updated by user
        lastName: "",
        isProfilePublic: true,
      };
      
      await AlumniProfile.create(profileData);
    }

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(user.email, user.email.split('@')[0]);
    } catch (error) {
      console.error('Error sending welcome email:', error);
      // Don't fail verification if welcome email fails
    }

    res.json({
      success: true,
      message: "Email verified successfully! You can now login to your account.",
      verified: true,
    });
  } catch (error) {
    console.error("Email verification error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during email verification",
    });
  }
});

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend verification email
 * @access  Public
 */
router.post("/resend-verification", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Find user
    const user = await User.findByEmail(email);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email",
      });
    }

    // Check if already verified
    if (user.email_verified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified. You can login now.",
      });
    }

    // Generate new token
    const verificationToken = await User.generateVerificationToken(user.id);

    // Send verification email
    await emailService.sendVerificationEmail(
      email,
      verificationToken,
      email.split('@')[0] // Use email prefix as name
    );

    res.json({
      success: true,
      message: "Verification email sent! Please check your inbox.",
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to resend verification email",
    });
  }
});
```

---

## 🚫 Step 9: Update Login Route

Update login to check verification status:

```javascript
/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check if email is verified (only for local provider)
    if (user.provider === 'local' && !user.email_verified) {
      return res.status(401).json({
        success: false,
        message: "Please verify your email before logging in. Check your inbox for the verification link.",
        requiresVerification: true,
        email: user.email,
      });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: "Account is deactivated",
      });
    }

    // Verify password
    const isValidPassword = await User.verifyPassword(
      password,
      user.password_hash
    );
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isApproved: user.is_approved,
        isActive: user.is_active,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
});
```

---

## 🎨 Step 10: Frontend - Add Service Methods

Update `frontend/src/services/authService.js`:

```javascript
// Add these methods to authService

// Verify email with token
verifyEmail: async (token) => {
  const response = await API.get(`/auth/verify-email?token=${token}`);
  return response;
},

// Resend verification email
resendVerification: async (email) => {
  const response = await API.post('/auth/resend-verification', { email });
  return response;
},
```

---

## 📄 Step 11: Frontend - Create Verification Page

Create `frontend/src/pages/auth/VerifyEmail.jsx`:

```jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../../services/authService';
import styles from './VerifyEmail.module.css';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setStatus('error');
        setMessage('Invalid verification link. Please check your email or request a new verification link.');
        return;
      }

      try {
        const response = await authService.verifyEmail(token);
        
        if (response.success) {
          setStatus('success');
          setMessage(response.message);
          
          // Redirect to login after 3 seconds
          setTimeout(() => {
            navigate('/login', { 
              state: { message: 'Email verified! Please login to continue.' }
            });
          }, 3000);
        }
      } catch (error) {
        setStatus('error');
        setMessage(error.message || 'Verification failed. The link may have expired.');
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {status === 'verifying' && (
          <>
            <div className={styles.spinner}></div>
            <h2>Verifying your email...</h2>
            <p>Please wait while we verify your account.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className={styles.successIcon}>✓</div>
            <h2>Email Verified Successfully!</h2>
            <p>{message}</p>
            <p className={styles.redirect}>Redirecting to login...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className={styles.errorIcon}>✗</div>
            <h2>Verification Failed</h2>
            <p>{message}</p>
            <button 
              className={styles.button}
              onClick={() => navigate('/login')}
            >
              Go to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
```

Create `frontend/src/pages/auth/VerifyEmail.module.css`:

```css
.container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
  padding: 20px;
}

.card {
  background: white;
  border-radius: 12px;
  padding: 40px;
  max-width: 500px;
  width: 100%;
  text-align: center;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #1e3a8a;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.successIcon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #10b981;
  color: white;
  font-size: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  animation: scaleIn 0.5s ease;
}

.errorIcon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #ef4444;
  color: white;
  font-size: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  animation: scaleIn 0.5s ease;
}

@keyframes scaleIn {
  0% { transform: scale(0); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

.card h2 {
  color: #1e3a8a;
  margin-bottom: 15px;
  font-size: 24px;
}

.card p {
  color: #666;
  line-height: 1.6;
  margin-bottom: 10px;
}

.redirect {
  color: #10b981;
  font-weight: 600;
  margin-top: 20px;
}

.button {
  background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
  color: white;
  border: none;
  padding: 12px 30px;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 20px;
  transition: transform 0.2s;
}

.button:hover {
  transform: translateY(-2px);
}
```

---

## 📄 Step 12: Frontend - Create Email Sent Page

Create `frontend/src/pages/auth/EmailSent.jsx`:

```jsx
import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { authService } from '../../services/authService';
import styles from './EmailSent.module.css';

const EmailSent = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState('');

  // Redirect if no email in state
  if (!email) {
    navigate('/register');
    return null;
  }

  const handleResend = async () => {
    setResending(true);
    setMessage('');

    try {
      const response = await authService.resendVerification(email);
      setMessage({ type: 'success', text: response.message });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.emailIcon}>📧</div>
        <h1>Check Your Email</h1>
        <p className={styles.mainText}>
          We've sent a verification link to:
        </p>
        <p className={styles.email}>{email}</p>
        
        <div className={styles.instructions}>
          <h3>What's next?</h3>
          <ol>
            <li>Open your email inbox</li>
            <li>Find the email from IIIT Naya Raipur Alumni Portal</li>
            <li>Click the verification link</li>
            <li>Login to your account</li>
          </ol>
        </div>

        <div className={styles.note}>
          <strong>Note:</strong> The verification link expires in 24 hours.
        </div>

        {message && (
          <div className={`${styles.message} ${styles[message.type]}`}>
            {message.text}
          </div>
        )}

        <div className={styles.actions}>
          <button 
            onClick={handleResend} 
            disabled={resending}
            className={styles.resendButton}
          >
            {resending ? 'Sending...' : 'Resend Verification Email'}
          </button>
          
          <Link to="/login" className={styles.loginLink}>
            Already verified? Login
          </Link>
        </div>

        <p className={styles.spam}>
          Can't find the email? Check your spam or junk folder.
        </p>
      </div>
    </div>
  );
};

export default EmailSent;
```

Create `frontend/src/pages/auth/EmailSent.module.css`:

```css
.container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
  padding: 20px;
}

.card {
  background: white;
  border-radius: 12px;
  padding: 40px;
  max-width: 600px;
  width: 100%;
  text-align: center;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.emailIcon {
  font-size: 64px;
  margin-bottom: 20px;
}

.card h1 {
  color: #1e3a8a;
  margin-bottom: 15px;
  font-size: 28px;
}

.mainText {
  color: #666;
  margin-bottom: 10px;
  font-size: 16px;
}

.email {
  color: #1e3a8a;
  font-weight: 600;
  font-size: 18px;
  margin-bottom: 30px;
}

.instructions {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin: 30px 0;
  text-align: left;
}

.instructions h3 {
  color: #1e3a8a;
  margin-bottom: 15px;
  text-align: center;
}

.instructions ol {
  padding-left: 20px;
}

.instructions li {
  color: #333;
  margin-bottom: 10px;
  line-height: 1.6;
}

.note {
  background: #fff3cd;
  border-left: 4px solid #ffc107;
  padding: 12px;
  margin: 20px 0;
  border-radius: 4px;
  text-align: left;
}

.message {
  padding: 12px;
  border-radius: 6px;
  margin: 20px 0;
}

.message.success {
  background: #d1fae5;
  color: #065f46;
  border: 1px solid #10b981;
}

.message.error {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #ef4444;
}

.actions {
  margin-top: 30px;
}

.resendButton {
  background: white;
  border: 2px solid #1e3a8a;
  color: #1e3a8a;
  padding: 12px 30px;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 15px;
  width: 100%;
}

.resendButton:hover:not(:disabled) {
  background: #1e3a8a;
  color: white;
  transform: translateY(-2px);
}

.resendButton:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loginLink {
  display: block;
  color: #1e3a8a;
  text-decoration: none;
  font-weight: 600;
  margin-top: 15px;
  transition: color 0.2s;
}

.loginLink:hover {
  color: #3b82f6;
  text-decoration: underline;
}

.spam {
  margin-top: 30px;
  color: #999;
  font-size: 14px;
  font-style: italic;
}
```

---

## 🔄 Step 13: Update Registration Page

Update `frontend/src/pages/auth/Register.jsx`:

```jsx
// Add this to your registration success handler

const handleRegister = async (e) => {
  e.preventDefault();
  
  try {
    const response = await register({
      email,
      password,
      firstName,
      lastName,
    });

    // Check if verification is required
    if (response.requiresVerification) {
      // Redirect to email sent page
      navigate('/email-sent', { 
        state: { email: response.email }
      });
    } else {
      // OAuth or other registration - redirect to dashboard
      navigate('/dashboard');
    }
  } catch (error) {
    // Handle error - check if can resend verification
    if (error.response?.data?.canResendVerification) {
      navigate('/email-sent', { 
        state: { email: error.response.data.email }
      });
    } else {
      setError(error.message);
    }
  }
};
```

---

## 🔄 Step 14: Update Login Page

Update `frontend/src/pages/auth/Login.jsx`:

```jsx
// Add this to your login error handler

const handleLogin = async (e) => {
  e.preventDefault();
  
  try {
    await login({ email, password });
    navigate('/dashboard');
  } catch (error) {
    // Check if user needs to verify email
    if (error.response?.data?.requiresVerification) {
      setError(
        <div>
          {error.response.data.message}
          <button 
            onClick={() => navigate('/email-sent', { 
              state: { email: error.response.data.email }
            })}
            className={styles.linkButton}
          >
            Resend verification email
          </button>
        </div>
      );
    } else {
      setError(error.message);
    }
  }
};
```

---

## 🛣️ Step 15: Add Routes

Update `frontend/src/App.jsx`:

```jsx
import VerifyEmail from './pages/auth/VerifyEmail';
import EmailSent from './pages/auth/EmailSent';

// Add these routes
<Route path="/verify-email" element={<VerifyEmail />} />
<Route path="/email-sent" element={<EmailSent />} />
```

---

## ✅ Step 16: Testing Checklist

### 1. **Test Registration**
- [ ] Register with valid email and password
- [ ] Verify email is sent
- [ ] Check user is created in database (email_verified = FALSE)
- [ ] Verify alumni_profile is NOT created yet

### 2. **Test Email Verification**
- [ ] Click verification link in email
- [ ] Verify redirect to success page
- [ ] Check user.email_verified = TRUE in database
- [ ] Check alumni_profile is created
- [ ] Try logging in

### 3. **Test Login Before Verification**
- [ ] Try logging in without verifying
- [ ] Verify error message shows
- [ ] Verify link to resend email works

### 4. **Test Token Expiration**
- [ ] Wait 24 hours (or temporarily reduce expiry in code)
- [ ] Try using expired link
- [ ] Verify appropriate error message

### 5. **Test Resend Verification**
- [ ] Request new verification email
- [ ] Verify new token is generated
- [ ] Old link should still work (or invalidate old tokens)

### 6. **Test Edge Cases**
- [ ] Register with same email twice
- [ ] Verify already verified email
- [ ] Invalid verification token
- [ ] Missing verification token

---

## 🔒 Security Best Practices

### ✅ Implemented:
1. **Secure Random Tokens**: Using crypto.randomBytes (not predictable)
2. **Token Expiration**: 24-hour limit
3. **One-time Use**: Token cleared after verification
4. **No Sensitive Data in URL**: Only token, no user info
5. **Email Validation**: Regex check before sending
6. **Rate Limiting**: (Consider adding - see below)

### 🚀 Additional Security (Optional):

#### Rate Limiting for Resend:
```javascript
// Add to backend
const rateLimit = require('express-rate-limit');

const resendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 requests per 15 minutes
  message: 'Too many verification requests. Please try again later.',
});

router.post('/resend-verification', resendLimiter, async (req, res) => {
  // ... existing code
});
```

#### Invalidate Old Tokens:
```javascript
// When generating new token, mark old as used
static async generateVerificationToken(userId) {
  const token = generateToken(32);
  const expires = generateTokenExpiry(24);
  
  // Clear old token
  await query(
    'UPDATE users SET email_verification_token = NULL WHERE id = $1',
    [userId]
  );
  
  // Set new token
  await this.update(userId, {
    email_verification_token: token,
    email_verification_token_expires: expires,
  });
  
  return token;
}
```

---

## 🐛 Troubleshooting

### Email Not Sending?

**Gmail Issues:**
1. Check 2FA is enabled
2. Use App Password, not regular password
3. Enable "Less secure app access" (not recommended)

**Better Alternative - Use Ethereal for Testing:**
```javascript
// In emailService.js for development
if (process.env.NODE_ENV !== 'production') {
  // Create Ethereal test account
  const testAccount = await nodemailer.createTestAccount();
  
  this.transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
  
  // Log preview URL
  console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
}
```

### Database Errors?

Run migration:
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token_expires TIMESTAMP;
```

### Token Expired Immediately?

Check server timezone:
```javascript
console.log('Server time:', new Date());
console.log('Token expires:', expires);
```

---

## 📊 Database Queries for Testing

```sql
-- Check user verification status
SELECT id, email, email_verified, is_approved, 
       email_verification_token, email_verification_token_expires
FROM users 
WHERE email = 'test@example.com';

-- Manually verify a user (for testing)
UPDATE users 
SET email_verified = TRUE, 
    is_approved = TRUE,
    email_verification_token = NULL
WHERE email = 'test@example.com';

-- Check if profile was created
SELECT * FROM alumni_profiles 
WHERE user_id = (SELECT id FROM users WHERE email = 'test@example.com');

-- See all unverified users
SELECT email, created_at 
FROM users 
WHERE email_verified = FALSE 
ORDER BY created_at DESC;
```

---

## 🎯 Summary

### What Changes:
1. **Registration**: User receives email instead of auto-login
2. **Database**: User created but not approved/verified
3. **Profile**: Alumni profile created AFTER verification
4. **Login**: Blocked until email verified

### User Flow:
```
Register → Email sent → Check email → Click link → Email verified → 
Profile created → Login → Access granted
```

### Time to Implement: ~2-3 hours

### Files Created:
- `backend/src/services/emailService.js`
- `backend/src/utils/tokenUtils.js`
- `frontend/src/pages/auth/VerifyEmail.jsx`
- `frontend/src/pages/auth/EmailSent.jsx`
- CSS modules for both pages

### Files Modified:
- `backend/src/routes/auth.js`
- `backend/src/models/User.js`
- `frontend/src/services/authService.js`
- `frontend/src/pages/auth/Register.jsx`
- `frontend/src/pages/auth/Login.jsx`
- `frontend/src/App.jsx`
- `backend/.env`

---

## 🚀 Next Steps After Implementation

1. **Test thoroughly** with different email providers
2. **Set up production email service** (SendGrid/Mailgun)
3. **Add password reset** (similar flow)
4. **Monitor verification rates**
5. **Add analytics** to track email open rates
6. **Consider SMS verification** as backup

---

Need help with any specific step? Let me know! 🎉

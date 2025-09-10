const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { requireAuth } = require("../middleware/auth");

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
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

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    // Determine provider
    let providerName = 'local';
    if (provider === 'google') {
      providerName = 'google';
    } else if (provider === 'linkedin') {
      providerName = 'linkedin';
    }

    // Create new user with name fields
    const userData = {
      email: email.toLowerCase(),
      password,
      first_name: firstName,
      last_name: lastName,
      role: "alumni",
      provider: providerName,
      is_approved: true, // Auto-approve for now
      is_active: true
    };

    const user = await User.create(userData);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        isApproved: user.is_approved,
        isActive: user.is_active,
        provider: user.provider
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during registration",
    });
  }
});

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

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: "Account is deactivated",
      });
    }

    // Verify password
    const isValidPassword = await User.verifyPassword(password, user.password_hash);
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

/**
 * @route   POST /api/auth/google
 * @desc    Google OAuth login
 * @access  Public
 */
router.post("/google", async (req, res) => {
  try {
    const { email, googleId, name } = req.body;
    if (!email || !googleId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Google login failed: missing email or googleId.' 
      });
    }

    let user = await User.findByEmail(email);
    if (!user) {
      // Register new user with Google provider
      const userData = {
        email: email.toLowerCase(),
        provider: 'google',
        providerId: googleId,
        role: 'alumni',
        isApproved: true
      };
      user = await User.create(userData);
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    res.json({
      success: true,
      message: 'Google login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isApproved: user.is_approved,
        isActive: user.is_active,
        provider: user.provider
      },
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again.' 
    });
  }
});

/**
 * @route   POST /api/auth/linkedin
 * @desc    LinkedIn OAuth login
 * @access  Public
 */
router.post("/linkedin", async (req, res) => {
  try {
    const { email, linkedinId, name } = req.body;
    if (!email || !linkedinId) {
      return res.status(400).json({ 
        success: false, 
        message: 'LinkedIn login failed: missing email or linkedinId.' 
      });
    }

    let user = await User.findByEmail(email);
    if (!user) {
      // Register new user with LinkedIn provider
      const userData = {
        email: email.toLowerCase(),
        provider: 'linkedin',
        providerId: linkedinId,
        role: 'alumni',
        isApproved: true
      };
      user = await User.create(userData);
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    res.json({
      success: true,
      message: 'LinkedIn login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isApproved: user.is_approved,
        isActive: user.is_active,
        provider: user.provider
      },
    });
  } catch (error) {
    console.error('LinkedIn login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again.' 
    });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get("/me", requireAuth, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
        isApproved: req.user.is_approved,
        isActive: req.user.is_active,
        provider: req.user.provider,
        createdAt: req.user.created_at,
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile with alumni data
 * @access  Private
 */
router.get("/profile", async (req, res) => {
  try {
    // For now, we'll get the first user in the database as a demo
    // In production, this would come from auth middleware: req.user.id
    const { query } = require("../config/database");
    
    // Get the first user from database for testing
    let userResult = await query(
      "SELECT id FROM users ORDER BY created_at LIMIT 1",
      []
    );
    
    let mockUserId;
    if (userResult.rows.length === 0) {
      // Create a test user if none exists
      const testUser = await User.create({
        email: "test@iiitnr.edu.in",
        first_name: "Test",
        last_name: "User",
        provider: "local",
        is_approved: true,
        is_active: true
      });
      mockUserId = testUser.id;
    } else {
      mockUserId = userResult.rows[0].id;
    }
    
    // Get user basic info (only email, role, approval status)
    const user = await User.findById(mockUserId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get alumni profile which contains most of the profile data
    let alumniProfile = null;
    try {
      const result = await query(
        "SELECT * FROM alumni_profiles WHERE user_id = $1",
        [mockUserId]
      );
      if (result.rows.length > 0) {
        alumniProfile = result.rows[0];
      }
    } catch (error) {
      console.log("No alumni profile found for user:", mockUserId);
    }

    // If no alumni profile exists, return basic user data with empty alumni profile
    if (!alumniProfile) {
      return res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          role: user.role,
          isApproved: user.is_approved,
          isActive: user.is_active,
          provider: user.provider,
          createdAt: user.created_at,
          // Get name from users table as fallback
          firstName: user.first_name || '',
          lastName: user.last_name || '',
          profilePicture: user.profile_picture_url || '',
          alumniProfile: null,
        },
      });
    }

    // Return profile data primarily from alumni_profiles table
    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
        isApproved: user.is_approved,
        isActive: user.is_active,
        provider: user.provider,
        createdAt: user.created_at,
        // Get primary profile data from alumni_profiles table
        firstName: alumniProfile.first_name || user.first_name || '',
        lastName: alumniProfile.last_name || user.last_name || '',
        profilePicture: alumniProfile.profile_picture_url || user.profile_picture_url || '',
        alumniProfile: alumniProfile,
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching profile",
    });
  }
});

/**
 * @route   PUT /api/auth/profile
 * @desc    Update current user profile
 * @access  Private
 */
router.put("/profile", async (req, res) => {
  try {
    // For now, we'll get the first user in the database as a demo
    // In production, this would come from auth middleware: req.user.id
    const { query } = require("../config/database");
    
    // Get the first user from database for testing
    const userResult = await query(
      "SELECT id FROM users ORDER BY created_at LIMIT 1",
      []
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No users found. Please register first.",
      });
    }
    
    const mockUserId = userResult.rows[0].id;
    const updateData = req.body;
    
    // All profile data goes to alumni_profiles table now
    // Only keep email updates in users table
    const userFields = ['email']; // Minimal user table updates
    const userData = {};
    const alumniData = {};
    
    Object.keys(updateData).forEach(key => {
      if (userFields.includes(key)) {
        userData[key] = updateData[key];
      } else {
        // Everything else goes to alumni profile (including firstName, lastName, profilePicture)
        alumniData[key] = updateData[key];
      }
    });
    
    // Update user table only for email changes
    if (Object.keys(userData).length > 0) {
      await User.update(mockUserId, userData);
    }
    
    // Update or create alumni profile with all profile data
    if (Object.keys(alumniData).length > 0) {
      // Handle skills array properly
      if (alumniData.skills && typeof alumniData.skills === 'string') {
        alumniData.skills = alumniData.skills.split(',').map(skill => skill.trim()).filter(skill => skill.length > 0);
      }
      
      // Check if alumni profile exists
      const existingProfile = await query(
        "SELECT id FROM alumni_profiles WHERE user_id = $1",
        [mockUserId]
      );
      
      if (existingProfile.rows.length > 0) {
        // Update existing profile - manually map fields to handle special cases
        const dbFields = {};
        
        // Define valid database fields to prevent errors
        const validFields = new Set([
          'first_name', 'last_name', 'middle_name', 'profile_picture_url', 'phone',
          'date_of_birth', 'gender', 'student_id', 'admission_year', 'graduation_year',
          'degree', 'branch', 'cgpa', 'current_company', 'current_position', 'industry',
          'work_experience_years', 'skills', 'linkedin_url', 'github_url', 'portfolio_url',
          'current_city', 'current_state', 'current_country', 'hometown_city', 'hometown_state',
          'bio', 'achievements', 'interests', 'is_profile_public', 'show_contact_info',
          'show_work_info', 'show_academic_info', 'is_open_to_work', 'is_available_for_mentorship'
        ]);
        
        Object.keys(alumniData).forEach(key => {
          let dbKey;
          // Handle special field mappings
          if (key === 'firstName') {
            dbKey = 'first_name';
          } else if (key === 'lastName') {
            dbKey = 'last_name';
          } else if (key === 'profilePicture') {
            dbKey = 'profile_picture_url';
          } else if (key === 'roll_number') {
            dbKey = 'student_id'; // roll_number maps to student_id in database
          } else {
            // Convert camelCase to snake_case for other fields
            dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
          }
          
          // Only include valid database fields
          if (validFields.has(dbKey)) {
            dbFields[dbKey] = alumniData[key];
          }
        });
        
        // Remove any undefined values
        Object.keys(dbFields).forEach(key => {
          if (dbFields[key] === undefined) {
            delete dbFields[key];
          }
        });
        
        if (Object.keys(dbFields).length > 0) {
          const setClause = Object.keys(dbFields).map((key, index) => `${key} = $${index + 2}`).join(', ');
          const values = [existingProfile.rows[0].id, ...Object.values(dbFields)];
          
          await query(
            `UPDATE alumni_profiles SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
            values
          );
        }
      } else {
        // Create new profile with all data in alumni_profiles table
        const AlumniProfile = require("../models/AlumniProfile");
        
        // Map to camelCase for the model
        const mappedData = {
          userId: mockUserId,
          firstName: alumniData.firstName || '',
          lastName: alumniData.lastName || '',
          profilePictureUrl: alumniData.profilePicture || '',
          graduationYear: alumniData.graduation_year,
          degree: alumniData.degree,
          branch: alumniData.branch,
          studentId: alumniData.roll_number || alumniData.student_id, // Handle both field names
          currentCompany: alumniData.current_company,
          currentPosition: alumniData.current_position,
          currentCity: alumniData.current_city,
          currentState: alumniData.current_state,
          currentCountry: alumniData.current_country,
          bio: alumniData.bio,
          skills: alumniData.skills || [],
          linkedinUrl: alumniData.linkedin_url,
          githubUrl: alumniData.github_url,
          portfolioUrl: alumniData.portfolio_url,
          achievements: alumniData.achievements,
          isProfilePublic: alumniData.is_profile_public,
          showContactInfo: alumniData.show_contact_info || false,
          showWorkInfo: alumniData.show_work_info !== false,
          showAcademicInfo: alumniData.show_academic_info !== false,
          isOpenToWork: alumniData.is_open_to_work || false,
          isAvailableForMentorship: alumniData.is_available_for_mentorship || false,
          interests: alumniData.interests || [],
          workExperienceYears: alumniData.work_experience_years || 0
        };
        
        await AlumniProfile.create(mappedData);
      }
    }
    
    // Return updated profile (fetch from alumni_profiles table primarily)
    const updatedUser = await User.findById(mockUserId);
    const profileResult = await query(
      "SELECT * FROM alumni_profiles WHERE user_id = $1",
      [mockUserId]
    );
    
    const alumniProfile = profileResult.rows[0] || null;
    
    res.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        // Get profile data from alumni_profiles table
        firstName: alumniProfile?.first_name || updatedUser.first_name || '',
        lastName: alumniProfile?.last_name || updatedUser.last_name || '',
        profilePicture: alumniProfile?.profile_picture_url || updatedUser.profile_picture_url || '',
        alumniProfile: alumniProfile,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating profile",
    });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post("/logout", (req, res) => {
  try {
    // JWT is stateless, so logout is handled client-side
    res.json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during logout",
    });
  }
});

module.exports = router;

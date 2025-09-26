const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { authenticate } = require("../middleware/auth");
const { query } = require("../config/database");

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
    let providerName = "local";
    if (provider === "google") {
      providerName = "google";
    } else if (provider === "linkedin") {
      providerName = "linkedin";
    }

    // Create new user (authentication data only)
    const userData = {
      email: email.toLowerCase(),
      password,
      role: "alumni",
      provider: providerName,
      is_approved: true, // Auto-approve for now
      is_active: true,
    };

    const user = await User.create(userData);

    // Create alumni profile with personal information
    const AlumniProfile = require("../models/AlumniProfile");
    const profileData = {
      userId: user.id,
      firstName,
      lastName,
      isProfilePublic: true, // Default to public so they appear in directory
    };

    const profile = await AlumniProfile.create(profileData);

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
        firstName: profile.first_name,
        lastName: profile.last_name,
        role: user.role,
        isApproved: user.is_approved,
        isActive: user.is_active,
        provider: user.provider,
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
        message: "Google login failed: missing email or googleId.",
      });
    }

    let user = await User.findByEmail(email);

    if (!user) {
      // Register new user with Google provider
      const userData = {
        email: email.toLowerCase(),
        provider: "google",
        providerId: googleId,
        role: "alumni",
        isApproved: true,
      };
      user = await User.create(userData);
    }

    // Check if alumni profile exists for this user (regardless of whether user is new or existing)
    const AlumniProfile = require("../models/AlumniProfile");
    const existingProfile = await AlumniProfile.findByUserId(user.id);

    let isNewUser = false;
    let alumniProfile = existingProfile;

    if (!existingProfile) {
      // Create alumni profile only if it doesn't exist
      const nameParts = name ? name.split(" ") : ["", ""];
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      const profileData = {
        userId: user.id,
        firstName,
        lastName,
        isProfilePublic: true,
      };

      alumniProfile = await AlumniProfile.create(profileData);
      isNewUser = true;
    }

    // Check if the profile is complete (has essential alumni info)
    const hasAlumniProfile =
      alumniProfile &&
      alumniProfile.graduation_year &&
      alumniProfile.branch &&
      alumniProfile.degree &&
      alumniProfile.bio &&
      alumniProfile.bio.trim().length > 0;

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    res.json({
      success: true,
      message: "Google login successful",
      token,
      isNewUser,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isApproved: user.is_approved,
        isActive: user.is_active,
        provider: user.provider,
        hasAlumniProfile,
      },
    });
  } catch (error) {
    console.error("Google login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error. Please try again.",
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
        message: "LinkedIn login failed: missing email or linkedinId.",
      });
    }

    let user = await User.findByEmail(email);

    if (!user) {
      // Register new user with LinkedIn provider
      const userData = {
        email: email.toLowerCase(),
        provider: "linkedin",
        providerId: linkedinId,
        role: "alumni",
        isApproved: true,
      };
      user = await User.create(userData);
    }

    // Check if alumni profile exists for this user (regardless of whether user is new or existing)
    const AlumniProfile = require("../models/AlumniProfile");
    const existingProfile = await AlumniProfile.findByUserId(user.id);

    let isNewUser = false;
    let alumniProfile = existingProfile;

    if (!existingProfile) {
      // Create alumni profile only if it doesn't exist
      const nameParts = name ? name.split(" ") : ["", ""];
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      const profileData = {
        userId: user.id,
        firstName,
        lastName,
        isProfilePublic: true,
      };

      alumniProfile = await AlumniProfile.create(profileData);
      isNewUser = true;
    }

    // Check if the profile is complete (has essential alumni info)
    const hasAlumniProfile =
      alumniProfile &&
      alumniProfile.graduation_year &&
      alumniProfile.branch &&
      alumniProfile.degree &&
      alumniProfile.bio &&
      alumniProfile.bio.trim().length > 0;

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    res.json({
      success: true,
      message: "LinkedIn login successful",
      token,
      isNewUser,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isApproved: user.is_approved,
        isActive: user.is_active,
        provider: user.provider,
        hasAlumniProfile,
      },
    });
  } catch (error) {
    console.error("LinkedIn login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error. Please try again.",
    });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get("/me", authenticate, async (req, res) => {
  try {
    const user = req.user;

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
router.get("/profile", authenticate, async (req, res) => {
  try {
    // Get the actual authenticated user's ID from the auth middleware
    const userId = req.user.id;

    // Get user basic info (only email, role, approval status)
    const user = await User.findById(userId);
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
        [userId]
      );
      if (result.rows.length > 0) {
        alumniProfile = result.rows[0];
      }
    } catch (error) {
      console.log("No alumni profile found for user:", userId);
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
          // Name comes from alumni_profiles, empty if no profile
          firstName: "",
          lastName: "",
          profilePicture: user.profile_picture_url || "",
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
        firstName: alumniProfile.first_name || "",
        lastName: alumniProfile.last_name || "",
        profilePicture:
          alumniProfile.profile_picture_url || user.profile_picture_url || "",
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
router.put("/profile", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const updateData = req.body;

    console.log("PUT /auth/profile - User ID:", userId);
    console.log("PUT /auth/profile - Request body:", updateData);

    // Only email updates go to users table
    const userData = {};
    const alumniData = {};

    // Separate user data from alumni profile data
    if (updateData.email) {
      userData.email = updateData.email;
    }

    // All other data goes to alumni profile (using camelCase)
    const alumniFields = [
      "firstName",
      "lastName",
      "middleName",
      "profilePicture",
      "phone",
      "dateOfBirth",
      "gender",
      "studentId",
      "admissionYear",
      "graduationYear",
      "degree",
      "branch",
      "cgpa",
      "currentCompany",
      "currentPosition",
      "industry",
      "workExperienceYears",
      "skills",
      "linkedinUrl",
      "githubUrl",
      "portfolioUrl",
      "currentCity",
      "currentState",
      "currentCountry",
      "hometownCity",
      "hometownState",
      "bio",
      "achievements",
      "interests",
      "isProfilePublic",
      "showContactInfo",
      "showWorkInfo",
      "showAcademicInfo",
    ];

    alumniFields.forEach((field) => {
      if (updateData.hasOwnProperty(field)) {
        alumniData[field] = updateData[field];
      }
    });

    // Handle legacy field names from frontend
    if (updateData.rollNumber) {
      alumniData.studentId = updateData.rollNumber;
    }

    // Handle snake_case field names that might be sent by frontend
    if (updateData.linkedin_url) {
      alumniData.linkedinUrl = updateData.linkedin_url;
    }
    if (updateData.github_url) {
      alumniData.githubUrl = updateData.github_url;
    }
    if (updateData.portfolio_url) {
      alumniData.portfolioUrl = updateData.portfolio_url;
    }
    if (updateData.profile_picture) {
      alumniData.profilePicture = updateData.profile_picture;
    }

    console.log("Final alumniData to be updated:", alumniData);

    // Update user table if needed
    if (Object.keys(userData).length > 0) {
      console.log("Updating user table with:", userData);
      await User.update(userId, userData);
    }

    // Update or create alumni profile
    if (Object.keys(alumniData).length > 0) {
      console.log("Processing alumni data:", alumniData);
      // Handle array fields properly
      const arrayFields = ["skills", "achievements", "interests"];
      arrayFields.forEach((field) => {
        if (alumniData.hasOwnProperty(field)) {
          if (
            !alumniData[field] ||
            alumniData[field] === "" ||
            alumniData[field] === null
          ) {
            // Convert empty/null/undefined values to empty arrays
            alumniData[field] = [];
          } else if (typeof alumniData[field] === "string") {
            if (alumniData[field].trim() === "") {
              alumniData[field] = [];
            } else {
              alumniData[field] = alumniData[field]
                .split(",")
                .map((item) => item.trim())
                .filter((item) => item.length > 0);
            }
          } else if (!Array.isArray(alumniData[field])) {
            alumniData[field] = [];
          }
        }
      });

      // Check if alumni profile exists
      const existingProfile = await query(
        "SELECT id FROM alumni_profiles WHERE user_id = $1",
        [userId]
      );

      if (existingProfile.rows.length > 0) {
        // Update existing profile using the model
        console.log(
          "Updating existing profile with ID:",
          existingProfile.rows[0].id
        );
        const AlumniProfile = require("../models/AlumniProfile");
        await AlumniProfile.update(existingProfile.rows[0].id, alumniData);
        console.log("Profile updated successfully");
      } else {
        // Create new profile
        console.log("Creating new profile");
        const AlumniProfile = require("../models/AlumniProfile");
        alumniData.userId = userId;
        await AlumniProfile.create(alumniData);
        console.log("New profile created");
      }
    }

    // Return updated profile
    const updatedUser = await User.findById(userId);
    const profileResult = await query(
      "SELECT * FROM alumni_profiles WHERE user_id = $1",
      [userId]
    );

    const alumniProfile = profileResult.rows[0] || null;

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        firstName: alumniProfile?.first_name || "",
        lastName: alumniProfile?.last_name || "",
        profilePicture: alumniProfile?.profile_picture_url || "",
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

const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const { authenticate } = require("../middleware/auth");
const { query } = require("../config/database");
const emailService = require("../services/emailService");

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
          message:
            "An account with this email already exists but is not verified. Please check your email for the verification link or request a new one.",
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
      is_approved: false, // ❌ Not approved until verified
      is_active: true,
      email_verified: false, // ❌ Not verified yet
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
      console.error("Error sending verification email:", emailError);
      // Delete the created user if email fails
      await query('DELETE FROM users WHERE id = $1', [user.id]);

      return res.status(500).json({
        success: false,
        message: "Failed to send verification email. Please try again.",
      });
    }

    // DO NOT create alumni profile yet - wait for verification
    // DO NOT auto-login - require verification first

    res.status(201).json({
      success: true,
      message:
        "Registration successful! Please check your email to verify your account.",
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
    if (user.provider === "local" && !user.email_verified) {
      return res.status(401).json({
        success: false,
        message:
          "Please verify your email before logging in. Check your inbox for the verification link.",
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
      await emailService.sendWelcomeEmail(
        user.email,
        user.email.split("@")[0]
      );
    } catch (error) {
      console.error("Error sending welcome email:", error);
      // Don't fail verification if welcome email fails
    }

    res.json({
      success: true,
      message:
        "Email verified successfully! You can now login to your account.",
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
      email.split("@")[0] // Use email prefix as name
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
 * @route   POST /api/auth/linkedin/callback
 * @desc    Exchange LinkedIn authorization code for user data (handles CORS)
 * @access  Public
 */
router.post("/linkedin/callback", async (req, res) => {
  try {
    const { code, redirectUri } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Authorization code is required",
      });
    }

    // Use the EXACT redirect URI from frontend (must match authorization request)
    const finalRedirectUri = redirectUri || "http://localhost:3000/linkedin";

    console.log("LinkedIn token exchange:", {
      code: code.substring(0, 10) + "...",
      redirectUri: finalRedirectUri,
      clientId: process.env.LINKEDIN_CLIENT_ID,
    });

    // Exchange authorization code for access token
    const tokenResponse = await axios.post(
      "https://www.linkedin.com/oauth/v2/accessToken",
      new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: finalRedirectUri,
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const accessToken = tokenResponse.data.access_token;

    // Get user info using OpenID Connect userinfo endpoint
    const userinfoResponse = await axios.get(
      "https://api.linkedin.com/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const userinfo = userinfoResponse.data;

    // Extract user data
    const userData = {
      email: userinfo.email,
      linkedinId: userinfo.sub,
      name:
        userinfo.name ||
        `${userinfo.given_name || ""} ${userinfo.family_name || ""}`.trim(),
      picture: userinfo.picture,
    };

    // Return user data to frontend (frontend will call /api/auth/linkedin to login)
    res.json({
      success: true,
      data: userData,
    });
  } catch (error) {
    console.error(
      "LinkedIn callback error:",
      error.response?.data || error.message
    );
    res.status(500).json({
      success: false,
      message:
        error.response?.data?.error_description ||
        "Failed to exchange LinkedIn authorization code",
      error: error.response?.data || error.message,
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
      const arrayFields = ["skills", "interests"];
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

import express from "express";
const router = express.Router();
import User from "../models/User.js";
import bcrypt from "bcryptjs"; // kept for potential future use (password validation etc.)
import jwt from "jsonwebtoken";
import axios from "axios";
import { authenticate } from "../models/middleware/auth.js";
import { query } from "../config/database.js";
import emailService from "../services/emailService.js";
import AlumniProfile from "../models/AlumniProfile.js";

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user with email verification
 * @access  Public
 */
router.post("/register", async (req, res) => {
  try {
    const { email, password, provider } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
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

    // Create new user - requires email verification, then admin approval
    const userData = {
      email: email.toLowerCase(),
      password,
      role: "alumni",
      provider: providerName,
      is_approved: false, // ❌ Requires admin approval (for all users)
      is_active: true,
      email_verified: false, // ❌ Requires email verification first
    };

    const user = await User.create(userData);

    // Generate verification token
    const verificationToken = await User.generateVerificationToken(user.id);

    // Send verification email
    try {
      await emailService.sendVerificationEmail(
        email,
        verificationToken,
        // Use email prefix if name not available
        email.split("@")[0]
      );
    } catch (emailError) {
      console.error("Error sending verification email:", emailError);
      // Delete the created user if email fails
      await query("DELETE FROM users WHERE id = $1", [user.id]);

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
        "Registration successful! Please check your email to verify your account. After verification, an admin will review your account.",
      requiresVerification: true,
      requiresAdminApproval: true,
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
 * @route   POST /api/auth/verify-identity
 * @desc    Verify user identity against institute records (Step 1 of personal email registration)
 * @access  Public
 */
router.post("/verify-identity", async (req, res) => {
  try {
    // Accept both snake_case and camelCase payloads for compatibility with frontend
    const roll_number = req.body.roll_number || req.body.rollNumber;
    const full_name = req.body.full_name || req.body.fullName || req.body.name;
    const date_of_birth = req.body.date_of_birth || req.body.dateOfBirth;

    // Validate required fields
    if (!roll_number || !full_name || !date_of_birth) {
      return res.status(400).json({
        success: false,
        message: "Please provide roll number, name, and date of birth",
      });
    }

    // Normalize name for comparison (case-insensitive, trim whitespace, collapse multiple spaces)
    const normalizeName = (str) => {
      return str.toLowerCase().trim().replace(/\s+/g, " "); // Replace multiple spaces with single space
    };

    const normalizedInputName = normalizeName(full_name);

    // Query institute records
    const result = await query(
      `SELECT * FROM institute_records 
       WHERE roll_number = $1 
       AND date_of_birth = $2 
       AND is_active = true`,
      [roll_number.trim(), date_of_birth]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "Could not verify your identity. Please check your roll number and date of birth.",
        canRetry: true,
      });
    }

    const record = result.rows[0];
    const normalizedDbName = normalizeName(record.full_name);

    // Check if names match (normalized comparison)
    if (normalizedInputName !== normalizedDbName) {
      return res.status(404).json({
        success: false,
        message: `Name does not match our records. Please enter your name exactly as registered in institute records.`,
        canRetry: true,
        hint: "Make sure to include your full name including middle name if applicable",
      });
    }

    // Generate verification token (valid for 30 minutes)
    const crypto = await import("crypto");
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const tokenExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Store verification token temporarily in session or cache
    // For now, we'll encode the record ID in JWT token
    const tempToken = jwt.sign(
      {
        instituteRecordId: record.id,
        rollNumber: record.roll_number,
        fullName: record.full_name,
        type: "identity_verification",
      },
      process.env.JWT_SECRET,
      { expiresIn: "30m" }
    );

    res.json({
      success: true,
      message: "Identity verified successfully!",
      verificationToken: tempToken,
      userData: {
        // Keep both naming styles for backward compatibility with UI
        rollNumber: record.roll_number,
        roll_number: record.roll_number,
        fullName: record.full_name,
        full_name: record.full_name,
        graduationYear: record.graduation_year,
        graduation_year: record.graduation_year,
        degree: record.degree,
        branch: record.branch,
      },
    });
  } catch (error) {
    console.error("Identity verification error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during verification",
    });
  }
});

/**
 * @route   POST /api/auth/register/institute-email
 * @desc    Register with institute email (@iiitnr.edu.in or @iiitnr.ac.in)
 * @access  Public
 */
router.post("/register/institute-email", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
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

    // Validate institute email domain
    const emailLower = email.toLowerCase();
    if (
      !emailLower.endsWith("@iiitnr.edu.in") &&
      !emailLower.endsWith("@iiitnr.ac.in")
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please use your institute email address (@iiitnr.edu.in or @iiitnr.ac.in)",
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
      if (!existingUser.email_verified) {
        return res.status(400).json({
          success: false,
          message:
            "An account with this email already exists but is not verified. Please check your email for the verification link.",
          canResendVerification: true,
          email: email,
        });
      }

      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    // Create new user
    const userData = {
      email: emailLower,
      password,
      role: "alumni",
      provider: "local",
      registration_path: "institute_email",
      is_approved: true, // Auto-approve institute emails (no admin approval needed)
      is_active: true,
      email_verified: false, // Still requires email verification
    };

    const user = await User.create(userData);

    // Generate verification token
    const verificationToken = await User.generateVerificationToken(user.id);

    // Send verification email
    try {
      await emailService.sendVerificationEmail(
        email,
        verificationToken,
        email.split("@")[0]
      );
    } catch (emailError) {
      console.error("Error sending verification email:", emailError);
      await query("DELETE FROM users WHERE id = $1", [user.id]);

      return res.status(500).json({
        success: false,
        message: "Failed to send verification email. Please try again.",
      });
    }

    res.status(201).json({
      success: true,
      message:
        "Registration successful! Please check your email to verify your account.",
      requiresVerification: true,
      email: email,
    });
  } catch (error) {
    console.error("Institute email registration error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during registration",
    });
  }
});

/**
 * @route   POST /api/auth/register/personal-email
 * @desc    Register with personal email after identity verification
 * @access  Public
 */
router.post("/register/personal-email", async (req, res) => {
  try {
    const { email, password, verificationToken } = req.body;

    // Validate required fields
    if (!email || !password || !verificationToken) {
      return res.status(400).json({
        success: false,
        message: "Please provide email, password, and verification token",
      });
    }

    // Verify the identity verification token
    let tokenData;
    try {
      tokenData = jwt.verify(verificationToken, process.env.JWT_SECRET);
      if (tokenData.type !== "identity_verification") {
        throw new Error("Invalid token type");
      }
    } catch (err) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid or expired verification token. Please verify your identity again.",
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
      if (!existingUser.email_verified) {
        return res.status(400).json({
          success: false,
          message:
            "An account with this email already exists but is not verified. Please check your email for the verification link.",
          canResendVerification: true,
          email: email,
        });
      }

      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    // Check if someone already registered with this institute record
    const existingRecord = await query(
      "SELECT id FROM users WHERE institute_record_id = $1",
      [tokenData.instituteRecordId]
    );

    if (existingRecord.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "An account has already been registered with this roll number. Please contact support if this is an error.",
      });
    }

    // Create new user linked to institute record
    const userData = {
      email: email.toLowerCase(),
      password,
      role: "alumni",
      provider: "local",
      registration_path: "personal_email",
      institute_record_id: tokenData.instituteRecordId,
      is_approved: true, // Auto-approve (identity was verified)
      is_active: true,
      email_verified: false, // Still requires email verification
    };

    const user = await User.create(userData);

    // Generate verification token
    const emailVerificationToken = await User.generateVerificationToken(
      user.id
    );

    // Send verification email
    try {
      await emailService.sendVerificationEmail(
        email,
        emailVerificationToken,
        tokenData.fullName
      );
    } catch (emailError) {
      console.error("Error sending verification email:", emailError);
      await query("DELETE FROM users WHERE id = $1", [user.id]);

      return res.status(500).json({
        success: false,
        message: "Failed to send verification email. Please try again.",
      });
    }

    res.status(201).json({
      success: true,
      message:
        "Registration successful! Please check your email to verify your account.",
      requiresVerification: true,
      email: email,
      userData: {
        rollNumber: tokenData.rollNumber,
        fullName: tokenData.fullName,
      },
    });
  } catch (error) {
    console.error("Personal email registration error:", error);
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

    // Determine if alumni profile exists
    let hasAlumniProfile = false;
    try {
      const result = await query(
        "SELECT 1 FROM alumni_profiles WHERE user_id = $1 LIMIT 1",
        [user.id]
      );
      hasAlumniProfile = result.rows.length > 0;
    } catch (e) {
      hasAlumniProfile = false;
    }

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
        onboardingCompleted: user.onboarding_completed || false,
        hasAlumniProfile,
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

    // Email verified successfully - do NOT auto-create alumni profile
    const user = await User.findById(result.user.id);

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(user.email, user.email.split("@")[0]);
    } catch (error) {
      console.error("Error sending welcome email:", error);
      // Don't fail verification if welcome email fails
    }

    // Determine profile setup status
    let hasAlumniProfile = false;
    try {
      const check = await query(
        "SELECT 1 FROM alumni_profiles WHERE user_id = $1 LIMIT 1",
        [user.id]
      );
      hasAlumniProfile = check.rows.length > 0;
    } catch (e) {
      hasAlumniProfile = false;
    }

    res.json({
      success: true,
      message:
        "Email verified successfully! You can now login to your account.",
      verified: true,
      hasAlumniProfile,
      needsProfileSetup: !hasAlumniProfile,
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
 * @desc    Google OAuth login/registration (supports both institute and personal email paths)
 * @access  Public
 */
router.post("/google", async (req, res) => {
  try {
    const { email, googleId, name, verificationToken } = req.body;
    if (!email || !googleId) {
      return res.status(400).json({
        success: false,
        message: "Google login failed: missing email or googleId.",
      });
    }

    let user = await User.findByEmail(email);
    let isNewUser = false;

    if (!user) {
      // Determine registration path based on email domain or verification token
      const emailLower = email.toLowerCase();
      const isInstituteEmail =
        emailLower.endsWith("@iiitnr.edu.in") ||
        emailLower.endsWith("@iiitnr.ac.in");

      let registrationPath = "oauth";
      let instituteRecordId = null;

      // If verification token provided, this is personal email path
      if (verificationToken) {
        try {
          const tokenData = jwt.verify(
            verificationToken,
            process.env.JWT_SECRET
          );
          if (tokenData.type === "identity_verification") {
            registrationPath = "personal_email";
            instituteRecordId = tokenData.instituteRecordId;

            // Check if someone already registered with this institute record
            const existingRecord = await query(
              "SELECT id FROM users WHERE institute_record_id = $1",
              [instituteRecordId]
            );

            if (existingRecord.rows.length > 0) {
              return res.status(400).json({
                success: false,
                message:
                  "An account has already been registered with this roll number.",
              });
            }
          }
        } catch (err) {
          return res.status(400).json({
            success: false,
            message: "Invalid or expired verification token.",
          });
        }
      } else if (isInstituteEmail) {
        registrationPath = "institute_email";
      }

      // Register new user with Google provider
      const userData = {
        email: emailLower,
        provider: "google",
        providerId: googleId,
        role: "alumni",
        isApproved: true, // OAuth users are auto-approved
        email_verified: true, // OAuth emails are pre-verified by Google
        registration_path: registrationPath,
        institute_record_id: instituteRecordId,
      };
      user = await User.create(userData);
      isNewUser = true;
    }

    // Check if alumni profile exists; do NOT auto-create one
    let hasAlumniProfile = false;
    try {
      const check = await query(
        "SELECT 1 FROM alumni_profiles WHERE user_id = $1 LIMIT 1",
        [user.id]
      );
      hasAlumniProfile = check.rows.length > 0;
    } catch (e) {
      hasAlumniProfile = false;
    }

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
        needsProfileSetup: !hasAlumniProfile,
        onboardingCompleted: user.onboarding_completed || false,
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
    let isNewUser = false;

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
      isNewUser = true;
    }

    // Check if alumni profile exists; do NOT auto-create one
    let hasAlumniProfile = false;
    try {
      const check = await query(
        "SELECT 1 FROM alumni_profiles WHERE user_id = $1 LIMIT 1",
        [user.id]
      );
      hasAlumniProfile = check.rows.length > 0;
    } catch (e) {
      hasAlumniProfile = false;
    }

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
        needsProfileSetup: !hasAlumniProfile,
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
    const finalRedirectUri =
      redirectUri ||
      process.env.LINKEDIN_REDIRECT_URI ||
      "http://localhost:3000/linkedin";

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

    // Determine if alumni profile exists
    let hasAlumniProfile = false;
    try {
      const result = await query(
        "SELECT 1 FROM alumni_profiles WHERE user_id = $1 LIMIT 1",
        [user.id]
      );
      hasAlumniProfile = result.rows.length > 0;
    } catch (e) {
      hasAlumniProfile = false;
    }

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
        onboardingCompleted: user.onboarding_completed || false,
        hasAlumniProfile,
        needsProfileSetup: !hasAlumniProfile,
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
        alumniProfile = AlumniProfile.convertFromDbFormat(result.rows[0]);
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
          onboardingCompleted: user.onboarding_completed || false,
          // Name comes from alumni_profiles, empty if no profile
          firstName: "",
          lastName: "",
          profilePicture: user.profile_picture_url || "",
          alumniProfile: null,
        },
      });
    }

    // Return profile data primarily from alumni_profiles table (converted)
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
        onboardingCompleted: user.onboarding_completed || false,
        // Get primary profile data from converted alumni profile
        firstName: alumniProfile?.firstName || "",
        lastName: alumniProfile?.lastName || "",
        profilePicture:
          alumniProfile?.profilePictureUrl || user.profile_picture_url || "",
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
 * @route   GET /api/auth/onboarding-data
 * @desc    Get pre-fill data for onboarding form based on registration path
 * @access  Private
 */
router.get("/onboarding-data", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user data
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    let preFillData = {
      registrationPath: user.registration_path || "institute_email",
      rollNumber: null,
      rollNumberLocked: false,
      firstName: "",
      lastName: "",
      graduationYear: null,
      degree: null,
      branch: null,
    };

    // If user registered via personal email, fetch institute record data
    if (user.institute_record_id) {
      try {
        const recordResult = await query(
          "SELECT * FROM institute_records WHERE id = $1",
          [user.institute_record_id]
        );

        if (recordResult.rows.length > 0) {
          const record = recordResult.rows[0];

          // Split full name into first and last name
          const nameParts = record.full_name.trim().split(/\s+/);
          const firstName = nameParts[0] || "";
          const lastName =
            nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";

          preFillData = {
            registrationPath: "personal_email",
            rollNumber: record.roll_number,
            rollNumberLocked: true, // Lock roll number for verified users
            firstName: firstName,
            lastName: lastName,
            fullName: record.full_name,
            graduationYear: record.graduation_year,
            degree: record.degree,
            branch: record.branch,
          };
        }
      } catch (error) {
        console.error("Error fetching institute record:", error);
      }
    }

    res.json({
      success: true,
      data: preFillData,
    });
  } catch (error) {
    console.error("Get onboarding data error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
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
      "employmentStatus",
      "currentEmployer",
      "currentJobTitle",
      "industrySector",
      "jobLocation",
      "jobStartYear",
      "annualSalaryRange",
      "jobType",
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
      "higherStudyInstitution",
      "higherStudyProgram",
      "higherStudyField",
      "higherStudyCountry",
      "higherStudyYear",
      "higherStudyStatus",
      "program",
      "department",
      "alternateEmail",
      "currentAddress",
      "permanentAddress",
      "profileVerifiedAt",
      "verificationSource",
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
        const { default: AlumniProfile } = await import(
          "../models/AlumniProfile.js"
        );
        await AlumniProfile.update(existingProfile.rows[0].id, alumniData);
        console.log("Profile updated successfully");
      } else {
        // Create new profile
        console.log("Creating new profile");
        const { default: AlumniProfile } = await import(
          "../models/AlumniProfile.js"
        );
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

    let alumniProfile = profileResult.rows[0] || null;
    if (alumniProfile) {
      alumniProfile = AlumniProfile.convertFromDbFormat(alumniProfile);
    }

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        firstName: alumniProfile?.firstName || "",
        lastName: alumniProfile?.lastName || "",
        profilePicture: alumniProfile?.profilePictureUrl || "",
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
 * @route   POST /api/auth/complete-onboarding
 * @desc    Mark user onboarding as completed after profile submission
 * @access  Private
 */
router.post("/complete-onboarding", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    // Verify user has an alumni profile with required fields
    const profileCheck = await query(
      `SELECT first_name, last_name, graduation_year 
       FROM alumni_profiles 
       WHERE user_id = $1`,
      [userId]
    );

    if (profileCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please complete your profile before finishing onboarding.",
      });
    }

    const profile = profileCheck.rows[0];
    // Simplified validation - only require name and graduation year
    if (!profile.first_name || !profile.last_name || !profile.graduation_year) {
      return res.status(400).json({
        success: false,
        message:
          "Please complete all required fields in your profile (name, graduation year).",
      });
    }

    // Mark onboarding as complete
    const updatedUser = await User.markOnboardingComplete(userId);

    res.json({
      success: true,
      message: "Onboarding completed successfully!",
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        onboardingCompleted: updatedUser.onboarding_completed,
      },
    });
  } catch (error) {
    console.error("Complete onboarding error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while completing onboarding",
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

export default router;

const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

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

    // Create new user
    const userData = {
      email: email.toLowerCase(),
      password,
      role: "alumni",
      provider: providerName,
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
        role: user.role,
        isApproved: user.is_approved,
        isActive: user.is_active,
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
router.get("/me", async (req, res) => {
  try {
    // This route will need authentication middleware
    res.json({
      success: true,
      message: "Get current user endpoint - requires auth middleware",
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

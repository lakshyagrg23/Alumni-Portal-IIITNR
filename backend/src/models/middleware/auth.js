import jwt from "jsonwebtoken";
import User from "../User.js";

/**
 * Authentication middleware - verifies JWT token
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await User.findById(decoded.userId);
    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Invalid user.",
      });
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(401).json({
      success: false,
      message: "Access denied. Invalid token.",
    });
  }
};

/**
 * Admin authorization middleware - checks if user is admin
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin privileges required.",
    });
  }

  next();
};

/**
 * Onboarding check middleware - ensures user has completed onboarding
 * Use this for routes that require a completed profile
 */
export const requireOnboarding = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
  }

  if (!req.user.onboarding_completed) {
    return res.status(403).json({
      success: false,
      message: "Please complete your profile to access this feature.",
      requiresOnboarding: true,
    });
  }

  next();
};

/**
 * Combined middleware for admin-only routes
 */
export const requireAuth = authenticate;
export const requireAdminAuth = [authenticate, requireAdmin];
export const requireOnboardedUser = [authenticate, requireOnboarding];

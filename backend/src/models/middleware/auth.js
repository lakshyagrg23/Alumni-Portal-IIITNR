import jwt from "jsonwebtoken";
import User from "../User.js";
import { query } from "../../config/database.js";

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

  if (req.user.role !== "admin" && req.user.role !== "superadmin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin privileges required.",
    });
  }

  next();
};

/** Ensure only superadmin can access */
export const requireSuperadmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Authentication required." });
  }
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: "Access denied. Superadmin privileges required." });
  }
  next();
};

/**
 * Permission check for admins (superadmin bypasses)
 * @param {string} permission
 */
export const requirePermission = (permission) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    if (req.user.role === 'superadmin') return next();
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin privileges required.' });
    }
    try {
      const result = await query(
        'SELECT 1 FROM admin_permissions WHERE user_id=$1 AND permission=$2 LIMIT 1',
        [req.user.id, String(permission)]
      );
      if ((result.rowCount || 0) === 0) {
        return res.status(403).json({ success: false, message: `Missing permission: ${permission}` });
      }
      next();
    } catch (e) {
      console.error('Permission check error:', e);
      return res.status(500).json({ success: false, message: 'Permission check failed' });
    }
  };
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
export const requireSuperadminAuth = [authenticate, requireSuperadmin];

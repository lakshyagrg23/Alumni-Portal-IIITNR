import express from "express";
const router = express.Router();
import User from "../models/User.js";
import { authenticate, requireAdminAuth } from "../models/middleware/auth.js";

/**
 * @route   GET /api/users
 * @desc    Get all users (Admin only)
 * @access  Private/Admin
 */
router.get("/", requireAdminAuth, async (req, res) => {
  try {
    const users = await User.findAll({
      orderBy: "created_at",
      orderDirection: "DESC",
    });

    res.json({
      success: true,
      data: users,
      count: users.length,
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching users",
    });
  }
});

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID (Own profile or Admin)
 * @access  Private
 */
router.get("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // IDOR Protection: Check if user is accessing their own data or is admin
    const requestedUserId = id.toString();
    const isOwnData = req.user.id.toString() === requestedUserId;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';

    if (!isOwnData && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only view your own profile.",
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching user",
    });
  }
});

/**
 * @route   PUT /api/users/:id
 * @desc    Update user (Own profile or Admin)
 * @access  Private
 */
router.put("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // IDOR Protection: Check if user is accessing their own data or is admin
    const requestedUserId = id.toString();
    const isOwnData = req.user.id.toString() === requestedUserId;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';

    if (!isOwnData && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only update your own profile.",
      });
    }

    // Remove sensitive fields that shouldn't be updated via this route
    delete updateData.password_hash;
    delete updateData.provider_id;
    delete updateData.email_verification_token;
    delete updateData.password_reset_token;

    // Non-admin users cannot modify privilege fields
    if (!isAdmin) {
      delete updateData.role;
      delete updateData.is_approved;
      delete updateData.is_active;
      delete updateData.email_verified;
    }

    const updatedUser = await User.update(id, updateData);

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "User updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating user",
    });
  }
});

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user (Admin only)
 * @access  Private/Admin
 */
router.delete("/:id", requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await User.delete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting user",
    });
  }
});

/**
 * @route   PUT /api/users/:id/approve
 * @desc    Approve user (Admin only)
 * @access  Private/Admin
 */
router.put("/:id/approve", requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const updatedUser = await User.update(id, { is_approved: true });

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "User approved successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Approve user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while approving user",
    });
  }
});

/**
 * @route   PUT /api/users/:id/deactivate
 * @desc    Deactivate user (Admin only)
 * @access  Private/Admin
 */
router.put("/:id/deactivate", requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const updatedUser = await User.update(id, { is_active: false });

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "User deactivated successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Deactivate user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deactivating user",
    });
  }
});

export default router;

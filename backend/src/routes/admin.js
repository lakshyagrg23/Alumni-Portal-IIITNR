const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { requireAdminAuth } = require("../middleware/auth");

// Apply admin authentication to all routes in this router
router.use(requireAdminAuth);

/**
 * @route   GET /api/admin/users
 * @desc    Get all users for admin dashboard
 * @access  Admin only
 */
router.get("/users", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      role,
      isApproved,
      search,
    } = req.query;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
    };

    if (role) options.role = role;
    if (isApproved !== undefined) options.isApproved = isApproved === 'true';

    const result = await User.findAll(options);

    // Filter by search term if provided
    let users = result.users;
    if (search) {
      const searchLower = search.toLowerCase();
      users = users.filter(user => 
        user.email.toLowerCase().includes(searchLower)
      );
    }

    res.json({
      success: true,
      data: users,
      pagination: result.pagination,
      total: result.pagination.total,
    });
  } catch (error) {
    console.error("Admin get users error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching users",
    });
  }
});

/**
 * @route   PUT /api/admin/users/:id/approve
 * @desc    Approve a user account
 * @access  Admin only
 */
router.put("/users/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user is already approved
    if (user.is_approved) {
      return res.status(400).json({
        success: false,
        message: "User is already approved",
      });
    }

    // Update user approval status
    const updatedUser = await User.update(id, { is_approved: true });

    res.json({
      success: true,
      message: "User approved successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Admin approve user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while approving user",
    });
  }
});

/**
 * @route   PUT /api/admin/users/:id/reject
 * @desc    Reject/unapprove a user account
 * @access  Admin only
 */
router.put("/users/:id/reject", async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update user approval status
    const updatedUser = await User.update(id, { is_approved: false });

    res.json({
      success: true,
      message: "User approval revoked successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Admin reject user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while rejecting user",
    });
  }
});

/**
 * @route   PUT /api/admin/users/:id/deactivate
 * @desc    Deactivate a user account
 * @access  Admin only
 */
router.put("/users/:id/deactivate", async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Prevent admin from deactivating themselves
    if (user.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "You cannot deactivate your own account",
      });
    }

    // Update user active status
    const updatedUser = await User.update(id, { is_active: false });

    res.json({
      success: true,
      message: "User deactivated successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Admin deactivate user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deactivating user",
    });
  }
});

/**
 * @route   PUT /api/admin/users/:id/activate
 * @desc    Activate a user account
 * @access  Admin only
 */
router.put("/users/:id/activate", async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update user active status
    const updatedUser = await User.update(id, { is_active: true });

    res.json({
      success: true,
      message: "User activated successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Admin activate user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while activating user",
    });
  }
});

/**
 * @route   GET /api/admin/stats/users
 * @desc    Get user statistics for admin dashboard
 * @access  Admin only
 */
router.get("/stats/users", async (req, res) => {
  try {
    const totalUsers = await User.findAll({ limit: 1000 }); // Get all users for stats
    const users = totalUsers.users;

    const stats = {
      total: users.length,
      approved: users.filter(user => user.is_approved).length,
      pending: users.filter(user => !user.is_approved).length,
      active: users.filter(user => user.is_active).length,
      inactive: users.filter(user => !user.is_active).length,
      byRole: {
        admin: users.filter(user => user.role === 'admin').length,
        alumni: users.filter(user => user.role === 'alumni').length,
      },
      byProvider: {
        local: users.filter(user => user.provider === 'local').length,
        google: users.filter(user => user.provider === 'google').length,
        linkedin: users.filter(user => user.provider === 'linkedin').length,
      },
      instituteEmails: users.filter(user => user.email.endsWith('@iiitnr.edu.in')).length,
      externalEmails: users.filter(user => !user.email.endsWith('@iiitnr.edu.in')).length,
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Admin get user stats error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching user statistics",
    });
  }
});

// =================== NEWS MANAGEMENT ===================

/**
 * @route   GET /api/admin/news
 * @desc    Get all news items for admin
 * @access  Admin only
 */
router.get("/news", async (req, res) => {
  try {
    const { query } = require("../config/database");
    
    const result = await query(`
      SELECT id, title, content, excerpt, featured_image_url, category, tags, 
             is_published, is_featured, published_at, created_at, updated_at
      FROM news 
      ORDER BY created_at DESC
    `);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error("Admin get news error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching news",
    });
  }
});

/**
 * @route   POST /api/admin/news
 * @desc    Create new news item
 * @access  Admin only
 */
router.post("/news", async (req, res) => {
  try {
    const { query } = require("../config/database");
    const { title, content, excerpt, category = 'news', tags = [], isPublished = true } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: "Title and content are required",
      });
    }

    const result = await query(`
      INSERT INTO news (title, content, excerpt, category, tags, is_published, published_at, author_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      title,
      content,
      excerpt || content.substring(0, 200) + '...',
      category,
      tags,
      isPublished,
      isPublished ? new Date() : null,
      req.user.id
    ]);

    res.status(201).json({
      success: true,
      message: "News created successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Admin create news error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating news",
    });
  }
});

/**
 * @route   PUT /api/admin/news/:id
 * @desc    Update news item
 * @access  Admin only
 */
router.put("/news/:id", async (req, res) => {
  try {
    const { query } = require("../config/database");
    const { id } = req.params;
    const { title, content, excerpt, category, tags, isPublished } = req.body;

    const result = await query(`
      UPDATE news 
      SET title = $1, content = $2, excerpt = $3, category = $4, tags = $5, 
          is_published = $6, published_at = $7, updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `, [
      title,
      content,
      excerpt,
      category,
      tags,
      isPublished,
      isPublished ? new Date() : null,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "News item not found",
      });
    }

    res.json({
      success: true,
      message: "News updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Admin update news error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating news",
    });
  }
});

/**
 * @route   DELETE /api/admin/news/:id
 * @desc    Delete news item
 * @access  Admin only
 */
router.delete("/news/:id", async (req, res) => {
  try {
    const { query } = require("../config/database");
    const { id } = req.params;

    const result = await query("DELETE FROM news WHERE id = $1 RETURNING *", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "News item not found",
      });
    }

    res.json({
      success: true,
      message: "News deleted successfully",
    });
  } catch (error) {
    console.error("Admin delete news error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting news",
    });
  }
});

// =================== EVENTS MANAGEMENT ===================

/**
 * @route   GET /api/admin/events
 * @desc    Get all events for admin
 * @access  Admin only
 */
router.get("/events", async (req, res) => {
  try {
    const { query } = require("../config/database");
    
    const result = await query(`
      SELECT id, title, description, event_type, mode, location, 
             start_datetime, end_datetime, registration_deadline, 
             max_participants, current_participants, status, 
             is_published, created_at, updated_at
      FROM events 
      ORDER BY start_datetime DESC
    `);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error("Admin get events error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching events",
    });
  }
});

/**
 * @route   POST /api/admin/events
 * @desc    Create new event
 * @access  Admin only
 */
router.post("/events", async (req, res) => {
  try {
    const { query } = require("../config/database");
    const { 
      title, 
      description, 
      eventType = 'webinar', 
      mode = 'online', 
      location, 
      startDatetime, 
      endDatetime,
      registrationDeadline,
      maxParticipants,
      isPublished = true 
    } = req.body;

    if (!title || !description || !startDatetime || !endDatetime) {
      return res.status(400).json({
        success: false,
        message: "Title, description, start datetime, and end datetime are required",
      });
    }

    const result = await query(`
      INSERT INTO events (title, description, event_type, mode, location, 
                         start_datetime, end_datetime, registration_deadline, 
                         max_participants, organizer_id, is_published, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      title,
      description,
      eventType,
      mode,
      location,
      startDatetime,
      endDatetime,
      registrationDeadline,
      maxParticipants,
      req.user.id,
      isPublished,
      'upcoming'
    ]);

    res.status(201).json({
      success: true,
      message: "Event created successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Admin create event error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating event",
    });
  }
});

/**
 * @route   PUT /api/admin/events/:id
 * @desc    Update event
 * @access  Admin only
 */
router.put("/events/:id", async (req, res) => {
  try {
    const { query } = require("../config/database");
    const { id } = req.params;
    const { 
      title, 
      description, 
      eventType, 
      mode, 
      location, 
      startDatetime, 
      endDatetime,
      registrationDeadline,
      maxParticipants,
      status,
      isPublished 
    } = req.body;

    const result = await query(`
      UPDATE events 
      SET title = $1, description = $2, event_type = $3, mode = $4, location = $5, 
          start_datetime = $6, end_datetime = $7, registration_deadline = $8, 
          max_participants = $9, status = $10, is_published = $11, updated_at = CURRENT_TIMESTAMP
      WHERE id = $12
      RETURNING *
    `, [
      title,
      description,
      eventType,
      mode,
      location,
      startDatetime,
      endDatetime,
      registrationDeadline,
      maxParticipants,
      status,
      isPublished,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    res.json({
      success: true,
      message: "Event updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Admin update event error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating event",
    });
  }
});

/**
 * @route   DELETE /api/admin/events/:id
 * @desc    Delete event
 * @access  Admin only
 */
router.delete("/events/:id", async (req, res) => {
  try {
    const { query } = require("../config/database");
    const { id } = req.params;

    const result = await query("DELETE FROM events WHERE id = $1 RETURNING *", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    res.json({
      success: true,
      message: "Event deleted successfully",
    });
  } catch (error) {
    console.error("Admin delete event error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting event",
    });
  }
});

module.exports = router;

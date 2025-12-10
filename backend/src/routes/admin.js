import express from "express";
const router = express.Router();
import User from "../models/User.js";
import { requireAdminAuth, requireSuperadminAuth, requirePermission } from "../models/middleware/auth.js";
import { query } from "../config/database.js";

// Apply admin authentication to all routes in this router
router.use(requireAdminAuth);

/**
 * @route   GET /api/admin/users
 * @desc    Get all users for admin dashboard
 * @access  Admin only
 */
router.get("/users", requirePermission('manage_users'), async (req, res) => {
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
router.put("/users/:id/approve", requirePermission('manage_users'), async (req, res) => {
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
router.put("/users/:id/reject", requirePermission('manage_users'), async (req, res) => {
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
router.put("/users/:id/deactivate", requirePermission('manage_users'), async (req, res) => {
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
router.put("/users/:id/activate", requirePermission('manage_users'), async (req, res) => {
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
router.get("/stats/users", requirePermission('manage_users'), async (req, res) => {
  try {
    // `User.findAll` returns an object; extract users array for stats
    const { users } = await User.findAll({ limit: 1000 });

    const stats = {
      total: users.length,
      approved: users.filter(user => user.is_approved).length,
      pending: users.filter(user => !user.is_approved).length,
      active: users.filter(user => user.is_active).length,
      inactive: users.filter(user => !user.is_active).length,
      byRole: {
        superadmin: users.filter(user => user.role === 'superadmin').length,
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
    if (req.user.role !== 'superadmin') {
      // enforce permission for admins
      const has = await query('SELECT 1 FROM admin_permissions WHERE user_id=$1 AND permission=$2 LIMIT 1', [req.user.id, 'manage_news']);
      if (!has.rowCount) return res.status(403).json({ success:false, message:'Missing permission: manage_news' });
    }
    
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
router.post("/news", requirePermission('manage_news'), async (req, res) => {
  try {
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
router.put("/news/:id", requirePermission('manage_news'), async (req, res) => {
  try {
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
router.delete("/news/:id", requirePermission('manage_news'), async (req, res) => {
  try {
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

// =============== SUPERADMIN MANAGEMENT ===============

// Get current admin's permissions
router.get('/permissions/me', async (req, res) => {
  try {
    if (req.user.role === 'superadmin') {
      return res.json({ success: true, data: ['*'] });
    }
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success:false, message:'Admin privileges required' });
    }
    const perms = await query('SELECT permission FROM admin_permissions WHERE user_id=$1 ORDER BY permission', [req.user.id]);
    res.json({ success:true, data: perms.rows.map(r=>r.permission) });
  } catch (e) {
    console.error('permissions/me error', e);
    res.status(500).json({ success:false, message:'Failed to load permissions' });
  }
});

// List admins with permissions (superadmin only)
router.get('/superadmin/admins', requireSuperadminAuth, async (req, res) => {
  try {
    const adminsRes = await query("SELECT id, email, role, is_active, is_approved FROM users WHERE role IN ('admin','superadmin') ORDER BY role DESC, email ASC");
    const ids = adminsRes.rows.map(r=>r.id);
    let permMap = new Map();
    if (ids.length) {
      const perms = await query('SELECT user_id, permission FROM admin_permissions WHERE user_id = ANY($1)', [ids]);
      permMap = perms.rows.reduce((m, r) => {
        const list = m.get(r.user_id) || [];
        list.push(r.permission);
        m.set(r.user_id, list);
        return m;
      }, new Map());
    }
    const data = adminsRes.rows.map(u => ({ ...u, permissions: permMap.get(u.id) || [] }));
    res.json({ success:true, data });
  } catch (e) {
    console.error('list admins error', e);
    res.status(500).json({ success:false, message:'Failed to list admins' });
  }
});

// Promote user to admin (superadmin only)
router.post('/superadmin/promote', requireSuperadminAuth, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ success:false, message:'userId required' });
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success:false, message:'User not found' });
    if (user.role === 'superadmin') return res.status(400).json({ success:false, message:'Cannot change superadmin role' });
    const updated = await User.update(userId, { role: 'admin' });
    res.json({ success:true, message:'User promoted to admin', data: updated });
  } catch (e) {
    console.error('promote admin error', e);
    res.status(500).json({ success:false, message:'Failed to promote user' });
  }
});

// Demote admin to alumni (superadmin only)
router.post('/superadmin/demote', requireSuperadminAuth, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ success:false, message:'userId required' });
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success:false, message:'User not found' });
    if (user.role === 'superadmin') return res.status(400).json({ success:false, message:'Cannot demote superadmin' });
    const updated = await User.update(userId, { role: 'alumni' });
    // Remove all permissions for that user
    await query('DELETE FROM admin_permissions WHERE user_id=$1', [userId]);
    res.json({ success:true, message:'User demoted to alumni', data: updated });
  } catch (e) {
    console.error('demote admin error', e);
    res.status(500).json({ success:false, message:'Failed to demote user' });
  }
});

// Grant a permission to admin (superadmin only)
router.post('/superadmin/permissions/grant', requireSuperadminAuth, async (req, res) => {
  try {
    const { userId, permission } = req.body;
    if (!userId || !permission) return res.status(400).json({ success:false, message:'userId and permission required' });
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success:false, message:'User not found' });
    if (user.role !== 'admin') return res.status(400).json({ success:false, message:'Permissions can be granted only to admin users' });
    await query('INSERT INTO admin_permissions(user_id, permission, granted_by) VALUES ($1,$2,$3) ON CONFLICT(user_id, permission) DO NOTHING', [userId, String(permission), req.user.id]);
    res.json({ success:true, message:'Permission granted' });
  } catch (e) {
    console.error('grant permission error', e);
    res.status(500).json({ success:false, message:'Failed to grant permission' });
  }
});

// Revoke a permission from admin (superadmin only)
router.post('/superadmin/permissions/revoke', requireSuperadminAuth, async (req, res) => {
  try {
    const { userId, permission } = req.body;
    if (!userId || !permission) return res.status(400).json({ success:false, message:'userId and permission required' });
    await query('DELETE FROM admin_permissions WHERE user_id=$1 AND permission=$2', [userId, String(permission)]);
    res.json({ success:true, message:'Permission revoked' });
  } catch (e) {
    console.error('revoke permission error', e);
    res.status(500).json({ success:false, message:'Failed to revoke permission' });
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
    if (req.user.role !== 'superadmin') {
      const has = await query('SELECT 1 FROM admin_permissions WHERE user_id=$1 AND permission=$2 LIMIT 1', [req.user.id, 'manage_events']);
      if (!has.rowCount) return res.status(403).json({ success:false, message:'Missing permission: manage_events' });
    }
    
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
router.post("/events", requirePermission('manage_events'), async (req, res) => {
  try {
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
router.put("/events/:id", requirePermission('manage_events'), async (req, res) => {
  try {
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
router.delete("/events/:id", requirePermission('manage_events'), async (req, res) => {
  try {
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

export default router;

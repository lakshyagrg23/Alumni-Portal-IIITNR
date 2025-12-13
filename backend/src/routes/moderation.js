import express from 'express';
import { authenticate, requireSuperadmin } from '../models/middleware/auth.js';
import db from '../config/database.js';

const router = express.Router();

/**
 * @route   POST /api/moderation/block
 * @desc    Block a user
 * @access  Private
 */
router.post('/block', authenticate, async (req, res) => {
  try {
    const { blockedUserId, reason } = req.body;
    const blockerUserId = req.user.id;

    if (!blockedUserId) {
      return res.status(400).json({ success: false, message: 'blockedUserId is required' });
    }

    if (blockerUserId === parseInt(blockedUserId)) {
      return res.status(400).json({ success: false, message: 'Cannot block yourself' });
    }

    const { query } = db;
    
    // Check if already blocked
    const existing = await query(
      'SELECT id FROM blocked_users WHERE blocker_user_id = $1 AND blocked_user_id = $2',
      [blockerUserId, blockedUserId]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'User already blocked' });
    }

    // Insert block
    const result = await query(
      `INSERT INTO blocked_users (blocker_user_id, blocked_user_id, reason)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [blockerUserId, blockedUserId, reason || null]
    );

    res.json({ 
      success: true, 
      message: 'User blocked successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

/**
 * @route   DELETE /api/moderation/unblock/:userId
 * @desc    Unblock a user
 * @access  Private
 */
router.delete('/unblock/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const blockerUserId = req.user.id;

    const { query } = db;
    
    const result = await query(
      'DELETE FROM blocked_users WHERE blocker_user_id = $1 AND blocked_user_id = $2 RETURNING *',
      [blockerUserId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Block not found' });
    }

    res.json({ 
      success: true, 
      message: 'User unblocked successfully'
    });
  } catch (error) {
    console.error('Unblock user error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/moderation/blocked
 * @desc    Get list of blocked users for current user
 * @access  Private
 */
router.get('/blocked', authenticate, async (req, res) => {
  try {
    const { query } = db;
    
    const result = await query(
      `SELECT b.*, u.email, ap.first_name, ap.last_name 
       FROM blocked_users b
       JOIN users u ON b.blocked_user_id = u.id
       LEFT JOIN alumni_profiles ap ON u.id = ap.user_id
       WHERE b.blocker_user_id = $1
       ORDER BY b.blocked_at DESC`,
      [req.user.id]
    );

    res.json({ 
      success: true, 
      data: result.rows 
    });
  } catch (error) {
    console.error('Get blocked users error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/moderation/report
 * @desc    Report a user
 * @access  Private
 */
router.post('/report', authenticate, async (req, res) => {
  try {
    const { reportedUserId, reportType, description, evidenceMessageIds } = req.body;
    const reporterUserId = req.user.id;

    if (!reportedUserId || !reportType || !description) {
      return res.status(400).json({ 
        success: false, 
        message: 'reportedUserId, reportType, and description are required' 
      });
    }

    if (reporterUserId === parseInt(reportedUserId)) {
      return res.status(400).json({ success: false, message: 'Cannot report yourself' });
    }

    const validTypes = ['harassment', 'spam', 'inappropriate_content', 'impersonation', 'other'];
    if (!validTypes.includes(reportType)) {
      return res.status(400).json({ success: false, message: 'Invalid report type' });
    }

    const { query } = db;
    
    const result = await query(
      `INSERT INTO user_reports (reporter_user_id, reported_user_id, report_type, description, evidence_message_ids)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [reporterUserId, reportedUserId, reportType, description, evidenceMessageIds || []]
    );

    res.json({ 
      success: true, 
      message: 'Report submitted successfully. Our team will review it shortly.',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Report user error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/moderation/reports
 * @desc    Get all reports (superadmin only)
 * @access  Superadmin
 */
router.get('/reports', authenticate, requireSuperadmin, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { query } = db;
    
    let whereClause = '';
    const params = [parseInt(limit), parseInt(offset)];
    
    if (status) {
      whereClause = 'WHERE r.status = $3';
      params.push(status);
    }

    const result = await query(
      `SELECT 
        r.*,
        reporter.email as reporter_email,
        reporter_profile.first_name as reporter_first_name,
        reporter_profile.last_name as reporter_last_name,
        reported.email as reported_email,
        reported_profile.first_name as reported_first_name,
        reported_profile.last_name as reported_last_name,
        reviewer.email as reviewer_email
       FROM user_reports r
       JOIN users reporter ON r.reporter_user_id = reporter.id
       LEFT JOIN alumni_profiles reporter_profile ON reporter.id = reporter_profile.user_id
       JOIN users reported ON r.reported_user_id = reported.id
       LEFT JOIN alumni_profiles reported_profile ON reported.id = reported_profile.user_id
       LEFT JOIN users reviewer ON r.reviewed_by_user_id = reviewer.id
       ${whereClause}
       ORDER BY r.reported_at DESC
       LIMIT $1 OFFSET $2`,
      params
    );

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM user_reports r ${whereClause}`,
      status ? [status] : []
    );

    res.json({ 
      success: true, 
      data: result.rows,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(countResult.rows[0].total / limit),
        count: result.rows.length,
        totalRecords: parseInt(countResult.rows[0].total)
      }
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

/**
 * @route   PUT /api/moderation/reports/:reportId
 * @desc    Update report status and take action (superadmin only)
 * @access  Superadmin
 */
router.put('/reports/:reportId', authenticate, requireSuperadmin, async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status, actionTaken, adminNotes } = req.body;
    const reviewerId = req.user.id;

    if (!status) {
      return res.status(400).json({ success: false, message: 'status is required' });
    }

    const validStatuses = ['pending', 'under_review', 'resolved', 'dismissed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const { query } = db;
    
    const result = await query(
      `UPDATE user_reports 
       SET status = $1, action_taken = $2, admin_notes = $3, reviewed_by_user_id = $4, reviewed_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [status, actionTaken || null, adminNotes || null, reviewerId, reportId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    res.json({ 
      success: true, 
      message: 'Report updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update report error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/moderation/warn/:userId
 * @desc    Issue a warning to a user (superadmin only)
 * @access  Superadmin
 */
router.post('/warn', authenticate, requireSuperadmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { warningType, message, relatedReportId } = req.body;
    const issuerId = req.user.id;

    if (!warningType || !message) {
      return res.status(400).json({ success: false, message: 'warningType and message are required' });
    }

    const { query } = db;
    
    const result = await query(
      `INSERT INTO user_warnings (user_id, issued_by_user_id, warning_type, message, related_report_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, issuerId, warningType, message, relatedReportId || null]
    );

    res.json({ 
      success: true, 
      message: 'Warning issued successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Issue warning error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/moderation/suspend/:userId
 * @desc    Suspend a user account (superadmin only)
 * @access  Superadmin
 */
router.post('/suspend/:userId', authenticate, requireSuperadmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason, suspensionType, durationDays, relatedReportId } = req.body;
    const suspenderId = req.user.id;

    if (!reason || !suspensionType) {
      return res.status(400).json({ success: false, message: 'reason and suspensionType are required' });
    }

    if (!['temporary', 'permanent'].includes(suspensionType)) {
      return res.status(400).json({ success: false, message: 'Invalid suspension type' });
    }

    const { query } = db;
    
    let endsAt = null;
    if (suspensionType === 'temporary' && durationDays) {
      endsAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
    }

    const result = await query(
      `INSERT INTO user_suspensions (user_id, suspended_by_user_id, reason, suspension_type, ends_at, related_report_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, suspenderId, reason, suspensionType, endsAt, relatedReportId || null]
    );

    res.json({ 
      success: true, 
      message: `User ${suspensionType === 'permanent' ? 'permanently' : 'temporarily'} suspended`,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Suspend user error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/moderation/lift-suspension/:suspensionId
 * @desc    Lift a user suspension (superadmin only)
 * @access  Superadmin
 */
router.post('/lift-suspension/:suspensionId', authenticate, requireSuperadmin, async (req, res) => {
  try {
    const { suspensionId } = req.params;
    const { liftReason } = req.body;
    const lifterId = req.user.id;

    const { query } = db;
    
    const result = await query(
      `UPDATE user_suspensions 
       SET is_active = FALSE, lifted_at = CURRENT_TIMESTAMP, lifted_by_user_id = $1, lift_reason = $2
       WHERE id = $3
       RETURNING *`,
      [lifterId, liftReason || null, suspensionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Suspension not found' });
    }

    res.json({ 
      success: true, 
      message: 'Suspension lifted successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Lift suspension error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/moderation/check-blocked/:userId
 * @desc    Check if a user is blocked
 * @access  Private
 */
router.get('/check-blocked/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    const { query } = db;
    
    // Check both directions
    const result = await query(
      `SELECT * FROM blocked_users 
       WHERE (blocker_user_id = $1 AND blocked_user_id = $2)
          OR (blocker_user_id = $2 AND blocked_user_id = $1)`,
      [currentUserId, userId]
    );

    res.json({ 
      success: true, 
      isBlocked: result.rows.length > 0,
      data: result.rows[0] || null
    });
  } catch (error) {
    console.error('Check blocked error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

export default router;

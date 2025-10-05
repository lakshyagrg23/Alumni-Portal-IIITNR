const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const Message = require("../models/Message");
const PublicKey = require("../models/PublicKey");
const AlumniProfile = require("../models/AlumniProfile");

/**
 * @route   GET /api/messages
 * @desc    Get user's messages/conversations
 * @access  Private
 */
router.get("/", authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    // Resolve authenticated user -> alumni_profiles.id
    const authAlumni = await AlumniProfile.findByUserId(req.user.id);
    if (!authAlumni) {
      return res.json({ success: true, data: [], pagination: { current: parseInt(page), total: 0, count: 0, totalRecords: 0 } });
    }

    // Query for last message per conversation partner (simple approach)
    const q = `
      SELECT m.* FROM messages m
      WHERE m.sender_id = $1 OR m.receiver_id = $1
      ORDER BY m.sent_at DESC
      LIMIT $2 OFFSET $3
    `;
    const msgsRes = await require('../config/database').query(q, [authAlumni.id, parseInt(limit), parseInt(offset)]);
    const rows = msgsRes.rows || [];

    // Build a map of partnerId -> last message
    const convMap = new Map();
    for (const r of rows) {
      const partnerId = r.sender_id === authAlumni.id ? r.receiver_id : r.sender_id;
      if (!convMap.has(partnerId)) {
        convMap.set(partnerId, r);
      }
    }

    // Build response entries including partner's user_id for client lookups
    const conversations = [];
    for (const [partnerAlumniId, lastMsg] of convMap.entries()) {
      // fetch partner's profile to get user_id
      const partnerProfile = await AlumniProfile.findById(partnerAlumniId);
      const partnerName = partnerProfile ? `${partnerProfile.first_name || ''} ${partnerProfile.last_name || ''}`.trim() : null;
      conversations.push({
        partnerAlumniId,
        partnerUserId: partnerProfile ? partnerProfile.user_id : null,
        partnerName: partnerName || partnerProfile?.display_name || null,
        partnerAvatar: partnerProfile ? partnerProfile.profile_picture_url : null,
        lastMessage: lastMsg,
      });
    }

    res.json({ success: true, data: conversations, pagination: { current: parseInt(page), total: conversations.length, count: conversations.length, totalRecords: conversations.length } });
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching messages",
    });
  }
});

/**
 * @route   GET /api/messages/conversation/:userId
 * @desc    Get conversation with specific user
 * @access  Private
 */
router.get("/conversation/:userId", authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    // Resolve authenticated user -> alumni_profiles.id
    const authAlumni = await AlumniProfile.findByUserId(req.user.id);
    if (!authAlumni) {
      return res.status(400).json({ success: false, message: 'Authenticated user has no alumni profile' });
    }

    // Resolve target: allow either alumni_profiles.id or users.id (userId param)
    let targetAlumni = null;
    // try as alumni_profiles.id
    targetAlumni = await AlumniProfile.findById(userId);
    if (!targetAlumni) {
      // try as users.id -> find by user_id
      targetAlumni = await AlumniProfile.findByUserId(userId);
    }

    if (!targetAlumni) {
      // no conversation if target has no alumni profile
      return res.json({ success: true, data: [], pagination: { current: parseInt(page), total: 0, count: 0, totalRecords: 0 } });
    }

    const messages = await Message.findConversationBetween(authAlumni.id, targetAlumni.id, { limit: parseInt(limit), offset: parseInt(offset) });

    // Enrich messages with sender_user_id and receiver_user_id (users.id) to help clients fetch public keys
    const enriched = [];
    for (const m of messages) {
      try {
        const senderProfile = await AlumniProfile.findById(m.sender_id);
        const receiverProfile = await AlumniProfile.findById(m.receiver_id);
        enriched.push({
          ...m,
          sender_user_id: senderProfile ? senderProfile.user_id : null,
          receiver_user_id: receiverProfile ? receiverProfile.user_id : null,
          sender_name: senderProfile ? `${senderProfile.first_name || ''} ${senderProfile.last_name || ''}`.trim() : null,
          receiver_name: receiverProfile ? `${receiverProfile.first_name || ''} ${receiverProfile.last_name || ''}`.trim() : null,
          sender_avatar: senderProfile ? senderProfile.profile_picture_url : null,
          receiver_avatar: receiverProfile ? receiverProfile.profile_picture_url : null,
        });
      } catch (e) {
        enriched.push({ ...m, sender_user_id: null, receiver_user_id: null });
      }
    }

    res.json({
      success: true,
      data: enriched,
      pagination: {
        current: parseInt(page),
        total: 0,
        count: enriched.length,
        totalRecords: 0,
      },
    });
  } catch (error) {
    console.error("Get conversation error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching conversation",
    });
  }
});

/**
 * @route   POST /api/messages/send
 * @desc    Send a message
 * @access  Private
 */
router.post("/send", authenticate, async (req, res) => {
  try {
    const { receiverId, content, messageType = "text" } = req.body;

    if (!receiverId || !content) {
      return res.status(400).json({
        success: false,
        message: "Receiver ID and content are required",
      });
    }

    const record = await Message.create({ sender_id: req.user.id, receiver_id: receiverId, content, message_type: messageType });

    res.status(201).json({
      success: true,
      data: record,
      message: "Message saved",
    });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while sending message",
    });
  }
});

/**
 * @route   PUT /api/messages/:id/read
 * @desc    Mark message as read
 * @access  Private
 */
router.put("/:id/read", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    // Mark message as read only if receiver
    // Simple update using updateMany helper
    const { updateMany } = require('../utils/sqlHelpers');
    const updated = await updateMany('messages', { is_read: true, read_at: new Date() }, { id, receiver_id: req.user?.id });
    if (updated.length === 0) {
      return res.status(404).json({ success: false, message: 'Message not found or not permitted' });
    }
    res.json({ success: true, data: updated[0], message: 'Message marked as read' });
  } catch (error) {
    console.error("Mark message as read error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while marking message as read",
    });
  }
});

/**
 * @route   DELETE /api/messages/:id
 * @desc    Delete a message
 * @access  Private
 */
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { deleteMany } = require('../utils/sqlHelpers');
    const deletedCount = await deleteMany('messages', { id, sender_id: req.user?.id });
    if (deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Message not found or not permitted' });
    }
    res.json({ success: true, message: 'Message deleted successfully' });
  } catch (error) {
    console.error("Delete message error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting message",
    });
  }
});

/**
 * @route   GET /api/messages/unread/count
 * @desc    Get unread messages count
 * @access  Private
 */
router.get("/unread/count", authenticate, async (req, res) => {
  try {
    const { count } = require('../utils/sqlHelpers');
    const unreadCount = await count('messages', { receiver_id: req.user?.id, is_read: false });

    res.json({
      success: true,
      data: {
        unreadCount,
      },
    });
  } catch (error) {
    console.error("Get unread count error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching unread count",
    });
  }
});

/**
 * @route   POST /api/messages/conversation/:userId/start
 * @desc    Start a new conversation
 * @access  Private
 */
router.post("/conversation/:userId/start", authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const { initialMessage } = req.body;
    // Create initial message if provided
    if (initialMessage) {
      await Message.create({ sender_id: req.user.id, receiver_id: userId, content: initialMessage, message_type: 'text' });
    }
    res.status(201).json({ success: true, message: 'Conversation started' });
  } catch (error) {
    console.error("Start conversation error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while starting conversation",
    });
  }
});

/**
 * Public Keys endpoints for E2E
 */
router.post('/public-key', authenticate, async (req, res) => {
  try {
    const { publicKey } = req.body;
    if (!publicKey) {
      return res.status(400).json({ success: false, message: 'publicKey required' });
    }
    const record = await PublicKey.upsert(req.user.id, publicKey);
    res.json({ success: true, data: record });
  } catch (err) {
    console.error('public-key save error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/public-key/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const record = await PublicKey.findByUserId(userId);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Public key not found' });
    }
    res.json({ success: true, data: record });
  } catch (err) {
    console.error('public-key fetch error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

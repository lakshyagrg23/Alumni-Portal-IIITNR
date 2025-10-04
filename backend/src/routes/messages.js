const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const Message = require("../models/Message");
const PublicKey = require("../models/PublicKey");

/**
 * @route   GET /api/messages
 * @desc    Get user's messages/conversations
 * @access  Private
 */
router.get("/", authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

  // Build a simple conversations list (other user + last message preview)
  // Note: For now return empty array or a placeholder. Conversation model can be added later.
  const conversations = [];

    res.json({
      success: true,
      data: conversations,
      pagination: {
        current: parseInt(page),
        total: 0,
        count: conversations.length,
        totalRecords: 0,
      },
    });
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
    const messages = await Message.findConversationBetween(req.user.id, userId, { limit: parseInt(limit), offset: parseInt(offset) });

    res.json({
      success: true,
      data: messages,
      pagination: {
        current: parseInt(page),
        total: 0,
        count: messages.length,
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

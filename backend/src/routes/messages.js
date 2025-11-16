import express from "express";
const router = express.Router();
import { authenticate } from "../middleware/auth.js";
import Message from "../models/Message.js";
import PublicKey from "../models/PublicKey.js";
import AlumniProfile from "../models/AlumniProfile.js";
import { updateMany, deleteMany, count } from "../utils/sqlHelpers.js";
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Attachment upload (basic). Files stored under /uploads/messages.
const attachmentsDir = path.join(process.cwd(), 'uploads', 'messages');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try { fs.mkdirSync(attachmentsDir, { recursive: true }); } catch {}
    cb(null, attachmentsDir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '';
    cb(null, unique + ext);
  }
});
const allowedTypes = new Set([
  'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf'
]);
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    try {
      // Basic MIME whitelist check
      if (!allowedTypes.has(file.mimetype)) {
        return cb(new Error('Unsupported file type. Allowed: PNG, JPEG, GIF, WEBP, PDF'));
      }
      // Extension sanity check (prevent disguised executables)
      const lower = file.originalname.toLowerCase();
      const forbiddenExt = ['.exe','.bat','.cmd','.com','.js','.msi','.vbs','.ps1'];
      if (forbiddenExt.some(ext => lower.endsWith(ext))) {
        return cb(new Error('Forbidden file extension'));
      }
      // Double extension pattern (e.g., image.jpg.exe)
      if (/\.(png|jpe?g|gif|webp|pdf)\.[a-z0-9]{2,4}$/.test(lower)) {
        return cb(new Error('Suspicious double extension'));
      }
      cb(null, true);
    } catch (e) {
      cb(new Error('File validation error'));
    }
  }
});

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

    // Query for conversations with latest message per conversation partner
    const q = `
      WITH conversation_partners AS (
        SELECT DISTINCT 
          CASE 
            WHEN sender_id = $1 THEN receiver_id 
            ELSE sender_id 
          END as partner_id
        FROM messages 
        WHERE sender_id = $1 OR receiver_id = $1
      ),
      latest_messages AS (
        SELECT 
          cp.partner_id,
          m.*,
          ROW_NUMBER() OVER (PARTITION BY cp.partner_id ORDER BY m.sent_at DESC) as rn
        FROM conversation_partners cp
        JOIN messages m ON (
          (m.sender_id = $1 AND m.receiver_id = cp.partner_id) OR 
          (m.receiver_id = $1 AND m.sender_id = cp.partner_id)
        )
      )
      SELECT * FROM latest_messages WHERE rn = 1
      ORDER BY sent_at DESC
      LIMIT $2 OFFSET $3
    `;
    const { query } = await import('../config/database.js');
    const msgsRes = await query(q, [authAlumni.id, parseInt(limit), parseInt(offset)]);
    const rows = msgsRes.rows || [];

    // Build conversation map with partner info
    const convMap = new Map();
    for (const r of rows) {
      if (!convMap.has(r.partner_id)) {
        convMap.set(r.partner_id, r);
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
        partnerName: partnerName || partnerProfile?.display_name || `User ${partnerProfile?.user_id || partnerAlumniId}`,
        partnerAvatar: partnerProfile ? partnerProfile.profile_picture_url : null,
        lastMessage: {
          ...lastMsg,
          isOutgoing: lastMsg.sender_id === authAlumni.id
        },
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

    // Resolve sender: authenticated user -> alumni_profiles.id
    const senderAlumni = await AlumniProfile.findByUserId(req.user.id);
    if (!senderAlumni) {
      return res.status(400).json({
        success: false,
        message: "Sender has no alumni profile",
      });
    }

    // Resolve receiver: allow either alumni_profiles.id or users.id
    let receiverAlumni = await AlumniProfile.findById(receiverId);
    if (!receiverAlumni) {
      receiverAlumni = await AlumniProfile.findByUserId(receiverId);
    }
    
    if (!receiverAlumni) {
      return res.status(400).json({
        success: false,
        message: "Receiver not found or has no alumni profile",
      });
    }

    // Prevent self-messaging at application level (also enforced by DB constraint)
    if (senderAlumni.id === receiverAlumni.id) {
      return res.status(400).json({
        success: false,
        message: "Cannot send message to yourself",
      });
    }

    const record = await Message.create({ 
      sender_id: senderAlumni.id, 
      receiver_id: receiverAlumni.id, 
      content, 
      message_type: messageType 
    });

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
 * @route POST /api/messages/upload
 * @desc  Upload an attachment (returns URL & metadata). Content encryption done client-side in message.
 * @access Private
 */
router.post('/upload', authenticate, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message || 'Upload failed' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided' });
    }
    const url = `/uploads/messages/${req.file.filename}`; // served by existing static handler
    res.json({
      success: true,
      data: {
        url,
        name: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size
      }
    });
  });
});

/**
 * @route   PUT /api/messages/:id/read
 * @desc    Mark message as read
 * @access  Private
 */
router.put("/:id/read", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    // Resolve authenticated user -> alumni_profiles.id
    const receiverAlumni = await AlumniProfile.findByUserId(req.user.id);
    if (!receiverAlumni) {
      return res.status(400).json({ success: false, message: 'User has no alumni profile' });
    }
    const updated = await updateMany('messages', { is_read: true, read_at: new Date() }, { id, receiver_id: receiverAlumni.id });
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
    // Resolve authenticated user -> alumni_profiles.id
    const senderAlumni = await AlumniProfile.findByUserId(req.user.id);
    if (!senderAlumni) {
      return res.status(400).json({ success: false, message: 'User has no alumni profile' });
    }
    const deletedCount = await deleteMany('messages', { id, sender_id: senderAlumni.id });
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
    // Resolve authenticated user -> alumni_profiles.id
    const receiverAlumni = await AlumniProfile.findByUserId(req.user.id);
    if (!receiverAlumni) {
      return res.json({ success: true, data: { unreadCount: 0 } });
    }
    const unreadCount = await count('messages', { receiver_id: receiverAlumni.id, is_read: false });

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
 * @route   GET /api/messages/unread/by-conversation
 * @desc    Get unread counts grouped by conversation partner (sender)
 * @access  Private
 */
router.get('/unread/by-conversation', authenticate, async (req, res) => {
  try {
    const receiverAlumni = await AlumniProfile.findByUserId(req.user.id);
    if (!receiverAlumni) {
      return res.json({ success: true, data: [] });
    }
    const { query } = await import('../config/database.js');
    const sql = `
      SELECT m.sender_id AS partner_alumni_id, COUNT(*) AS unread_count
      FROM messages m
      WHERE m.receiver_id = $1 AND m.is_read = false
      GROUP BY m.sender_id
    `;
    const result = await query(sql, [receiverAlumni.id]);
    const rows = result.rows || [];
    const enriched = [];
    for (const r of rows) {
      const partnerProfile = await AlumniProfile.findById(r.partner_alumni_id);
      enriched.push({
        partnerAlumniId: r.partner_alumni_id,
        partnerUserId: partnerProfile ? partnerProfile.user_id : null,
        unreadCount: parseInt(r.unread_count, 10)
      });
    }
    res.json({ success: true, data: enriched });
  } catch (error) {
    console.error('Get unread by conversation error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching unread counts' });
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
    
    // Resolve sender: authenticated user -> alumni_profiles.id
    const senderAlumni = await AlumniProfile.findByUserId(req.user.id);
    if (!senderAlumni) {
      return res.status(400).json({
        success: false,
        message: "Sender has no alumni profile",
      });
    }
    
    // Resolve receiver: allow either alumni_profiles.id or users.id
    let receiverAlumni = await AlumniProfile.findById(userId);
    if (!receiverAlumni) {
      receiverAlumni = await AlumniProfile.findByUserId(userId);
    }
    
    if (!receiverAlumni) {
      return res.status(400).json({
        success: false,
        message: "Receiver not found or has no alumni profile",
      });
    }
    
    // Prevent self-conversation
    if (senderAlumni.id === receiverAlumni.id) {
      return res.status(400).json({
        success: false,
        message: "Cannot start conversation with yourself",
      });
    }
    
    // Create initial message if provided
    if (initialMessage) {
      await Message.create({ 
        sender_id: senderAlumni.id, 
        receiver_id: receiverAlumni.id, 
        content: initialMessage, 
        message_type: 'text' 
      });
    }
    
    res.status(201).json({ 
      success: true, 
      message: 'Conversation started' 
    });
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

export default router;

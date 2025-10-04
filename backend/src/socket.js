const jwt = require('jsonwebtoken');
const MessageModel = require('./models/Message');
const PublicKeyModel = require('./models/PublicKey');

/**
 * Socket.io handlers for real-time messaging with minimal E2E support.
 * Clients are expected to send JWT in the `token` query param when connecting.
 */
module.exports = function (io) {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = { id: decoded.userId };
      return next();
    } catch (err) {
      return next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;
    console.log(`Socket connected: ${socket.id} for user ${userId}`);

    // Join a personal room for the user
    socket.join(`user:${userId}`);

    // Handle sending encrypted message payloads
    socket.on('secure:send', async (payload) => {
      // payload: { toUserId, ciphertext, metadata }
      try {
        const { toUserId, ciphertext, metadata } = payload;
        if (!toUserId || !ciphertext) {
          return;
        }

        // Persist the message (server stores ciphertext only)
        const saved = await MessageModel.create({
          sender_id: userId,
          receiver_id: toUserId,
          content: ciphertext,
          message_type: metadata?.messageType || 'text',
        });

        // Emit to recipient if online
        io.to(`user:${toUserId}`).emit('secure:receive', {
          id: saved.id,
          from: userId,
          ciphertext,
          metadata,
          sent_at: saved.sent_at,
        });

        // Acknowledge sender
        socket.emit('secure:sent', { id: saved.id, to: toUserId });
      } catch (err) {
        console.error('secure:send error', err);
        socket.emit('secure:error', { message: 'Failed to send message' });
      }
    });

    // Save public key for E2E
    socket.on('publickey:publish', async ({ publicKey }) => {
      try {
        if (!publicKey) {
          return;
        }
        await PublicKeyModel.upsert(socket.user.id, publicKey);
        socket.emit('publickey:published', { success: true });
      } catch (err) {
        console.error('publickey publish error', err);
        socket.emit('publickey:error', { message: 'Failed to save public key' });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${socket.id} reason=${reason}`);
    });
  });
};

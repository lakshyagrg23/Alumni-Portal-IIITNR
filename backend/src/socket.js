import jwt from 'jsonwebtoken';
import MessageModel from './models/Message.js';
import PublicKeyModel from './models/PublicKey.js';
import AlumniProfile from './models/AlumniProfile.js';

/**
 * Socket.io handlers for real-time messaging with minimal E2E support.
 * Clients are expected to send JWT in the `token` query param when connecting.
 */
export default function (io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = { id: decoded.userId };

      // Try to resolve the alumni_profile for this authenticated user (may be null)
      try {
        const profile = await AlumniProfile.findByUserId(decoded.userId);
        socket.alumniId = profile ? profile.id : null;
      } catch (err) {
        // Non-fatal — leave alumniId null
        socket.alumniId = null;
      }

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
        const { toUserId, ciphertext, metadata } = payload || {};
        if (!toUserId || !ciphertext) {
          return;
        }

        // Ensure sender has an alumni profile (messages table FK references alumni_profiles.id)
        if (!socket.alumniId) {
          socket.emit('secure:error', { message: 'Sender has no alumni profile; cannot send messages' });
          return;
        }

        // Resolve recipient: allow either an alumni_profiles.id or a users.id
        const resolveAlumni = async (candidateId) => {
          // Try as alumni_profiles.id
          const byProfile = await AlumniProfile.findById(candidateId);
          if (byProfile) return { alumniId: byProfile.id, userId: byProfile.user_id };

          // Try as users.id -> find profile by user_id
          const byUser = await AlumniProfile.findByUserId(candidateId);
          if (byUser) return { alumniId: byUser.id, userId: byUser.user_id };

          return null;
        };

        const recipient = await resolveAlumni(toUserId);
        if (!recipient) {
          socket.emit('secure:error', { message: 'Recipient not found' });
          return;
        }

        // Try fetching sender and receiver public keys (may be null)
        let senderPublicKey = null;
        let receiverPublicKey = null;
        try {
          const pkRec = await PublicKeyModel.findByUserId(socket.user.id);
          senderPublicKey = pkRec ? pkRec.public_key : null;
        } catch (e) {
          senderPublicKey = null;
        }
        try {
          const recPk = await PublicKeyModel.findByUserId(recipient.userId);
          receiverPublicKey = recPk ? recPk.public_key : null;
        } catch (e) {
          receiverPublicKey = null;
        }

        // Get sender and receiver profile names for frontend display
        const senderProfile = await AlumniProfile.findById(socket.alumniId);
        const receiverProfile = await AlumniProfile.findById(recipient.alumniId);
        
        const senderName = senderProfile ? `${senderProfile.first_name || ''} ${senderProfile.last_name || ''}`.trim() : null;
        const receiverName = receiverProfile ? `${receiverProfile.first_name || ''} ${receiverProfile.last_name || ''}`.trim() : null;

        // Persist the message (server stores ciphertext only), include any available public-key snapshots
        const savedMessage = await MessageModel.create({
          sender_id: socket.alumniId,
          receiver_id: recipient.alumniId,
          content: ciphertext,
          iv: metadata?.iv || null,
          client_id: metadata?.clientId || payload?.clientId || null,
          message_type: metadata?.messageType || 'text',
          sender_public_key: senderPublicKey || null,
          receiver_public_key: receiverPublicKey || null,
        });

        const clientId = metadata?.clientId || payload?.clientId || null;

        // Enrich message with sender/receiver info for frontend
        const enrichedMessage = {
          ...savedMessage,
          sender_user_id: socket.user.id,
          receiver_user_id: recipient.userId,
          sender_name: senderName,
          receiver_name: receiverName,
          sender_avatar: senderProfile?.profile_picture_url || null,
          receiver_avatar: receiverProfile?.profile_picture_url || null,
        };

        // Emit to recipient if online (their sockets are joined to room `user:<userId>`)
        io.to(`user:${recipient.userId}`).emit('secure:receive', {
          from: socket.user.id,
          alumniFrom: socket.alumniId,
          message: enrichedMessage,
          clientId,
        });

        // Acknowledge sender
        socket.emit('secure:sent', { clientId, message: enrichedMessage });
      } catch (err) {
        console.error('❌ secure:send error:', err);
        console.error('Error details:', {
          message: err.message,
          stack: err.stack,
          toUserId: payload?.toUserId,
          senderAlumniId: socket.alumniId,
          senderUserId: socket.user.id
        });
        socket.emit('secure:error', { message: 'Failed to send message', details: err.message });
      }
    });
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
}

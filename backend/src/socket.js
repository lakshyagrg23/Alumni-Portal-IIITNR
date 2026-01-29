import jwt from 'jsonwebtoken';
import MessageModel from './models/Message.js';
import PublicKeyModel from './models/PublicKey.js';
import AlumniProfile from './models/AlumniProfile.js';
import emailService from './services/emailService.js';
import { query } from './config/database.js';

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

        // CRITICAL FIX: Dynamically fetch alumni profile if not cached
        // This handles cases where socket connected before profile was created (e.g., during onboarding)
        let senderAlumniId = socket.alumniId;
        if (!senderAlumniId) {
          try {
            const profile = await AlumniProfile.findByUserId(socket.user.id);
            if (profile) {
              senderAlumniId = profile.id;
              socket.alumniId = profile.id; // Update cache for future messages
            }
          } catch (err) {
            console.error('Error fetching sender alumni profile:', err);
          }
        }

        // Ensure sender has an alumni profile (messages table FK references alumni_profiles.id)
        if (!senderAlumniId) {
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
        const senderProfile = await AlumniProfile.findById(senderAlumniId);
        const receiverProfile = await AlumniProfile.findById(recipient.alumniId);
        
        const senderName = senderProfile ? `${senderProfile.first_name || ''} ${senderProfile.last_name || ''}`.trim() : null;
        const receiverName = receiverProfile ? `${receiverProfile.first_name || ''} ${receiverProfile.last_name || ''}`.trim() : null;

        // Persist the message (server stores ciphertext only), include any available public-key snapshots
        const savedMessage = await MessageModel.create({
          sender_id: senderAlumniId,
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
          alumniFrom: senderAlumniId,
          message: enrichedMessage,
          clientId,
        });

        // CRITICAL FIX: Also emit to all sender's devices (except the current socket)
        // This ensures cross-device synchronization for the sender
        socket.to(`user:${socket.user.id}`).emit('secure:receive', {
          from: socket.user.id,
          alumniFrom: senderAlumniId,
          message: enrichedMessage,
          clientId,
        });

        // Acknowledge sender
        socket.emit('secure:sent', { clientId, message: enrichedMessage });

        // Send email notification to recipient (async, non-blocking)
        // Only send if recipient is not currently connected (to avoid spam)
        try {
          const recipientSockets = await io.in(`user:${recipient.userId}`).fetchSockets();
          const recipientIsOnline = recipientSockets.length > 0;
          
          if (!recipientIsOnline) {
            // Fetch recipient's email from users table
            const userResult = await query('SELECT email FROM users WHERE id = $1', [recipient.userId]);
            if (userResult.rows && userResult.rows.length > 0) {
              const recipientEmail = userResult.rows[0].email;
              const recipientDisplayName = receiverName || 'there';
              const senderDisplayName = senderName || 'Someone';
              
              // Send notification email asynchronously (don't await - fire and forget)
              emailService.sendMessageNotification(
                recipientEmail,
                recipientDisplayName,
                senderDisplayName
              ).catch(err => {
                console.error('Failed to send message notification email:', err);
              });
              
              console.log(`📧 Email notification queued for ${recipientEmail}`);
            }
          } else {
            console.log(`⏭️ Recipient is online, skipping email notification`);
          }
        } catch (emailErr) {
          // Non-fatal - log but don't fail message delivery
          console.error('Error checking recipient status for email notification:', emailErr);
        }
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
    // Handle message deletion
    socket.on('message:delete', async ({ messageId, toUserId }) => {
      try {
        if (!messageId) {
          socket.emit('message:error', { message: 'Message ID required' });
          return;
        }

        // Fetch the message to verify ownership
        const message = await MessageModel.findById(messageId);
        if (!message) {
          socket.emit('message:error', { message: 'Message not found' });
          return;
        }

        // Get sender's alumni profile
        let senderAlumniId = socket.alumniId;
        if (!senderAlumniId) {
          const profile = await AlumniProfile.findByUserId(socket.user.id);
          senderAlumniId = profile?.id;
        }

        // Only sender can delete their message
        if (message.sender_id !== senderAlumniId) {
          socket.emit('message:error', { message: 'Unauthorized to delete this message' });
          return;
        }

        // Soft delete the message
        const deletedMessage = await MessageModel.softDelete(messageId, senderAlumniId);

        // Resolve recipient user ID
        const recipient = await AlumniProfile.findById(message.receiver_id);
        const recipientUserId = recipient?.user_id;

        // Notify recipient
        if (recipientUserId) {
          io.to(`user:${recipientUserId}`).emit('message:deleted', {
            messageId,
            deletedAt: deletedMessage.deleted_at,
          });
        }

        // Notify all sender's devices
        io.to(`user:${socket.user.id}`).emit('message:deleted', {
          messageId,
          deletedAt: deletedMessage.deleted_at,
        });

        socket.emit('message:delete:success', { messageId });
      } catch (err) {
        console.error('❌ message:delete error:', err);
        socket.emit('message:error', { message: 'Failed to delete message' });
      }
    });

    // Handle message editing
    socket.on('message:edit', async ({ messageId, newCiphertext, newIv, toUserId }) => {
      try {
        if (!messageId || !newCiphertext) {
          socket.emit('message:error', { message: 'Message ID and content required' });
          return;
        }

        // Fetch the message to verify ownership
        const message = await MessageModel.findById(messageId);
        if (!message) {
          socket.emit('message:error', { message: 'Message not found' });
          return;
        }

        // Get sender's alumni profile
        let senderAlumniId = socket.alumniId;
        if (!senderAlumniId) {
          const profile = await AlumniProfile.findByUserId(socket.user.id);
          senderAlumniId = profile?.id;
        }

        // Only sender can edit their message
        if (message.sender_id !== senderAlumniId) {
          socket.emit('message:error', { message: 'Unauthorized to edit this message' });
          return;
        }

        // Don't allow editing deleted messages
        if (message.is_deleted) {
          socket.emit('message:error', { message: 'Cannot edit deleted message' });
          return;
        }

        // Update the message
        const updatedMessage = await MessageModel.updateContent(messageId, newCiphertext, newIv);

        // Get sender and receiver profile names
        const senderProfile = await AlumniProfile.findById(senderAlumniId);
        const receiverProfile = await AlumniProfile.findById(message.receiver_id);
        
        const senderName = senderProfile ? `${senderProfile.first_name || ''} ${senderProfile.last_name || ''}`.trim() : null;
        const receiverName = receiverProfile ? `${receiverProfile.first_name || ''} ${receiverProfile.last_name || ''}`.trim() : null;

        // Enrich message
        const enrichedMessage = {
          ...updatedMessage,
          sender_user_id: socket.user.id,
          receiver_user_id: receiverProfile?.user_id,
          sender_name: senderName,
          receiver_name: receiverName,
        };

        // Notify recipient
        if (receiverProfile?.user_id) {
          io.to(`user:${receiverProfile.user_id}`).emit('message:edited', {
            message: enrichedMessage,
          });
        }

        // Notify all sender's devices
        io.to(`user:${socket.user.id}`).emit('message:edited', {
          message: enrichedMessage,
        });

        socket.emit('message:edit:success', { message: enrichedMessage });
      } catch (err) {
        console.error('❌ message:edit error:', err);
        socket.emit('message:error', { message: 'Failed to edit message' });
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

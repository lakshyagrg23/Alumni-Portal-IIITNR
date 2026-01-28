import { insertOne, findMany, findOne, query } from '../utils/sqlHelpers.js';

class Message {
  static async create(data) {
    try {
      const record = await insertOne('messages', data);
      return record;
    } catch (err) {
      console.error('Message.create error. Payload:', data, 'Error:', err.message || err);
      throw err;
    }
  }

  static async findConversationBetween(userA, userB, { limit = 100, offset = 0 } = {}) {
    const q = `
      SELECT * FROM messages 
      WHERE ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1))
      ORDER BY sent_at ASC 
      LIMIT $3 OFFSET $4
    `;
    const values = [userA, userB, limit, offset];
    const res = await query(q, values);
    return res.rows;
  }

  static async findById(id) {
    return await findOne('messages', { id });
  }

  static async softDelete(messageId, deletedBy) {
    const q = `
      UPDATE messages 
      SET is_deleted = TRUE, deleted_at = CURRENT_TIMESTAMP, deleted_by = $2
      WHERE id = $1
      RETURNING *
    `;
    const res = await query(q, [messageId, deletedBy]);
    return res.rows[0];
  }

  static async updateContent(messageId, newContent, newIv) {
    const q = `
      UPDATE messages 
      SET 
        original_content = COALESCE(original_content, content),
        content = $2,
        iv = $3,
        is_edited = TRUE,
        edited_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const res = await query(q, [messageId, newContent, newIv]);
    return res.rows[0];
  }
}

export default Message;

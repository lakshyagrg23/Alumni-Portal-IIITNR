const { insertOne, findMany, findOne, query } = require('../utils/sqlHelpers');

class Message {
  static async create(data) {
    const record = await insertOne('messages', data);
    return record;
  }

  static async findConversationBetween(userA, userB, { limit = 100, offset = 0 } = {}) {
    const q = `SELECT * FROM messages WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1) ORDER BY sent_at ASC LIMIT $3 OFFSET $4`;
    const values = [userA, userB, limit, offset];
    const res = await query(q, values);
    return res.rows;
  }

  static async findById(id) {
    return await findOne('messages', { id });
  }
}

module.exports = Message;

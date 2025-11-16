import { findOne, updateMany, insertOne } from '../utils/sqlHelpers.js';

class PublicKey {
  static async findByUserId(userId) {
    return await findOne('public_keys', { user_id: userId });
  }

  static async upsert(userId, publicKey) {
    const existing = await this.findByUserId(userId);
    if (existing) {
      const updated = await updateMany('public_keys', { public_key: publicKey }, { user_id: userId });
      return updated[0];
    }
    return await insertOne('public_keys', { user_id: userId, public_key: publicKey });
  }
}

export default PublicKey;

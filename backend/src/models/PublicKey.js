import { findOne, updateMany, insertOne } from '../utils/sqlHelpers.js';

class PublicKey {
  static async findByUserId(userId) {
    return await findOne('public_keys', { user_id: userId });
  }

  static async upsert(userId, publicKey, encryptedPrivateKey = null) {
    const existing = await this.findByUserId(userId);
    const data = { public_key: publicKey };
    if (encryptedPrivateKey) {
      data.encrypted_private_key = encryptedPrivateKey;
    }
    if (existing) {
      const updated = await updateMany('public_keys', data, { user_id: userId });
      return updated[0];
    }
    return await insertOne('public_keys', { user_id: userId, ...data });
  }
}

export default PublicKey;

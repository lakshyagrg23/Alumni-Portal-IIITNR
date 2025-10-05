const {
  findOne,
  findMany,
  insertOne,
  updateMany,
  deleteMany,
  count,
  query,
  executeTransaction,
} = require("../utils/sqlHelpers");
const bcrypt = require("bcryptjs");

/**
 * User Model - SQL-based operations for users table
 */
class User {
  /**
   * Find user by ID
   * @param {string} id - User UUID
   * @returns {Promise<Object|null>}
   */
  static async findById(id) {
    return await findOne("users", { id });
  }

  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Promise<Object|null>}
   */
  static async findByEmail(email) {
    return await findOne("users", { email: email.toLowerCase() });
  }

  /**
   * Find user by provider ID (for OAuth)
   * @param {string} providerId - Provider ID
   * @param {string} provider - Provider name (google, etc.)
   * @returns {Promise<Object|null>}
   */
  static async findByProviderId(providerId, provider = "google") {
    return await findOne("users", { provider_id: providerId, provider });
  }

  /**
   * Create a new user
   * @param {Object} userData - User data
   * @returns {Promise<Object>}
   */
  static async create(userData) {
    const {
      email,
      password,
      provider = "local",
      providerId,
      role = "alumni",
      isApproved,
      is_approved,
      is_active = true,
    } = userData;

    const data = {
      email: email.toLowerCase(),
      provider,
      role,
      is_approved:
        isApproved !== undefined
          ? isApproved
          : is_approved !== undefined
            ? is_approved
            : this.isInstituteEmail(email),
      is_active,
      email_verified: provider !== "local", // OAuth users are pre-verified
    };

    // Add provider ID for OAuth users
    if (providerId) {
      data.provider_id = providerId;
    }

    // Hash password for local users
    if (password) {
      data.password_hash = await bcrypt.hash(password, 12);
    }

    return await insertOne("users", data);
  }

  /**
   * Update user
   * @param {string} id - User ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object|null>}
   */
  static async update(id, updateData) {
    const result = await updateMany("users", updateData, { id });
    return result[0] || null;
  }

  /**
   * Update password
   * @param {string} id - User ID
   * @param {string} newPassword - New password
   * @returns {Promise<Object|null>}
   */
  static async updatePassword(id, newPassword) {
    const passwordHash = await bcrypt.hash(newPassword, 12);
    return await this.update(id, { password_hash: passwordHash });
  }

  /**
   * Verify password
   * @param {string} password - Plain text password
   * @param {string} hashedPassword - Hashed password from database
   * @returns {Promise<boolean>}
   */
  static async verifyPassword(password, hashedPassword) {
    if (!hashedPassword) return false;
    return await bcrypt.compare(password, hashedPassword);
  }

  /**
   * Get all users with pagination
   * @param {Object} options - Query options
   * @returns {Promise<Object>}
   */
  static async findAll(options = {}) {
    const {
      page = 1,
      limit = 10,
      role,
      isApproved,
      orderBy = "created_at DESC",
    } = options;

    const offset = (page - 1) * limit;
    const where = {};

    if (role) where.role = role;
    if (isApproved !== undefined) where.is_approved = isApproved;

    const users = await findMany("users", {
      where,
      orderBy,
      limit,
      offset,
      columns:
        "id, email, role, is_approved, is_active, email_verified, provider, created_at, updated_at",
    });

    const total = await count("users", where);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get pending approval users
   * @returns {Promise<Array>}
   */
  static async getPendingApprovals() {
    return await findMany("users", {
      where: { is_approved: false },
      orderBy: "created_at ASC",
      columns: "id, email, role, provider, created_at",
    });
  }

  /**
   * Approve user
   * @param {string} id - User ID
   * @returns {Promise<Object|null>}
   */
  static async approve(id) {
    return await this.update(id, { is_approved: true });
  }

  /**
   * Deactivate user
   * @param {string} id - User ID
   * @returns {Promise<Object|null>}
   */
  static async deactivate(id) {
    return await this.update(id, { is_active: false });
  }

  /**
   * Delete user
   * @param {string} id - User ID
   * @returns {Promise<number>}
   */
  static async delete(id) {
    return await deleteMany("users", { id });
  }

  /**
   * Set email verification token
   * @param {string} id - User ID
   * @param {string} token - Verification token
   * @returns {Promise<Object|null>}
   */
  static async setEmailVerificationToken(id, token) {
    return await this.update(id, { email_verification_token: token });
  }

  /**
   * Set password reset token
   * @param {string} email - User email
   * @param {string} token - Reset token
   * @param {Date} expires - Token expiry
   * @returns {Promise<Object|null>}
   */
  static async setPasswordResetToken(email, token, expires) {
    const result = await updateMany(
      "users",
      {
        password_reset_token: token,
        password_reset_expires: expires,
      },
      { email: email.toLowerCase() }
    );

    return result[0] || null;
  }

  /**
   * Reset password with token
   * @param {string} token - Reset token
   * @param {string} newPassword - New password
   * @returns {Promise<Object|null>}
   */
  static async resetPassword(token, newPassword) {
    return await executeTransaction(async (client) => {
      // Find user with valid token
      const userQuery = `
        SELECT id FROM users 
        WHERE password_reset_token = $1 
        AND password_reset_expires > NOW()
      `;
      const userResult = await client.query(userQuery, [token]);

      if (userResult.rows.length === 0) {
        throw new Error("Invalid or expired reset token");
      }

      const userId = userResult.rows[0].id;
      const passwordHash = await bcrypt.hash(newPassword, 12);

      // Update password and clear reset token
      const updateQuery = `
        UPDATE users 
        SET password_hash = $1, 
            password_reset_token = NULL, 
            password_reset_expires = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING id, email, role, is_approved, is_active, email_verified, provider, created_at, updated_at
      `;

      const updateResult = await client.query(updateQuery, [
        passwordHash,
        userId,
      ]);
      return updateResult.rows[0];
    });
  }

  /**
   * Get user statistics
   * @returns {Promise<Object>}
   */
  static async getStats() {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE is_approved = true) as approved_users,
        COUNT(*) FILTER (WHERE is_approved = false) as pending_users,
        COUNT(*) FILTER (WHERE role = 'admin') as admin_users,
        COUNT(*) FILTER (WHERE role = 'alumni') as alumni_users,
        COUNT(*) FILTER (WHERE provider = 'local') as local_users,
        COUNT(*) FILTER (WHERE provider = 'google') as oauth_users
      FROM users
    `;

    const result = await query(statsQuery);
    return result.rows[0];
  }

  /**
   * Check if email is institute email
   * @param {string} email - Email to check
   * @returns {boolean}
   */
  static isInstituteEmail(email) {
    return email.toLowerCase().endsWith("@iiitnr.edu.in");
  }

  /**
   * Get user with profile information
   * @param {string} id - User ID
   * @returns {Promise<Object|null>}
   */
  static async findWithProfile(id) {
    const queryText = `
      SELECT 
        u.id,
        u.email,
        u.role,
        u.is_approved,
        u.is_active,
        u.email_verified,
        u.provider,
        u.created_at,
        u.updated_at,
        ap.id as profile_id,
        ap.first_name,
        ap.last_name,
        ap.profile_picture_url,
        ap.current_company,
        ap.current_position,
        ap.graduation_year,
        ap.branch
      FROM users u
      LEFT JOIN alumni_profiles ap ON u.id = ap.user_id
      WHERE u.id = $1
    `;

    const result = await query(queryText, [id]);
    return result.rows[0] || null;
  }

  /**
   * Generate and save email verification token
   * @param {string} userId - User ID
   * @returns {Promise<string>} - Verification token
   */
  static async generateVerificationToken(userId) {
    const { generateToken, generateTokenExpiry } = require('../utils/tokenUtils');
    
    const token = generateToken(32);
    const expires = generateTokenExpiry(24); // 24 hours
    
    await this.update(userId, {
      email_verification_token: token,
      email_verification_token_expires: expires,
    });
    
    return token;
  }

  /**
   * Verify email with token
   * @param {string} token - Verification token
   * @returns {Promise<Object>} - Result object with success status
   */
  static async verifyEmail(token) {
    const { isTokenExpired } = require('../utils/tokenUtils');
    
    // Find user with this token
    const result = await query(
      'SELECT * FROM users WHERE email_verification_token = $1',
      [token]
    );
    
    if (result.rows.length === 0) {
      return { success: false, message: 'Invalid verification token' };
    }
    
    const user = result.rows[0];
    
    // Check if token expired
    if (isTokenExpired(user.email_verification_token_expires)) {
      return { success: false, message: 'Verification token has expired' };
    }
    
    // Check if already verified
    if (user.email_verified) {
      return { success: false, message: 'Email already verified', alreadyVerified: true };
    }
    
    // Mark as verified and approved
    await query(
      `UPDATE users 
       SET email_verified = TRUE, 
           is_approved = TRUE,
           email_verification_token = NULL,
           email_verification_token_expires = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [user.id]
    );
    
    return { success: true, user };
  }
}

module.exports = User;

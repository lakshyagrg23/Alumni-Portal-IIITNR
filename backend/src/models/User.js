import bcrypt from "bcryptjs";
import {
  query,
  insertOne,
  updateMany,
  deleteMany,
  findOne,
  columnExists,
} from "../utils/sqlHelpers.js";
import {
  generateToken,
  generateTokenExpiry,
  isTokenExpired,
} from "../utils/tokenUtils.js";
import crypto from "crypto";

class User {
  static async findById(id) {
    return await findOne("users", { id });
  }

  static async findByEmail(email) {
    const res = await query(
      "SELECT * FROM users WHERE email = $1 LIMIT 1",
      [String(email || "").toLowerCase()]
    );
    return res.rows[0] || null;
  }

  static async create(data) {
    const email = (data.email || "").toLowerCase();

    let password_hash = data.password_hash || null;
    if (!password_hash && data.password) {
      const salt = await bcrypt.genSalt(10);
      password_hash = await bcrypt.hash(data.password, salt);
    }

    const provider = data.provider || "local";
    const provider_id = data.providerId || data.provider_id || null;
    const role = data.role || "alumni";

    // booleans: accept both camelCase and snake_case inputs
    let is_approved = data.is_approved;
    if (typeof is_approved === "undefined")
      is_approved = data.isApproved ?? false;
    let is_active = data.is_active;
    if (typeof is_active === "undefined") is_active = data.isActive ?? true;
    let email_verified = data.email_verified;
    if (typeof email_verified === "undefined")
      email_verified = data.emailVerified ?? false;

    // OAuth providers (Google) are auto-approved and email-verified
    // Local email/password registrations require manual admin approval after email verification
    if (provider === "google" || provider === "linkedin") {
      is_approved = true;
      email_verified = true;
    }

    const insertData = {
      email,
      password_hash,
      provider,
      provider_id,
      role,
      is_approved,
      is_active,
      email_verified,
      registration_path:
        data.registration_path ||
        (provider === "local" ? "institute_email" : "oauth"),
      institute_record_id: data.institute_record_id || null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    return await insertOne("users", insertData);
  }

  static async update(id, updateData = {}) {
    const db = {};

    if (updateData.email) db.email = updateData.email.toLowerCase();
    if (updateData.provider) db.provider = updateData.provider;
    if (updateData.providerId || updateData.provider_id)
      db.provider_id = updateData.providerId || updateData.provider_id;
    if (updateData.role) db.role = updateData.role;

    if (typeof updateData.is_approved !== "undefined")
      db.is_approved = updateData.is_approved;
    if (typeof updateData.isApproved !== "undefined")
      db.is_approved = updateData.isApproved;
    if (typeof updateData.is_active !== "undefined")
      db.is_active = updateData.is_active;
    if (typeof updateData.isActive !== "undefined")
      db.is_active = updateData.isActive;
    if (typeof updateData.email_verified !== "undefined")
      db.email_verified = updateData.email_verified;
    if (typeof updateData.emailVerified !== "undefined")
      db.email_verified = updateData.emailVerified;

    if (typeof updateData.email_verification_token !== "undefined")
      db.email_verification_token = updateData.email_verification_token;
    if (typeof updateData.emailVerificationToken !== "undefined")
      db.email_verification_token = updateData.emailVerificationToken;
    if (typeof updateData.email_verification_token_expires !== "undefined")
      db.email_verification_token_expires =
        updateData.email_verification_token_expires;
    if (typeof updateData.emailVerificationTokenExpires !== "undefined")
      db.email_verification_token_expires =
        updateData.emailVerificationTokenExpires;

    if (updateData.password) {
      const salt = await bcrypt.genSalt(10);
      db.password_hash = await bcrypt.hash(updateData.password, salt);
    }
    if (updateData.password_hash) db.password_hash = updateData.password_hash;

    db.updated_at = new Date();

    const rows = await updateMany("users", db, { id });
    return rows[0] || null;
  }

  static async delete(id) {
    const count = await deleteMany("users", { id });
    return count > 0;
  }

  /**
   * List users with basic filtering/pagination.
   * options: page, limit, role, isApproved, orderBy, orderDirection
   * returns: { users, pagination }
   */
  static async findAll(options = {}) {
    const {
      page = 1,
      limit = 20,
      role,
      isApproved,
      orderBy = "created_at",
      orderDirection = "DESC",
    } = options;
    const safeOrderFields = new Set([
      "created_at",
      "updated_at",
      "email",
      "role",
    ]);
    const safeDir =
      orderDirection && String(orderDirection).toUpperCase() === "ASC"
        ? "ASC"
        : "DESC";
    const orderField = safeOrderFields.has(orderBy) ? orderBy : "created_at";
    const conditions = [];
    const params = [];
    let idx = 1;
    if (role) {
      conditions.push(`role = $${idx++}`);
      params.push(role);
    }
    if (typeof isApproved === "boolean") {
      conditions.push(`is_approved = $${idx++}`);
      params.push(isApproved);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const countRes = await query(
      `SELECT COUNT(*)::int AS total FROM users ${where}`,
      params
    );
    const total = countRes.rows[0]?.total || 0;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const listRes = await query(
      `SELECT * FROM users ${where} ORDER BY ${orderField} ${safeDir} LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, parseInt(limit), offset]
    );
    return {
      users: listRes.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.max(1, Math.ceil(total / parseInt(limit))),
      },
    };
  }

  static async verifyPassword(plain, hash) {
    if (!hash) return false;
    return await bcrypt.compare(plain, hash);
  }

  static isInstituteEmail(email) {
    return email.toLowerCase().endsWith("@iiitnr.edu.in");
  }

  static async findWithProfile(id) {
    const queryText = `SELECT 
          u.id, u.email, u.role, u.is_approved, u.is_active, u.email_verified, u.provider, u.created_at, u.updated_at,
          ap.id as profile_id, ap.first_name, ap.last_name, ap.profile_picture_url, ap.current_company, ap.current_position,
          ap.graduation_year, ap.branch
        FROM users u LEFT JOIN alumni_profiles ap ON u.id = ap.user_id WHERE u.id = $1`;
    const result = await query(queryText, [id]);
    return result.rows[0] || null;
  }

  static async generateVerificationToken(userId) {
    const token = generateToken(32);
    const expires = generateTokenExpiry(24); // hours
    await this.update(userId, {
      email_verification_token: token,
      email_verification_token_expires: expires,
    });
    return token;
  }

  static async verifyEmail(token) {
    const result = await query(
      "SELECT * FROM users WHERE email_verification_token = $1",
      [token]
    );
    if (result.rows.length === 0)
      return { success: false, message: "Invalid verification token" };
    const user = result.rows[0];
    if (isTokenExpired(user.email_verification_token_expires))
      return { success: false, message: "Verification token has expired" };
    if (user.email_verified)
      return {
        success: false,
        message: "Email already verified",
        alreadyVerified: true,
      };
    await query(
      `UPDATE users SET email_verified = TRUE, is_approved = TRUE, email_verification_token = NULL, email_verification_token_expires = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [user.id]
    );
    return { success: true, user };
  }

  static async getStats() {
    const statsQuery = `SELECT 
          COUNT(*) as total_users,
          COUNT(*) FILTER (WHERE is_approved = true) as approved_users,
          COUNT(*) FILTER (WHERE is_approved = false) as pending_users,
          COUNT(*) FILTER (WHERE role = 'admin') as admin_users,
          COUNT(*) FILTER (WHERE role = 'alumni') as alumni_users,
          COUNT(*) FILTER (WHERE provider = 'local') as local_users,
          COUNT(*) FILTER (WHERE provider = 'google') as oauth_users
        FROM users`;
    const result = await query(statsQuery);
    return result.rows[0];
  }

  /**
   * Mark onboarding as completed for a user.
   */
  static async markOnboardingComplete(userId) {
    const rows = await updateMany(
      "users",
      { onboarding_completed: true },
      { id: userId }
    );
    return rows[0] || null;
  }

  /**
   * Generate and persist a password reset token for a user.
   * Ensures required columns exist on users table.
   */
  static async generatePasswordResetToken(userId, expiresHours = 1) {
    // Ensure columns exist
    try {
      const hasToken = await columnExists('users', 'password_reset_token');
      if (!hasToken) {
        await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token TEXT");
      }
      const hasExpires = await columnExists('users', 'password_reset_token_expires');
      if (!hasExpires) {
        await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token_expires TIMESTAMP NULL");
      }
      const hasUsed = await columnExists('users', 'password_reset_token_used');
      if (!hasUsed) {
        await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token_used BOOLEAN DEFAULT FALSE");
      }
    } catch (e) {
      // continue; columns will error only once
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + (expiresHours * 60 * 60 * 1000));
    const rows = await updateMany('users', {
      password_reset_token: token,
      password_reset_token_expires: expires,
      password_reset_token_used: false,
    }, { id: userId });
    return rows[0] ? token : null;
  }

  /**
   * Reset a user's password by reset token.
   * Validates token, expiry, and single-use.
   */
  static async resetPasswordByToken(token, newPassword) {
    if (!token || !newPassword) return { success: false, message: 'Invalid request' };
    const res = await query(
      "SELECT * FROM users WHERE password_reset_token = $1 LIMIT 1",
      [token]
    );
    if (res.rows.length === 0) return { success: false, message: 'Invalid or used token' };
    const user = res.rows[0];
    if (user.password_reset_token_used) return { success: false, message: 'Token already used' };
    if (!user.password_reset_token_expires) return { success: false, message: 'Invalid token' };
    if (isTokenExpired(user.password_reset_token_expires)) return { success: false, message: 'Reset token has expired' };

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(newPassword, salt);
    await query(
      `UPDATE users SET password_hash=$1, password_reset_token=NULL, password_reset_token_expires=NULL, password_reset_token_used=TRUE, updated_at=CURRENT_TIMESTAMP WHERE id=$2`,
      [password_hash, user.id]
    );
    return { success: true, userId: user.id };
  }
}
export default User;

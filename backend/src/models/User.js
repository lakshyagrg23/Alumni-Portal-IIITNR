<<<<<<< HEAD
import bcrypt from 'bcryptjs';
import { query, insertOne, updateMany, deleteMany, findOne } from '../utils/sqlHelpers.js';
import { generateToken, generateTokenExpiry, isTokenExpired } from '../utils/tokenUtils.js';

/**
 * SQL-based User Model compatible with existing routes/middleware.
 * Returns DB-native snake_case fields to match current usage.
 */
class User {
    static async findById(id) {
        return await findOne('users', { id });
    }

    static async findByEmail(email) {
        const res = await query('SELECT * FROM users WHERE LOWER(email)=LOWER($1) LIMIT 1', [email]);
        return res.rows[0] || null;
    }

    static async create(data) {
        const email = (data.email || '').toLowerCase();

        let password_hash = data.password_hash || null;
        if (!password_hash && data.password) {
            const salt = await bcrypt.genSalt(10);
            password_hash = await bcrypt.hash(data.password, salt);
        }

        const provider = data.provider || 'local';
        const provider_id = data.providerId || data.provider_id || null;
        const role = data.role || 'alumni';

        // booleans: accept both camelCase and snake_case inputs
        let is_approved = data.is_approved;
        if (typeof is_approved === 'undefined') is_approved = data.isApproved ?? false;
        let is_active = data.is_active;
        if (typeof is_active === 'undefined') is_active = data.isActive ?? true;
        let email_verified = data.email_verified;
        if (typeof email_verified === 'undefined') email_verified = data.emailVerified ?? false;

        // Auto-approve institute emails
        if (email.endsWith('@iiitnr.edu.in')) {
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
            created_at: new Date(),
            updated_at: new Date(),
        };

        const row = await insertOne('users', insertData);
        return row;
    }

    static async update(id, updateData = {}) {
        const db = {};

        if (updateData.email) db.email = updateData.email.toLowerCase();
        if (updateData.provider) db.provider = updateData.provider;
        if (updateData.providerId || updateData.provider_id) db.provider_id = updateData.providerId || updateData.provider_id;
        if (updateData.role) db.role = updateData.role;

        if (typeof updateData.is_approved !== 'undefined') db.is_approved = updateData.is_approved;
        if (typeof updateData.isApproved !== 'undefined') db.is_approved = updateData.isApproved;
        if (typeof updateData.is_active !== 'undefined') db.is_active = updateData.is_active;
        if (typeof updateData.isActive !== 'undefined') db.is_active = updateData.isActive;
        if (typeof updateData.email_verified !== 'undefined') db.email_verified = updateData.email_verified;
        if (typeof updateData.emailVerified !== 'undefined') db.email_verified = updateData.emailVerified;
        if (typeof updateData.onboarding_completed !== 'undefined') db.onboarding_completed = updateData.onboarding_completed;
        if (typeof updateData.onboardingCompleted !== 'undefined') db.onboarding_completed = updateData.onboardingCompleted;

        if (updateData.password) {
            const salt = await bcrypt.genSalt(10);
            db.password_hash = await bcrypt.hash(updateData.password, salt);
        }
        if (updateData.password_hash) db.password_hash = updateData.password_hash;

        db.updated_at = new Date();

        const rows = await updateMany('users', db, { id });
        return rows[0] || null;
    }

    static async delete(id) {
        const count = await deleteMany('users', { id });
        return count > 0;
    }

    /**
     * List users with basic filtering/pagination.
     * options: page, limit, role, isApproved, orderBy, orderDirection
     * returns: { users, pagination }
     */
    static async findAll(options = {}) {
        const { page = 1, limit = 20, role, isApproved, orderBy = 'created_at', orderDirection = 'DESC' } = options;
        const safeOrderFields = new Set(['created_at', 'updated_at', 'email', 'role']);
        const safeDir = orderDirection && String(orderDirection).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        const orderField = safeOrderFields.has(orderBy) ? orderBy : 'created_at';
        const conditions = [];
        const params = [];
        let idx = 1;
        if (role) { conditions.push(`role = $${idx++}`); params.push(role); }
        if (typeof isApproved === 'boolean') { conditions.push(`is_approved = $${idx++}`); params.push(isApproved); }
        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const countRes = await query(`SELECT COUNT(*)::int AS total FROM users ${where}`, params);
        const total = countRes.rows[0]?.total || 0;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const listRes = await query(
            `SELECT * FROM users ${where} ORDER BY ${orderField} ${safeDir} LIMIT $${idx} OFFSET $${idx + 1}`,
            [...params, parseInt(limit), offset]
        );
        return { users: listRes.rows, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.max(1, Math.ceil(total / parseInt(limit))) } };
    }

    static async verifyPassword(plain, hash) {
        if (!hash) return false;
        return await bcrypt.compare(plain, hash);
    }

    static isInstituteEmail(email) {
        return email.toLowerCase().endsWith('@iiitnr.edu.in');
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
        await this.update(userId, { email_verification_token: token, email_verification_token_expires: expires });
        return token;
    }

    static async verifyEmail(token) {
        const result = await query('SELECT * FROM users WHERE email_verification_token = $1', [token]);
        if (result.rows.length === 0) return { success: false, message: 'Invalid verification token' };
        const user = result.rows[0];
        if (isTokenExpired(user.email_verification_token_expires)) return { success: false, message: 'Verification token has expired' };
        if (user.email_verified) return { success: false, message: 'Email already verified', alreadyVerified: true };
        await query(`UPDATE users SET email_verified = TRUE, is_approved = TRUE, email_verification_token = NULL, email_verification_token_expires = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [user.id]);
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
     * Mark user onboarding as completed
     * @param {string} userId - User UUID
     * @returns {Promise<Object>}
     */
    static async markOnboardingComplete(userId) {
        await this.update(userId, { onboarding_completed: true });
        return await this.findById(userId);
    }

    /**
     * Check if user has completed onboarding
     * @param {string} userId - User UUID
     * @returns {Promise<boolean>}
     */
    static async hasCompletedOnboarding(userId) {
        const user = await this.findById(userId);
        return user ? user.onboarding_completed === true : false;
    }
}
export default User;
=======
import bcrypt from 'bcryptjs';
import { query, insertOne, updateMany, deleteMany, findOne } from '../utils/sqlHelpers.js';
import { generateToken, generateTokenExpiry, isTokenExpired } from '../utils/tokenUtils.js';

/**
 * SQL-based User Model compatible with existing routes/middleware.
 * Returns DB-native snake_case fields to match current usage.
 */
class User {
    static async findById(id) {
        return await findOne('users', { id });
    }

    static async findByEmail(email) {
        const res = await query('SELECT * FROM users WHERE LOWER(email)=LOWER($1) LIMIT 1', [email]);
        return res.rows[0] || null;
    }

    static async create(data) {
        const email = (data.email || '').toLowerCase();

        let password_hash = data.password_hash || null;
        if (!password_hash && data.password) {
            const salt = await bcrypt.genSalt(10);
            password_hash = await bcrypt.hash(data.password, salt);
        }

        const provider = data.provider || 'local';
        const provider_id = data.providerId || data.provider_id || null;
        const role = data.role || 'alumni';

        // booleans: accept both camelCase and snake_case inputs
        let is_approved = data.is_approved;
        if (typeof is_approved === 'undefined') is_approved = data.isApproved ?? false;
        let is_active = data.is_active;
        if (typeof is_active === 'undefined') is_active = data.isActive ?? true;
        let email_verified = data.email_verified;
        if (typeof email_verified === 'undefined') email_verified = data.emailVerified ?? false;

        // Auto-approve institute emails
        if (email.endsWith('@iiitnr.edu.in')) {
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
            created_at: new Date(),
            updated_at: new Date(),
        };

        const row = await insertOne('users', insertData);
        return row;
    }

    static async update(id, updateData = {}) {
        const db = {};

        if (updateData.email) db.email = updateData.email.toLowerCase();
        if (updateData.provider) db.provider = updateData.provider;
        if (updateData.providerId || updateData.provider_id) db.provider_id = updateData.providerId || updateData.provider_id;
        if (updateData.role) db.role = updateData.role;

        if (typeof updateData.is_approved !== 'undefined') db.is_approved = updateData.is_approved;
        if (typeof updateData.isApproved !== 'undefined') db.is_approved = updateData.isApproved;
        if (typeof updateData.is_active !== 'undefined') db.is_active = updateData.is_active;
        if (typeof updateData.isActive !== 'undefined') db.is_active = updateData.isActive;
        if (typeof updateData.email_verified !== 'undefined') db.email_verified = updateData.email_verified;
        if (typeof updateData.emailVerified !== 'undefined') db.email_verified = updateData.emailVerified;

        if (typeof updateData.email_verification_token !== 'undefined') db.email_verification_token = updateData.email_verification_token;
        if (typeof updateData.emailVerificationToken !== 'undefined') db.email_verification_token = updateData.emailVerificationToken;
        if (typeof updateData.email_verification_token_expires !== 'undefined') db.email_verification_token_expires = updateData.email_verification_token_expires;
        if (typeof updateData.emailVerificationTokenExpires !== 'undefined') db.email_verification_token_expires = updateData.emailVerificationTokenExpires;

        if (updateData.password) {
            const salt = await bcrypt.genSalt(10);
            db.password_hash = await bcrypt.hash(updateData.password, salt);
        }
        if (updateData.password_hash) db.password_hash = updateData.password_hash;

        db.updated_at = new Date();

        const rows = await updateMany('users', db, { id });
        return rows[0] || null;
    }

    static async delete(id) {
        const count = await deleteMany('users', { id });
        return count > 0;
    }

    /**
     * List users with basic filtering/pagination.
     * options: page, limit, role, isApproved, orderBy, orderDirection
     * returns: { users, pagination }
     */
    static async findAll(options = {}) {
        const { page = 1, limit = 20, role, isApproved, orderBy = 'created_at', orderDirection = 'DESC' } = options;
        const safeOrderFields = new Set(['created_at', 'updated_at', 'email', 'role']);
        const safeDir = orderDirection && String(orderDirection).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        const orderField = safeOrderFields.has(orderBy) ? orderBy : 'created_at';
        const conditions = [];
        const params = [];
        let idx = 1;
        if (role) { conditions.push(`role = $${idx++}`); params.push(role); }
        if (typeof isApproved === 'boolean') { conditions.push(`is_approved = $${idx++}`); params.push(isApproved); }
        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const countRes = await query(`SELECT COUNT(*)::int AS total FROM users ${where}`, params);
        const total = countRes.rows[0]?.total || 0;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const listRes = await query(
            `SELECT * FROM users ${where} ORDER BY ${orderField} ${safeDir} LIMIT $${idx} OFFSET $${idx + 1}`,
            [...params, parseInt(limit), offset]
        );
        return { users: listRes.rows, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.max(1, Math.ceil(total / parseInt(limit))) } };
    }

    static async verifyPassword(plain, hash) {
        if (!hash) return false;
        return await bcrypt.compare(plain, hash);
    }

    static isInstituteEmail(email) {
        return email.toLowerCase().endsWith('@iiitnr.edu.in');
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
        await this.update(userId, { email_verification_token: token, email_verification_token_expires: expires });
        return token;
    }

    static async verifyEmail(token) {
        const result = await query('SELECT * FROM users WHERE email_verification_token = $1', [token]);
        if (result.rows.length === 0) return { success: false, message: 'Invalid verification token' };
        const user = result.rows[0];
        if (isTokenExpired(user.email_verification_token_expires)) return { success: false, message: 'Verification token has expired' };
        if (user.email_verified) return { success: false, message: 'Email already verified', alreadyVerified: true };
        await query(`UPDATE users SET email_verified = TRUE, is_approved = TRUE, email_verification_token = NULL, email_verification_token_expires = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [user.id]);
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
}
export default User;
>>>>>>> 443f42c9a4984703593db4ff0d44da6888178ac8

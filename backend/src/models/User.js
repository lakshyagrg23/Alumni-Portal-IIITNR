import bcrypt from 'bcryptjs';
import { query, insertOne, updateMany, deleteMany, findOne } from '../utils/sqlHelpers.js';

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
        const {
            page = 1,
            limit = 20,
            role,
            isApproved,
            orderBy = 'created_at',
            orderDirection = 'DESC',
        } = options;

        const safeOrderFields = new Set(['created_at', 'updated_at', 'email', 'role']);
        const safeDir = orderDirection && String(orderDirection).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        const orderField = safeOrderFields.has(orderBy) ? orderBy : 'created_at';

        const conditions = [];
        const params = [];
        let idx = 1;

        if (role) {
            conditions.push(`role = $${idx++}`);
            params.push(role);
        }
        if (typeof isApproved === 'boolean') {
            conditions.push(`is_approved = $${idx++}`);
            params.push(isApproved);
        }

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

        const countRes = await query(`SELECT COUNT(*)::int AS total FROM users ${where}`, params);
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
}

export default User;

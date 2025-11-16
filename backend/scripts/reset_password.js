#!/usr/bin/env node
// Script to reset a user's password by email using the project's DB config
// Usage: node scripts/reset_password.js user@example.com NewP@ssw0rd

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { query, closePool } from '../src/config/database.js';

async function resetPassword(email, newPassword) {
  if (!email || !newPassword) {
    console.error('Usage: node scripts/reset_password.js user@example.com NewP@ssw0rd')
    process.exit(1)
  }

  try {
    const saltRounds = 10
    const hash = bcrypt.hashSync(newPassword, saltRounds)

    const res = await query(
      'UPDATE users SET password_hash = $1, updated_at = now() WHERE email = $2 RETURNING id, email',
      [hash, email]
    )

    if (res.rowCount === 0) {
      console.error('No user found with email:', email)
      process.exitCode = 2
    } else {
      console.log('Password updated for user:', res.rows[0].email)
      process.exitCode = 0
    }
  } catch (err) {
    console.error('Error updating password:', err.message || err)
    process.exitCode = 3
  } finally {
    await closePool()
  }
}

const [,, email, newPassword] = process.argv
resetPassword(email, newPassword)

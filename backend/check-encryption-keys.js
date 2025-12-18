/**
 * Check Encryption Keys Status
 * 
 * This script checks the status of encryption keys in the database
 * and helps diagnose encryption key issues.
 */

import { query } from './src/config/database.js';

async function checkEncryptionKeys() {
  console.log('🔍 Checking encryption keys status...\n');

  try {
    // Check if public_keys table exists
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'public_keys'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('❌ ERROR: public_keys table does not exist!');
      console.log('   Run migration: database/migrations/001_messaging_essential.sql');
      return;
    }

    console.log('✅ public_keys table exists\n');

    // Get table structure
    console.log('📊 Table Structure:');
    const structure = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'public_keys'
      ORDER BY ordinal_position;
    `);
    
    structure.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(required)' : '(optional)'}`);
    });
    console.log('');

    // Count total users
    const totalUsers = await query('SELECT COUNT(*) as count FROM users');
    console.log(`👥 Total users: ${totalUsers.rows[0].count}`);

    // Count users with keys
    const usersWithKeys = await query(`
      SELECT COUNT(DISTINCT user_id) as count 
      FROM public_keys 
      WHERE public_key IS NOT NULL
    `);
    console.log(`🔑 Users with public keys: ${usersWithKeys.rows[0].count}`);

    // Count users with encrypted private keys
    const usersWithEncrypted = await query(`
      SELECT COUNT(DISTINCT user_id) as count 
      FROM public_keys 
      WHERE encrypted_private_key IS NOT NULL
    `);
    console.log(`🔐 Users with encrypted private keys: ${usersWithEncrypted.rows[0].count}\n`);

    // Show sample of keys (without exposing full keys)
    console.log('📋 Sample Key Records (first 5):');
    const samples = await query(`
      SELECT 
        pk.user_id,
        u.email,
        LENGTH(pk.public_key) as pub_key_length,
        LENGTH(pk.encrypted_private_key) as enc_priv_key_length,
        pk.created_at
      FROM public_keys pk
      JOIN users u ON u.id = pk.user_id
      ORDER BY pk.created_at DESC
      LIMIT 5
    `);

    if (samples.rows.length === 0) {
      console.log('   No keys found in database\n');
    } else {
      samples.rows.forEach((row, idx) => {
        console.log(`   ${idx + 1}. User: ${row.email}`);
        console.log(`      User ID: ${row.user_id}`);
        console.log(`      Public key length: ${row.pub_key_length || 'NULL'}`);
        console.log(`      Encrypted private key length: ${row.enc_priv_key_length || 'NULL'}`);
        console.log(`      Created: ${row.created_at}`);
        console.log('');
      });
    }

    // Check for users without keys
    const usersWithoutKeys = await query(`
      SELECT u.id, u.email, u.created_at
      FROM users u
      LEFT JOIN public_keys pk ON pk.user_id = u.id
      WHERE pk.user_id IS NULL
      ORDER BY u.created_at DESC
      LIMIT 10
    `);

    if (usersWithoutKeys.rows.length > 0) {
      console.log('⚠️  Users without encryption keys (showing first 10):');
      usersWithoutKeys.rows.forEach((row, idx) => {
        console.log(`   ${idx + 1}. ${row.email} (ID: ${row.id})`);
        console.log(`      Registered: ${row.created_at}`);
      });
      console.log('');
    }

    // Summary
    console.log('📈 Summary:');
    const coverage = totalUsers.rows[0].count > 0 
      ? ((usersWithKeys.rows[0].count / totalUsers.rows[0].count) * 100).toFixed(1)
      : '0.0';
    console.log(`   Key coverage: ${coverage}% (${usersWithKeys.rows[0].count}/${totalUsers.rows[0].count} users)`);
    
    if (usersWithKeys.rows[0].count < totalUsers.rows[0].count) {
      console.log(`   ⚠️  ${totalUsers.rows[0].count - usersWithKeys.rows[0].count} users need to log in to generate keys`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    process.exit(0);
  }
}

checkEncryptionKeys();

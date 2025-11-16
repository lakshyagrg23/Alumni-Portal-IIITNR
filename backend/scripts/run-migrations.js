/**
 * Database Migration Runner
 * Runs SQL migration files in order
 * Usage: node backend/scripts/run-migrations.js
 */

import fs from 'fs/promises';
import path from 'path';
import pool from '../src/config/database.js';

const MIGRATIONS_DIR = path.join(__dirname, '../../database/migrations');

const MIGRATION_ORDER = [
    '001_add_accreditation_fields.sql',
    '002_create_alumni_contributions.sql',
    '003_create_alumni_achievements.sql',
    '004_enhance_event_registrations.sql',
    '005_create_placement_data.sql',
    '006_create_higher_education_data.sql'
];

async function createMigrationTable() {
    const query = `
        CREATE TABLE IF NOT EXISTS schema_migrations (
            id SERIAL PRIMARY KEY,
            migration_name VARCHAR(255) NOT NULL UNIQUE,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            applied_by VARCHAR(100) DEFAULT CURRENT_USER
        );
    `;
    
    await pool.query(query);
    console.log('✅ Migration tracking table ready');
}

async function getMigratedFiles() {
    const result = await pool.query(
        'SELECT migration_name FROM schema_migrations ORDER BY applied_at'
    );
    return result.rows.map(row => row.migration_name);
}

async function markMigrationComplete(migrationName) {
    await pool.query(
        'INSERT INTO schema_migrations (migration_name) VALUES ($1) ON CONFLICT (migration_name) DO NOTHING',
        [migrationName]
    );
}

async function runMigration(filename) {
    const migrationName = filename.replace('.sql', '');
    const filePath = path.join(MIGRATIONS_DIR, filename);
    
    console.log(`\n📄 Running migration: ${migrationName}`);
    
    try {
        const sql = await fs.readFile(filePath, 'utf-8');
        
        // Remove PostgreSQL-specific commands that don't work in node-postgres
        const cleanedSql = sql
            .replace(/\\echo.*/g, '') // Remove \echo commands
            .replace(/\\i.*/g, '')    // Remove \i (include) commands
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        // Execute each statement
        for (const statement of cleanedSql) {
            if (statement.trim()) {
                await pool.query(statement);
            }
        }
        
        await markMigrationComplete(migrationName);
        console.log(`✅ Migration completed: ${migrationName}`);
        
        return true;
    } catch (error) {
        console.error(`❌ Migration failed: ${migrationName}`);
        console.error('Error:', error.message);
        throw error;
    }
}

async function runAllMigrations() {
    console.log('🚀 Starting database migrations...\n');
    
    try {
        await createMigrationTable();
        
        const migratedFiles = await getMigratedFiles();
        console.log(`\n📋 Previously applied migrations: ${migratedFiles.length}`);
        
        let appliedCount = 0;
        let skippedCount = 0;
        
        for (const filename of MIGRATION_ORDER) {
            const migrationName = filename.replace('.sql', '');
            
            if (migratedFiles.includes(migrationName)) {
                console.log(`⏭️  Skipping (already applied): ${migrationName}`);
                skippedCount++;
                continue;
            }
            
            await runMigration(filename);
            appliedCount++;
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('✅ All migrations completed successfully!');
        console.log(`   - Applied: ${appliedCount}`);
        console.log(`   - Skipped: ${skippedCount}`);
        console.log('='.repeat(60) + '\n');
        
        // Verify tables
        const { rows: tables } = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN (
                'alumni_contributions',
                'alumni_achievements', 
                'placement_data',
                'higher_education_data'
            )
            ORDER BY table_name
        `);
        
        console.log('📊 Verified tables:');
        tables.forEach(t => console.log(`   ✓ ${t.table_name}`));
        
    } catch (error) {
        console.error('\n❌ Migration process failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run if called directly
if (require.main === module) {
    runAllMigrations();
}

module.exports = { runAllMigrations };

/**
 * Import Institute Records from Excel
 * 
 * This script reads an Excel file containing student/alumni data and imports it
 * into the institute_records table for verification purposes.
 * 
 * Excel columns expected:
 * - RollNo: Student roll number
 * - StudentName: Full name
 * - DOB: Date of birth
 * - Email: Institute email
 * - Contact: Phone number (optional, not stored in institute_records)
 * - BranchCurrent: Branch/Department
 * - BatchYear: Graduation year
 */

import dotenv from 'dotenv';
import XLSX from 'xlsx';
import pkg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Database connection
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

/**
 * Parse date from various formats
 */
function parseDate(dateValue) {
    if (!dateValue) return null;

    // If it's already a Date object
    if (dateValue instanceof Date) {
        return dateValue.toISOString().split('T')[0];
    }

    // If it's an Excel serial number
    if (typeof dateValue === 'number') {
        const date = XLSX.SSF.parse_date_code(dateValue);
        return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }

    // If it's a string, try to parse it
    if (typeof dateValue === 'string') {
        const parsed = new Date(dateValue);
        if (!isNaN(parsed.getTime())) {
            return parsed.toISOString().split('T')[0];
        }
    }

    return null;
}

/**
 * Extract degree from branch name or set default
 */
function extractDegree(branch, enrollmentYear) {
    // If branch contains degree info
    if (branch && (branch.includes('M.Tech') || branch.includes('MTech'))) {
        return 'M.Tech';
    }
    if (branch && (branch.includes('PhD') || branch.includes('Ph.D'))) {
        return 'PhD';
    }
    
    // Default to B.Tech for undergraduate programs
    return 'B.Tech';
}

/**
 * Normalize branch name
 */
function normalizeBranch(branch) {
    if (!branch) return null;

    const branchMap = {
        'CSE': 'Computer Science & Engineering',
        'CS': 'Computer Science & Engineering',
        'Computer Science': 'Computer Science & Engineering',
        'ECE': 'Electronics & Communication Engineering',
        'EC': 'Electronics & Communication Engineering',
        'Electronics': 'Electronics & Communication Engineering',
        'EE': 'Electrical Engineering',
        'Electrical': 'Electrical Engineering',
        'ME': 'Mechanical Engineering',
        'Mechanical': 'Mechanical Engineering',
        'CE': 'Civil Engineering',
        'Civil': 'Civil Engineering',
        'IT': 'Information Technology',
        'DSAI': 'Data Science & Artificial Intelligence',
        'DS': 'Data Science & Artificial Intelligence',
        'AI': 'Data Science & Artificial Intelligence',
    };

    // Check for exact matches first
    for (const [key, value] of Object.entries(branchMap)) {
        if (branch.toUpperCase().includes(key)) {
            return value;
        }
    }

    // Return original if no mapping found
    return branch;
}

/**
 * Generate institute email if not provided
 */
function generateInstituteEmail(rollNumber) {
    if (!rollNumber) return null;
    return `${rollNumber}@iiitnr.edu.in`.toLowerCase();
}

/**
 * Import records from Excel file
 */
async function importRecords(filePath) {
    try {
        console.log('📖 Reading Excel file:', filePath);
        
        // Read the Excel file
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const data = XLSX.utils.sheet_to_json(worksheet);
        
        console.log(`📊 Found ${data.length} records in Excel file\n`);

        let successCount = 0;
        let errorCount = 0;
        let skippedCount = 0;
        const errors = [];

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            
            try {
                // Extract and validate data
                const rollNumber = row.RollNo ? String(row.RollNo).trim() : null;
                const fullName = row.StudentName ? String(row.StudentName).trim() : null;
                const dob = parseDate(row.DOB);
                const email = row.Email ? String(row.Email).trim().toLowerCase() : generateInstituteEmail(rollNumber);
                const branchRaw = row.BranchCurrent ? String(row.BranchCurrent).trim() : null;
                const enrollmentYear = row.BatchYear ? parseInt(row.BatchYear) : null;
                const contactNumber = row.Contact ? String(row.Contact).trim() : null;

                // Validate required fields
                if (!rollNumber || !fullName || !dob) {
                    console.log(`⚠️  Row ${i + 1}: Missing required fields - Skipped`);
                    skippedCount++;
                    continue;
                }

                // Process fields
                const branch = normalizeBranch(branchRaw);
                const degree = extractDegree(branchRaw, enrollmentYear);
                const instituteEmail = email;

                // Insert into database
                const query = `
                    INSERT INTO institute_records 
                    (roll_number, full_name, date_of_birth, enrollment_year, degree, branch, institute_email, contact_number, is_active)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    ON CONFLICT (roll_number) 
                    DO UPDATE SET
                        full_name = EXCLUDED.full_name,
                        date_of_birth = EXCLUDED.date_of_birth,
                        enrollment_year = EXCLUDED.enrollment_year,
                        degree = EXCLUDED.degree,
                        branch = EXCLUDED.branch,
                        institute_email = EXCLUDED.institute_email,
                        contact_number = EXCLUDED.contact_number,
                        updated_at = CURRENT_TIMESTAMP
                    RETURNING id;
                `;

                const values = [
                    rollNumber,
                    fullName,
                    dob,
                    enrollmentYear,
                    degree,
                    branch,
                    instituteEmail,
                    contactNumber,
                    true // is_active
                ];

                await pool.query(query, values);
                successCount++;
                
                if ((i + 1) % 10 === 0) {
                    console.log(`✅ Processed ${i + 1}/${data.length} records...`);
                }

            } catch (error) {
                errorCount++;
                const errorMsg = `Row ${i + 1} (${row.RollNo || 'N/A'}): ${error.message}`;
                errors.push(errorMsg);
                console.error(`❌ ${errorMsg}`);
            }
        }

        // Print summary
        console.log('\n' + '='.repeat(60));
        console.log('📋 IMPORT SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total records in Excel: ${data.length}`);
        console.log(`✅ Successfully imported: ${successCount}`);
        console.log(`⚠️  Skipped (missing data): ${skippedCount}`);
        console.log(`❌ Failed: ${errorCount}`);
        console.log('='.repeat(60));

        if (errors.length > 0 && errors.length <= 20) {
            console.log('\n❌ Errors:');
            errors.forEach(err => console.log(`   - ${err}`));
        }

        // Verify import
        const countResult = await pool.query('SELECT COUNT(*) FROM institute_records');
        console.log(`\n📊 Total records in database: ${countResult.rows[0].count}`);

    } catch (error) {
        console.error('❌ Fatal error during import:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Main execution
const args = process.argv.slice(2);
const excelFilePath = args[0];

if (!excelFilePath) {
    console.error('❌ Usage: node import-institute-records.js <path-to-excel-file>');
    console.error('   Example: node import-institute-records.js ./data/students.xlsx');
    process.exit(1);
}

const fullPath = path.resolve(excelFilePath);

importRecords(fullPath)
    .then(() => {
        console.log('\n✅ Import completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Import failed:', error);
        process.exit(1);
    });

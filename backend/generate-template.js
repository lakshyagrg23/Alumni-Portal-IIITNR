/**
 * Generate Sample Excel Template
 * 
 * Creates a sample Excel file with the correct format and some example data
 * for importing into institute_records table
 */

import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Sample data with the expected format
const sampleData = [
    {
        RollNo: '19115001',
        StudentName: 'Rahul Kumar Sharma',
        DOB: '15/08/2001',
        Email: '19115001@iiitnr.edu.in',
        Contact: '9876543210',
        BranchCurrent: 'CSE',
        BatchYear: 2019
    },
    {
        RollNo: '19115002',
        StudentName: 'Priya Singh',
        DOB: '22/11/2001',
        Email: '19115002@iiitnr.edu.in',
        Contact: '9876543211',
        BranchCurrent: 'Computer Science & Engineering',
        BatchYear: 2019
    },
    {
        RollNo: '19125001',
        StudentName: 'Amit Patel',
        DOB: '10/05/2001',
        Email: '', // Optional - will be auto-generated
        Contact: '9876543212',
        BranchCurrent: 'ECE',
        BatchYear: 2019
    },
    {
        RollNo: '19125002',
        StudentName: 'Sneha Gupta',
        DOB: '28/09/2001',
        Email: '19125002@iiitnr.edu.in',
        Contact: '9876543213',
        BranchCurrent: 'Electronics & Communication Engineering',
        BatchYear: 2019
    },
    {
        RollNo: '18115001',
        StudentName: 'Vikram Reddy',
        DOB: '17/03/2000',
        Email: '18115001@iiitnr.edu.in',
        Contact: '9876543214',
        BranchCurrent: 'CSE',
        BatchYear: 2018
    },
    {
        RollNo: '18115002',
        StudentName: 'Anjali Verma',
        DOB: '05/12/2000',
        Email: '18115002@iiitnr.edu.in',
        Contact: '9876543215',
        BranchCurrent: 'Computer Science & Engineering',
        BatchYear: 2018
    },
    {
        RollNo: '20115001',
        StudentName: 'Rohan Mehta',
        DOB: '14/07/2002',
        Email: '20115001@iiitnr.edu.in',
        Contact: '9876543216',
        BranchCurrent: 'DSAI',
        BatchYear: 2020
    },
    {
        RollNo: '20135001',
        StudentName: 'Kavya Iyer',
        DOB: '20/10/2002',
        Email: '20135001@iiitnr.edu.in',
        Contact: '9876543217',
        BranchCurrent: 'Data Science & Artificial Intelligence',
        BatchYear: 2020
    }
];

// Instructions sheet data
const instructions = [
    ['Institute Records Import Template'],
    [''],
    ['INSTRUCTIONS:'],
    ['1. Fill in all student/alumni data in the "Data" sheet'],
    ['2. Required fields: RollNo, StudentName, DOB'],
    ['3. Optional fields: Email (auto-generated if blank), Contact, BranchCurrent, BatchYear'],
    [''],
    ['COLUMN DESCRIPTIONS:'],
    ['RollNo - Student roll number (REQUIRED)'],
    ['StudentName - Full name of student/alumni (REQUIRED)'],
    ['DOB - Date of birth in DD/MM/YYYY format (REQUIRED)'],
    ['Email - Institute email (optional, auto-generated from roll number)'],
    ['Contact - Phone number (optional, stored in database)'],
    ['BranchCurrent - Branch/Department (e.g., CSE, ECE, ME, DSAI)'],
    ['BatchYear - Year of enrollment/admission (not graduation year)'],
    [''],
    ['SUPPORTED BRANCH ABBREVIATIONS:'],
    ['CSE, CS → Computer Science & Engineering'],
    ['ECE, EC → Electronics & Communication Engineering'],
    ['EE → Electrical Engineering'],
    ['ME → Mechanical Engineering'],
    ['CE → Civil Engineering'],
    ['IT → Information Technology'],
    ['DSAI, DS, AI → Data Science & Artificial Intelligence'],
    [''],
    ['After filling the data, save the file and run:'],
    ['node import-institute-records.js path/to/this/file.xlsx'],
    ['OR'],
    ['import-records.bat path/to/this/file.xlsx (on Windows)']
];

function generateTemplate() {
    console.log('📝 Generating sample Excel template...\n');

    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // Create instructions sheet
    const instructionsSheet = XLSX.utils.aoa_to_sheet(instructions);
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');

    // Create data sheet with sample data
    const dataSheet = XLSX.utils.json_to_sheet(sampleData);
    
    // Set column widths for better readability
    dataSheet['!cols'] = [
        { wch: 12 },  // RollNo
        { wch: 25 },  // StudentName
        { wch: 12 },  // DOB
        { wch: 30 },  // Email
        { wch: 15 },  // Contact
        { wch: 35 },  // BranchCurrent
        { wch: 12 }   // BatchYear
    ];

    XLSX.utils.book_append_sheet(workbook, dataSheet, 'Data');

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `institute_records_template_${timestamp}.xlsx`;
    const filepath = path.join(__dirname, 'data', filename);

    // Create data directory if it doesn't exist
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    // Write the file
    XLSX.writeFile(workbook, filepath);

    console.log('✅ Template generated successfully!');
    console.log(`📁 Location: ${filepath}`);
    console.log(`\n📊 The template includes:`);
    console.log('   - Instructions sheet with detailed guide');
    console.log('   - Data sheet with 8 sample records');
    console.log('   - Proper column formatting');
    console.log(`\nℹ️  You can now:`);
    console.log('   1. Open the file in Excel/LibreOffice');
    console.log('   2. Replace sample data with your actual data');
    console.log('   3. Run: node import-institute-records.js ' + filename);
}

// Run the generator
try {
    generateTemplate();
} catch (error) {
    console.error('❌ Error generating template:', error.message);
    process.exit(1);
}

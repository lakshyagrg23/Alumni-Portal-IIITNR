# Institute Records Import Guide

This guide explains how to import student and alumni data from an Excel file into the `institute_records` table.

## Prerequisites

1. **Install the required package:**
   ```bash
   cd backend
   npm install xlsx
   ```

2. **Prepare your Excel file** with the following columns:
   - `RollNo` - Student roll number (required)
   - `StudentName` - Full name (required)
   - `DOB` - Date of birth (required)
   - `Email` - Institute email (optional, will be auto-generated from roll number)
   - `Contact` - Phone number (optional, not imported)
   - `BranchCurrent` - Branch/Department (e.g., CSE, ECE, ME)
   - `BatchYear` - Graduation year

## How to Import

### Step 1: Place your Excel file
Put your Excel file (`.xlsx` format) in an accessible location, for example:
```
backend/data/students_alumni.xlsx
```

### Step 2: Run the import script
From the `backend` directory:

```bash
# For local database
node import-institute-records.js ./data/students_alumni.xlsx

# Or with full path
node import-institute-records.js "D:/path/to/your/file.xlsx"
```

### Step 3: Verify the import
The script will display:
- Progress updates every 10 records
- Summary of successful imports, skipped records, and errors
- Total count in the database

## Features

### Automatic Data Processing
- **Branch Normalization**: Converts abbreviations (CSE, ECE, etc.) to full names
- **Email Generation**: Auto-generates institute emails if not provided
- **Degree Detection**: Automatically sets degree based on branch info
- **Date Parsing**: Handles various date formats including Excel serial dates
- **Duplicate Handling**: Updates existing records based on roll number

### Supported Branch Abbreviations
- `CSE`, `CS` → Computer Science & Engineering
- `ECE`, `EC` → Electronics & Communication Engineering
- `EE` → Electrical Engineering
- `ME` → Mechanical Engineering
- `CE` → Civil Engineering
- `IT` → Information Technology
- `DSAI`, `DS`, `AI` → Data Science & Artificial Intelligence

### Error Handling
- Skips rows with missing required fields (roll number, name, DOB)
- Reports specific errors for each failed row
- Continues processing even if some records fail
- Uses ON CONFLICT to update existing records instead of failing

## Example Excel Data

| RollNo   | StudentName      | DOB        | Email                     | Contact    | BranchCurrent | BatchYear |
|----------|-----------------|------------|---------------------------|------------|---------------|-----------|
| 19115001 | Rahul Kumar     | 15/08/2001 | 19115001@iiitnr.edu.in   | 9876543210 | CSE           | 2023      |
| 19125001 | Priya Singh     | 22/11/2001 |                          | 9876543211 | ECE           | 2023      |
| 18115001 | Amit Patel      | 10/05/2000 | amit@gmail.com           | 9876543212 | Computer Science | 2022   |

## Sample Output

```
📖 Reading Excel file: D:\path\to\students.xlsx
📊 Found 150 records in Excel file

✅ Processed 10/150 records...
✅ Processed 20/150 records...
...
✅ Processed 150/150 records...

============================================================
📋 IMPORT SUMMARY
============================================================
Total records in Excel: 150
✅ Successfully imported: 148
⚠️  Skipped (missing data): 2
❌ Failed: 0
============================================================

📊 Total records in database: 148

✅ Import completed successfully!
```

## Troubleshooting

### "Missing required fields"
- Ensure RollNo, StudentName, and DOB are filled for all rows
- Check for empty rows at the end of your Excel file

### "Database connection error"
- Verify your `.env` file has correct database credentials
- Ensure the database is running

### "XLSX module not found"
- Run `npm install xlsx` in the backend directory

### Date format issues
- Supported formats: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, Excel date numbers
- Ensure dates are in a valid format

## Post-Import Verification

After import, you can verify the data using:

```bash
# Connect to your database
psql -U your_user -d your_database

# Check total records
SELECT COUNT(*) FROM institute_records;

# View sample records
SELECT roll_number, full_name, graduation_year, branch 
FROM institute_records 
ORDER BY graduation_year DESC, roll_number 
LIMIT 10;

# Check by graduation year
SELECT graduation_year, COUNT(*) 
FROM institute_records 
GROUP BY graduation_year 
ORDER BY graduation_year DESC;
```

## Notes

- The script uses **ON CONFLICT** to update existing records, so you can safely re-run it with updated data
- Contact numbers are not stored in `institute_records` table (not part of the schema)
- The script automatically sets `is_active = true` for all imported records
- Generated institute emails follow the pattern: `{rollnumber}@iiitnr.edu.in`

## Support

If you encounter any issues:
1. Check the error messages in the console output
2. Verify your Excel file format matches the expected columns
3. Ensure all required fields are populated
4. Check database connectivity and credentials

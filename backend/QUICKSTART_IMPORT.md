# 🚀 Quick Start: Import Institute Records

This guide will help you quickly import student and alumni data into your database.

## ⚡ Quick Steps

### 1️⃣ Generate a Template (Optional - to see the format)
```bash
cd backend
npm run records:template
```
This creates `backend/data/institute_records_template_YYYY-MM-DD.xlsx` with sample data.

### 2️⃣ Prepare Your Excel File

Your Excel file should have these columns (see attached image for reference):
- **RollNo** - Student roll number *(required)*
- **StudentName** - Full name *(required)*
- **DOB** - Date of birth *(required)*
- **Email** - Institute email *(optional - auto-generated)*
- **Contact** - Phone number *(optional - not stored)*
- **BranchCurrent** - Branch/Department *(optional)*
- **BatchYear** - Graduation year *(optional)*

### 3️⃣ Import Your Data

**Option A: Using npm script**
```bash
npm run records:import path/to/your-file.xlsx
```

**Option B: Using batch file (Windows)**
```bash
import-records.bat path\to\your-file.xlsx
```

**Option C: Direct node command**
```bash
node import-institute-records.js path/to/your-file.xlsx
```

### 4️⃣ Verify the Import
```bash
npm run records:verify
```

## 📊 Example Excel Data

| RollNo   | StudentName  | DOB        | Email                   | Contact    | BranchCurrent | BatchYear |
|----------|-------------|------------|-------------------------|------------|---------------|-----------|
| 19115001 | Rahul Kumar | 15/08/2001 | 19115001@iiitnr.edu.in | 9876543210 | CSE           | 2023      |
| 19125001 | Priya Singh | 22/11/2001 |                        | 9876543211 | ECE           | 2023      |

## 🎯 Branch Abbreviations Supported

The import script automatically converts these abbreviations:
- `CSE`, `CS` → Computer Science & Engineering
- `ECE`, `EC` → Electronics & Communication Engineering  
- `EE` → Electrical Engineering
- `ME` → Mechanical Engineering
- `DSAI`, `DS`, `AI` → Data Science & Artificial Intelligence

## ✅ Features

- ✨ Auto-generates institute emails if not provided
- 🔄 Updates existing records (based on roll number)
- 📝 Detailed progress and error reporting
- 🛡️ Validates required fields
- 📊 Shows import summary and statistics

## 📁 File Organization

```
backend/
├── data/                              # Place your Excel files here
│   └── README.md                      # Data directory guide
├── import-institute-records.js        # Main import script
├── generate-template.js               # Template generator
├── verify-institute-records.js        # Verification script
├── import-records.bat                 # Windows batch helper
├── import-records.sh                  # Linux/Mac bash helper
└── IMPORT_RECORDS_GUIDE.md           # Detailed documentation
```

## 🔍 Sample Output

```
📖 Reading Excel file: D:\data\students.xlsx
📊 Found 150 records in Excel file

✅ Processed 10/150 records...
✅ Processed 20/150 records...
...

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

## ⚠️ Important Notes

1. **Required Fields**: RollNo, StudentName, and DOB must be filled
2. **Date Format**: Supports DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, and Excel dates
3. **Email Auto-Generation**: If blank, generates `{rollnumber}@iiitnr.edu.in`
4. **Duplicates**: Re-running import updates existing records (safe to re-run)
5. **Security**: Excel files in `data/` folder are gitignored (won't be committed)

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| "XLSX module not found" | Run `npm install` in backend directory |
| "Missing required fields" | Check RollNo, StudentName, DOB are filled |
| "Database connection error" | Verify `.env` file has correct DB credentials |
| "File not found" | Use full path or check file location |

## 📚 More Information

For detailed documentation, see:
- **Detailed Guide**: `IMPORT_RECORDS_GUIDE.md`
- **Data Directory**: `data/README.md`
- **Database Schema**: `database/migrations/003_add_institute_records_and_registration_paths.sql`

## 🔗 Useful Commands

```bash
# Generate template
npm run records:template

# Import data
npm run records:import data/students.xlsx

# Verify import
npm run records:verify

# Check database directly (if you have psql)
psql -U your_user -d your_database -c "SELECT COUNT(*) FROM institute_records;"
```

---

**Need Help?** Check `IMPORT_RECORDS_GUIDE.md` for comprehensive instructions.

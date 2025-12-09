# Data Import Directory

This directory stores Excel files for importing institute records.

## Usage

1. **Generate a template:**
   ```bash
   npm run records:template
   ```

2. **Place your Excel file here** (or anywhere accessible)

3. **Import the data:**
   ```bash
   npm run records:import data/your-file.xlsx
   # or
   node import-institute-records.js data/your-file.xlsx
   ```

## Important Notes

- **Do NOT commit actual student data** to version control
- This directory is gitignored for privacy and security
- Only commit sample/template files
- Keep Excel files in this folder for organization

## File Format

Your Excel file should have these columns:
- `RollNo` (required)
- `StudentName` (required)
- `DOB` (required)
- `Email` (optional)
- `Contact` (optional)
- `BranchCurrent` (optional)
- `BatchYear` (optional)

See `IMPORT_RECORDS_GUIDE.md` for detailed instructions.

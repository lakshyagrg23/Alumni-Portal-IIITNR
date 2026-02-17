#!/bin/bash
# Import Institute Records - Bash Script
# Usage: ./import-records.sh <path-to-excel-file>

if [ -z "$1" ]; then
    echo ""
    echo "❌ Error: Please provide the path to your Excel file"
    echo ""
    echo "Usage: ./import-records.sh <path-to-excel-file>"
    echo "Example: ./import-records.sh data/students.xlsx"
    echo ""
    exit 1
fi

echo ""
echo "========================================"
echo "  Institute Records Import Tool"
echo "========================================"
echo ""
echo "📁 Excel file: $1"
echo ""

# Check if file exists
if [ ! -f "$1" ]; then
    echo "❌ Error: File not found: $1"
    echo ""
    exit 1
fi

# Run the import script
node import-institute-records.js "$1"

echo ""
echo "========================================"
echo ""

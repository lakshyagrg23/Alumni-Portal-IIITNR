@echo off
REM Import Institute Records - Windows Batch Script
REM Usage: import-records.bat <path-to-excel-file>

if "%~1"=="" (
    echo.
    echo ❌ Error: Please provide the path to your Excel file
    echo.
    echo Usage: import-records.bat ^<path-to-excel-file^>
    echo Example: import-records.bat data\students.xlsx
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Institute Records Import Tool
echo ========================================
echo.
echo 📁 Excel file: %~1
echo.

REM Check if file exists
if not exist "%~1" (
    echo ❌ Error: File not found: %~1
    echo.
    pause
    exit /b 1
)

REM Run the import script
node import-institute-records.js "%~1"

echo.
echo ========================================
echo.
pause

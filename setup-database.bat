@echo off
REM AKCB Database Setup Script
REM This script creates the database and imports the schema

echo ========================================
echo AKCB Customer Authentication Database Setup
echo ========================================
echo.

REM Check if Laragon MySQL is running
echo [1/3] Checking MySQL connection...
mysql -u root -e "SELECT 1" >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] MySQL is not running or not accessible
    echo.
    echo Please ensure:
    echo - Laragon is started
    echo - MySQL service is running
    echo - MySQL is accessible at localhost:3306
    echo.
    pause
    exit /b 1
)
echo [OK] MySQL is running
echo.

REM Import database schema
echo [2/3] Creating database and tables...
mysql -u root < database\schema.sql
if %errorlevel% neq 0 (
    echo [ERROR] Failed to import database schema
    echo.
    echo Check database\schema.sql file exists
    pause
    exit /b 1
)
echo [OK] Database created successfully
echo.

REM Verify installation
echo [3/3] Verifying installation...
mysql -u root akcb_bank -e "SELECT COUNT(*) as customer_count FROM customers"
if %errorlevel% neq 0 (
    echo [ERROR] Database verification failed
    pause
    exit /b 1
)
echo [OK] Database verified
echo.

echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Database: akcb_bank
echo Sample Accounts: 5 test customers added
echo.
echo Test Account:
echo   Account: 1234567890
echo   Phone: 0242123456
echo   DOB: 15/05/1990
echo.
echo Next Steps:
echo 1. Update .env file with database credentials
echo 2. Run: npm run build
echo 3. Run: npm start
echo 4. Test chatbot at http://localhost:4000
echo.
pause

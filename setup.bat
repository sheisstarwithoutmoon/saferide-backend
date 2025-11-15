@echo off
echo ===============================================
echo   Safe Ride Backend - Quick Start Setup
echo ===============================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [1/5] Installing dependencies...
call npm install

echo.
echo [2/5] Creating .env file...
if not exist .env (
    copy .env.example .env
    echo .env file created! Please edit it with your credentials.
) else (
    echo .env file already exists.
)

echo.
echo [3/5] Checking MongoDB...
where mongod >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: MongoDB is not installed or not in PATH
    echo You can:
    echo   1. Install MongoDB locally
    echo   2. Use MongoDB Atlas (cloud)
    echo.
)

echo.
echo [4/5] Checking Firebase service account...
if not exist firebase-service-account.json (
    echo WARNING: firebase-service-account.json not found!
    echo Please download it from Firebase Console and place it here.
    echo.
)

echo.
echo [5/5] Setup complete!
echo.
echo ===============================================
echo   Next Steps:
echo ===============================================
echo.
echo 1. Edit .env file with your credentials
echo 2. Make sure MongoDB is running
echo 3. Add firebase-service-account.json
echo 4. Run: npm run dev
echo.
echo ===============================================

pause

@echo off
title Jake Idler Server
cd /d "%~dp0"

echo ============================================
echo   Jake Idler — Game Server
echo ============================================
echo.

:: Build
echo [1/2] Building...
call npx turbo run build --filter=@jake-idler/server...
if %errorlevel% neq 0 (
    echo Build failed!
    pause
    exit /b %errorlevel%
)

:: Start server directly (same window)
echo [2/2] Starting server...
echo.
echo   Open http://localhost:3000 in your browser
echo   Press Ctrl+C to stop the server
echo.
cd /d apps\server
node dist\index.js
if %errorlevel% neq 0 (
    echo Server exited with error code %errorlevel%
    pause
)

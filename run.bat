@echo off
title Jake Idler Server
cd /d "%~dp0"

echo ============================================
echo   Jake Idler — Game Server
echo ============================================
echo.

:: Kill any old server
echo [1/3] Stopping old server...
taskkill /f /im node.exe >nul 2>nul
timeout /t 1 /nobreak >nul

:: Build
echo [2/3] Building...
call npx turbo run build --filter=@jake-idler/server...
if %errorlevel% neq 0 (
    echo Build failed!
    pause
    exit /b %errorlevel%
)

:: Start server directly (same window)
echo [3/3] Starting server...
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

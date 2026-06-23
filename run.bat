@echo off
title Jake Idler Server
cd /d "%~dp0"

echo ============================================
echo   Jake Idler — Game Server
echo ============================================
echo.

:: Build game package + server (turbo handles deps)
echo Building...
call npx turbo run build --filter=@jake-idler/server...
if %errorlevel% neq 0 (
    echo Build failed!
    pause
    exit /b %errorlevel%
)

:: Start the game server (port 3001)
echo Starting server on http://localhost:3001
echo.
start "Jake-Idler Server" cmd /c "cd /d apps\server && node dist\index.js"

echo Server started. Close this window to stop the server.
echo.
pause

@echo off
title Starting Aethos Memory Web Dashboard
echo ====================================================
echo         Starting Aethos Memory Dashboard...
echo ====================================================
echo.

cd /d "%~dp0dashboard"

if not exist node_modules (
    echo Installing dependencies...
    call npm install
)

echo Starting dev server on http://localhost:3000...
call npm run dev

pause

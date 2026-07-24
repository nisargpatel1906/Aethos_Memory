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

if exist .next (
    echo Launching pre-built production server for maximum speed...
    call npm run start
) else (
    echo Building production app for first run...
    call npm run build
    call npm run start
)

pause

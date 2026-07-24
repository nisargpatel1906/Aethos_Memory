@echo off
title Launch Aethos Memory Full Stack
echo ====================================================
echo      Aethos Memory - Web App & MCP Server Launch
echo ====================================================
echo.
echo [1/2] Starting Next.js Web Dashboard...
start "Aethos Dashboard (http://localhost:3000)" cmd /k "cd /d %~dp0dashboard && npm run dev"

echo [2/2] Checking MCP Server Virtual Environment...
if exist "%~dp0server\.venv\Scripts\python.exe" (
    echo Python MCP Virtual Environment ready.
) else (
    echo Warning: server\.venv not found. Please set up the Python environment if using MCP tools.
)

echo.
echo ====================================================
echo Web Dashboard is running at: http://localhost:3000
echo You can close this terminal window at any time.
echo ====================================================
echo.
pause

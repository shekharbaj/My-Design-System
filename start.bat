@echo off
setlocal
cd /d "%~dp0"

echo ============================================================
echo   AI Design System Creator & Figma Desktop Bridge
echo ============================================================
echo.

where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [INFO] Found Node.js on system. Starting server.js...
    start http://localhost:9250
    node server.js
) else (
    echo [INFO] Node.js not found in PATH. Using native Windows PowerShell server...
    start http://localhost:9250
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"
)

pause

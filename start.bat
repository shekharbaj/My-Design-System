@echo off
setlocal enabledelayedexpansion
title AI Design System Creator and Figma Bridge
cd /d "%~dp0"

echo ============================================================
echo   AI Design System Creator ^& Figma Desktop Bridge v2.0
echo ============================================================
echo.
echo [1] Checking for previous running server instances...

rem Free port 9250 if an orphan process is still holding it
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :9250 ^| findstr LISTENING 2^>nul') do (
    echo [INFO] Freeing port 9250 with PID %%a...
    taskkill /f /pid %%a >nul 2>&1
)

echo.
echo [2] Locating Node.js runtime...

set "NODE_EXE="

rem 1. Check system PATH
where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    set "NODE_EXE=node"
)

rem 2. Check 64-bit Program Files
if not defined NODE_EXE (
    if exist "C:\Program Files\nodejs\node.exe" (
        set "NODE_EXE=C:\Program Files\nodejs\node.exe"
    )
)

rem 3. Check 32-bit Program Files
if not defined NODE_EXE (
    if exist "C:\Program Files (x86)\nodejs\node.exe" (
        set "NODE_EXE=C:\Program Files (x86)\nodejs\node.exe"
    )
)

rem 4. Check LocalAppData
if not defined NODE_EXE (
    if exist "%LOCALAPPDATA%\Programs\node\node.exe" (
        set "NODE_EXE=%LOCALAPPDATA%\Programs\node\node.exe"
    )
)

if defined NODE_EXE (
    echo [INFO] Found Node.js: "!NODE_EXE!"
    echo [INFO] Starting server and launching browser...
    echo.
    "!NODE_EXE!" "%~dp0server.js"
) else (
    echo [INFO] Node.js not found in PATH or standard folders.
    echo [INFO] Falling back to native Windows PowerShell web server...
    echo.
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"
)

echo.
echo [INFO] Server has stopped.
pause

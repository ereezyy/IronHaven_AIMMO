@echo off
:: IronHaven AIMMO — Windows Launcher
:: Double-click to start. Opens in your default browser.
:: Requires Node.js (comes with npm). If missing, the launcher will guide you.

setlocal enabledelayedexpansion

echo.
echo   ╔══════════════════════════════════════════════╗
echo   ║    ██╗██████╗  ██████╗ ███╗   ██╗          ║
echo   ║    ██║██╔══██╗██╔═══██╗████╗  ██║          ║
echo   ║    ██║██████╔╝██║   ██║██╔██╗ ██║          ║
echo   ║    ██║██╔══██╗██║   ██║██║╚██╗██║          ║
echo   ║    ██║██║  ██║╚██████╔╝██║ ╚████║          ║
echo   ║    ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝          ║
echo   ║                                              ║
echo   ║       H A V E N   v1.0.0                     ║
echo   ║       AI-Powered Cyberpunk MMORPG              ║
echo   ║                                              ║
echo   ╚══════════════════════════════════════════════╝
echo.
echo   [*] Booting IronHaven server...
echo.

:: Check for Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   [!] Node.js not found. Install from https://nodejs.org (v18+)
    echo   [!] Then run this launcher again.
    pause
    exit /b 1
)

:: Check for node_modules
if not exist "%~dp0node_modules\" (
    echo   [*] First run — installing dependencies (this only happens once)...
    call npm install --prefer-offline
    if %ERRORLEVEL% NEQ 0 (
        echo   [!] Install failed. Check your internet connection.
        pause
        exit /b 1
    )
)

:: Check for dist
if not exist "%~dp0dist\" (
    echo   [*] No build found — building for production...
    call npm run build
    if %ERRORLEVEL% NEQ 0 (
        echo   [!] Build failed. See errors above.
        pause
        exit /b 1
    )
)

echo.
echo   [✓] Server starting at http://localhost:5173
echo   [✓] Press Ctrl+C to stop. Enjoy the run.
echo.

:: Start dev server and open browser
start "" http://localhost:5173
call npx vite --host --port 5173

pause

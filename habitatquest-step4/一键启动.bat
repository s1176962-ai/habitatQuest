@echo off
setlocal
title HabitatQuest Speaking Practice - One-click Launcher

REM  One-click launcher for HabitatQuest Speaking Practice (local-only prototype).
REM  Everything in this file is ASCII on purpose: CMD reads .bat files using
REM  the system codepage, so non-ASCII text can get garbled. The project path
REM  itself may contain spaces or Chinese; %~dp0 handles that safely.

cd /d "%~dp0"

echo.
echo  ==========================================================
echo   HabitatQuest  Speaking Practice  [LOCAL PROTOTYPE]
echo  ==========================================================
echo.

REM ---- 1. Locate Node.js ------------------------------------------------
where node >nul 2>&1
if errorlevel 1 (
  if exist "C:\Program Files\nodejs\node.exe" (
    set "PATH=C:\Program Files\nodejs;%PATH%"
  ) else (
    echo  [ERROR] Node.js was not found on this computer.
    echo          Install Node.js 18 or newer from https://nodejs.org/
    echo.
    pause
    exit /b 1
  )
)

where npm >nul 2>&1
if errorlevel 1 (
  echo  [ERROR] npm was not found. Reinstall Node.js from https://nodejs.org/
  echo.
  pause
  exit /b 1
)

REM ---- 2. Is the dev server already running? ----------------------------
REM  Vite uses strictPort, so a second instance on 5173 would just fail.
netstat -ano | findstr ":5173" | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
  echo  [OK] Dev server is already running on port 5173.
  echo       Opening http://localhost:5173 ...
  if not "%HQ_NO_OPEN%"=="1" start "" "http://localhost:5173"
  echo.
  echo       Nothing else to do. This window closes in 4 seconds.
  timeout /t 4 >nul 2>&1
  exit /b 0
)

REM ---- 3. First-run dependency install ----------------------------------
if not exist "node_modules\" (
  echo  [1/2] First run: installing dependencies. Needs internet once.
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo  [ERROR] npm install failed. Check your network and try again.
    pause
    exit /b 1
  )
) else (
  echo  [1/2] Dependencies already installed.
)

REM ---- 4. Start Vite, then open the browser -----------------------------
echo  [2/2] Starting dev server at http://localhost:5173 ...
echo.
echo   KEEP THIS WINDOW OPEN while practising.
echo   Press Ctrl+C or close this window to stop the server.
echo.
echo   Microphone needs localhost. If there is no English TTS voice on this
echo   machine, click "Skip demo" and use the typed-transcript fallback.
echo.

REM  HQ_NO_OPEN=1 is an optional switch for scripted / headless runs.
if "%HQ_NO_OPEN%"=="1" (
  call npm run dev
) else (
  call npm run start
)

echo.
echo  Dev server stopped.
pause

@echo off
REM ismini-web — Web UI launcher: starts the server hidden in background, then opens the browser
setlocal
set "DIR=%~dp0"
set "URL=http://127.0.0.1:8787/"

REM Verify Node.js is available on PATH (LM Studio or standalone install)
where node >NUL 2>&1
if %errorlevel% neq 0 (
  echo ERROR: Node.js 18 or newer was not found on PATH.
  echo Install Node.js 18 or newer from https://nodejs.org/ and ensure it is on PATH.
  pause
  exit /b 1
)
for /f "tokens=1 delims=v." %%V in ('node --version 2^>NUL') do set "NODE_MAJOR=%%V"
if not defined NODE_MAJOR (
  echo ERROR: Could not determine the Node.js version.
  pause
  exit /b 1
)
if %NODE_MAJOR% LSS 18 (
  echo ERROR: Node.js 18 or newer is required. Found version %NODE_MAJOR%.
  pause
  exit /b 1
)

REM Already running? Just open the browser.
curl -s -m 1 "%URL%" -o NUL 2>&1
if %errorlevel% equ 0 (
  start "" "%URL%"
  exit /b 0
)

REM Start server completely hidden (no window, no taskbar entry)
wscript //B //Nologo "%DIR%launch-hidden.vbs"

REM Wait for the port (up to ~10s)
set /a count=0
:waitloop
timeout /t 1 /nobreak >NUL
set /a count+=1
if %count% geq 10 goto openbrowser
curl -s -m 1 "%URL%" -o NUL 2>&1
if %errorlevel% equ 0 goto openbrowser
goto waitloop

:openbrowser
start "" "%URL%"

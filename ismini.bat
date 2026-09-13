@echo off
REM ismini-web — Web UI launcher: starts the server hidden in background, then opens the browser
setlocal
set "DIR=%~dp0"
set "URL=http://127.0.0.1:8787/"

REM Check node is available
where node >NUL 2>&1
if %errorlevel% neq 0 (
  echo ERROR: Node.js not found. Install it from https://nodejs.org/
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

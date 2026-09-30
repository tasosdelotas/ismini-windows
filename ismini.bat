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

REM Use Node's built-in fetch so no extra HTTP utility is required.
node -e "fetch('%URL%',{signal:AbortSignal.timeout(1000)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >NUL 2>&1
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
node -e "fetch('%URL%',{signal:AbortSignal.timeout(1000)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >NUL 2>&1
if %errorlevel% equ 0 goto openbrowser
goto waitloop

:openbrowser
node -e "fetch('%URL%',{signal:AbortSignal.timeout(1000)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >NUL 2>&1
if %errorlevel% neq 0 (
  echo ERROR: ismini did not start. Check "%TEMP%\ismini.log" for details.
  pause
  exit /b 1
)
start "" "%URL%"

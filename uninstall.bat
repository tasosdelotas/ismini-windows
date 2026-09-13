@echo off
REM ismini uninstaller (Windows): stops the server and removes the app and all its traces.
setlocal
set "DIR=%~dp0"
set "DIR=%DIR:\/=%"
set "APP=%USERPROFILE%\ismini"
if /i not "%DIR%"=="%APP%" set "APP=%DIR%"

REM 1) stop a running server (find node process running web.js)
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Where-Object { $_.CommandLine -match 'web\.js' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >NUL 2>&1

REM 2) desktop launcher
del /f /q "%USERPROFILE%\Desktop\ismini.bat" >NUL 2>&1

REM 3) stray launcher log
del /f /q "%TEMP%\ismini.log" >NUL 2>&1

REM 4) the app itself
rmdir /s /q "%APP%" 2>NUL

echo Uninstalled ismini (app dir: %APP%).
endlocal

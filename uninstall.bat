@echo off
REM ismini uninstaller (Windows): stops the server and removes the app and all its traces.
setlocal
set "DIR=%~dp0"
set "DIR=%DIR:\/=%"
set "APP=%USERPROFILE%\ismini"
if /i not "%DIR%"=="%APP%" set "APP=%DIR%"

REM 1) stop the server and any child processes for this install
powershell -NoProfile -ExecutionPolicy Bypass -File "%DIR%stop-ismini.ps1" >NUL 2>&1

REM 2) desktop and Start Menu shortcuts
powershell -NoProfile -Command "$desktop=[Environment]::GetFolderPath('Desktop'); $programs=[Environment]::GetFolderPath('Programs'); Remove-Item -LiteralPath (Join-Path $desktop 'Ismini Agent.lnk') -Force -ErrorAction SilentlyContinue; Remove-Item -LiteralPath (Join-Path $programs 'Ismini') -Recurse -Force -ErrorAction SilentlyContinue" >NUL 2>&1

REM 3) stray launcher log
del /f /q "%TEMP%\ismini.log" >NUL 2>&1

REM 4) the app itself
rmdir /s /q "%APP%" 2>NUL

echo Uninstalled ismini (app dir: %APP%).
endlocal

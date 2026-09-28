@echo off
title Publish Ismini to GitHub
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0publish.ps1"
echo.
pause

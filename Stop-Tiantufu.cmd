@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\local-site.ps1" -Action stop
if errorlevel 1 pause

@echo off
title Sinopia - drawing together
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js isn't installed on this PC. Get it from https://nodejs.org, then run this again.
  pause
  exit /b
)
node tools\collab-server.js
pause

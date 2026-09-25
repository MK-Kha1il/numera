@echo off
title Numera server
cd /d "%~dp0server"
node server.js
echo.
echo Server stopped.
pause

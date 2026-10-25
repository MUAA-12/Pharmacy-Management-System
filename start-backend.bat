@echo off
title PharmaReserve - Backend Server
cd /d "%~dp0backend"
echo ===================================================
echo  Starting PharmaReserve Backend API Server (Port 5000)
echo ===================================================
node server.js
pause

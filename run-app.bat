@echo off
title Launch PharmaReserve Application
echo =====================================================================
echo  PharmaReserve - Pharmacy Availability & Reservation System
echo  University DBMS Project Launcher
echo =====================================================================
echo.
echo Launching Backend Server in new window...
start "PharmaReserve Backend API" cmd /k "cd /d "%~dp0backend" && node server.js"
echo.
echo Launching Frontend Development Server in new window...
start "PharmaReserve Frontend Client" cmd /k "cd /d "%~dp0frontend" && npm run dev"
echo.
echo =====================================================================
echo  Both servers launched!
echo  Backend:  http://localhost:5000/api
echo  Frontend: http://localhost:5173
echo =====================================================================
timeout /t 3 >nul
start http://localhost:5173

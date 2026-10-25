@echo off
title PharmaReserve - Frontend Client
cd /d "%~dp0frontend"
echo ===================================================
echo  Starting PharmaReserve Vite Frontend (Port 5173)
echo ===================================================
npm run dev
pause

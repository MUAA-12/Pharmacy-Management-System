@echo off
title PharmaReserve - DBMS Transaction Tests
cd /d "%~dp0backend"
echo =====================================================================
echo  PharmaReserve - Running ACID Transaction & Database Test Suite
echo =====================================================================
node tests/transactionTest.js
echo.
pause

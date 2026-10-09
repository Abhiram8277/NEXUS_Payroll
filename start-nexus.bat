@echo off
TITLE NEXUS — Payroll, without the paperwork.
echo ====================================================
echo  Starting NEXUS Payroll Platform...
echo  "Payroll, without the paperwork."
echo ====================================================

:: Launch the background database and servers
start "NEXUS PostgreSQL Daemon" /MIN node scripts/start-db.js
timeout /t 2 /nobreak >nul

start "NEXUS Backend Engine" /MIN node backend/dist/server.js
timeout /t 2 /nobreak >nul

start "NEXUS Frontend Server" /MIN npm --workspace=frontend run dev
timeout /t 2 /nobreak >nul

echo.
echo ====================================================
echo  NEXUS is now running!
echo  Frontend: http://localhost:5173
echo  Backend:  http://localhost:5000
echo ====================================================
echo.

:: Open default browser to the web app
start http://localhost:5173

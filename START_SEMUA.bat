@echo off
title Smart Learning — Launcher Lengkap
color 0B
cls
echo ==============================================================================
echo       SYNTAX SLAYER SMART LEARNING - FULL SYSTEM LAUNCHER
echo ==============================================================================
echo.
echo [1/2] Menyalakan Mesin AI Vision Camera di Port 5000...
start "AI Vision Camera Engine (Port 5000)" cmd /k "cd /d "%~dp0" && "%~dp0.venv312\Scripts\python.exe" experiments\cv-poc\main.py --source 0 --port 5000 --headless"

echo [2/2] Menyalakan Web Dashboard di Port 3000...
start "Smart Learning Web App (Port 3000)" cmd /k "cd /d "%~dp0" && npm run dev"

timeout /t 3 >nul
echo.
echo [*] Membuka web browser ke http://localhost:3000 ...
start http://localhost:3000

echo.
echo [V] Sistem aktif dan siap digunakan!
timeout /t 5 >nul
exit

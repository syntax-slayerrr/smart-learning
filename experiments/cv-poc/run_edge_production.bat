@echo off
TITLE AI Classroom Vision Engine — Production Watchdog
COLOR 0A

echo ==============================================================================
echo  SYNTAX SLAYER SMART LEARNING — EDGE VISION PRODUCTION WATCHDOG
echo ==============================================================================
echo  Mode: Auto-Restart Daemon (Ketahanan 24/7 di Perangkat Kelas)
echo ==============================================================================

:: 1. Tentukan executable Python
set "PYTHON_EXE=..\..\.venv312\Scripts\python.exe"
if not exist "%PYTHON_EXE%" (
    set "PYTHON_EXE=python.exe"
)

:RUN_LOOP
echo [%DATE% %TIME%] Memulai AI Classroom Intelligence Engine...
"%PYTHON_EXE%" -X faulthandler -u main.py --source 0 --port 5000 --headless

set EXIT_CODE=%ERRORLEVEL%
echo [!] Engine terhenti dengan kode keluar: %EXIT_CODE%
echo [%DATE% %TIME%] Kamera terlepas atau proses terhenti. Menyambung ulang dalam 3 detik...
timeout /t 3 /nobreak >nul
goto RUN_LOOP

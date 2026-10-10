@echo off
title Smart Learning — AI Vision Camera Engine
color 0A
cls
echo ==============================================================================
echo       SYNTAX SLAYER SMART LEARNING - AI VISION ENGINE (PORT 5000)
echo ==============================================================================
echo.
echo [*] Memulai AI Edge Vision Engine...
echo [*] Alamat Stream: http://localhost:5000/video_feed
echo [*] Status API:    http://localhost:5000/status
echo.
echo Tekan Ctrl+C untuk menghentikan mesin kapan saja.
echo ------------------------------------------------------------------------------
echo.

cd /d "%~dp0"
"%~dp0.venv312\Scripts\python.exe" -X faulthandler -u experiments\cv-poc\main.py --source 0 --port 5000 --headless

if %errorlevel% neq 0 (
    echo.
    echo [!] Terjadi kendala saat menjalankan mesin kamera.
    echo [!] Pastikan webcam tidak sedang digunakan oleh aplikasi lain (Zoom, Teams, dsb).
    pause
)

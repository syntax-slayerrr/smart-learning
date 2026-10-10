#!/usr/bin/env bash
# ==============================================================================
# SYNTAX SLAYER SMART LEARNING — LINUX EDGE VISION PRODUCTION WATCHDOG
# Jalankan di Raspberry Pi / Intel NUC / Ubuntu Edge Box
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PYTHON_BIN="../../.venv/bin/python"
if [ ! -f "$PYTHON_BIN" ]; then
    PYTHON_BIN="python3"
fi

echo "[+] Memulai AI Classroom Intelligence Engine Watchdog..."

while true; do
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Menjalankan Engine..."
    "$PYTHON_BIN" -X faulthandler -u main.py --source 0 --port 5000 --headless
    
    EXIT_CODE=$?
    echo "[!] Engine berhenti dengan kode: $EXIT_CODE"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Menyambung ulang dalam 3 detik..."
    sleep 3
done

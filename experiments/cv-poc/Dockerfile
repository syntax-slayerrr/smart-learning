# ==============================================================================
# SYNTAX SLAYER CV ENGINE — Dockerfile untuk Deplexo Cloud Deployment
# ==============================================================================
# Base: Python 3.12 slim (headless, tanpa display GUI)
# Fungsi: Menerima kamera IP/RTSP sebagai input → analitik AI → kirim telemetri ke Vercel
# ==============================================================================

FROM python:3.12-slim

# ─── System dependencies: OpenCV, MediaPipe, dan CV libraries ─────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libgl1 \
    libglib2.0-dev \
    libgomp1 \
    libopencv-dev \
    libavcodec-dev \
    libavformat-dev \
    libswscale-dev \
    wget \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# ─── Working directory ────────────────────────────────────────────────────────
WORKDIR /app

# ─── Copy requirements first for Docker layer caching ─────────────────────────
COPY requirements.txt .

# ─── Install Python dependencies (hemat memory & cepat) ───────────────────────
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ─── Copy seluruh source code CV Engine ───────────────────────────────────────
COPY . .

# ─── Port yang dibuka oleh MJPEG Server ───────────────────────────────────────
EXPOSE 5000

# ─── Health check bawaan Docker ───────────────────────────────────────────────
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:5000/status || exit 1

# ─── Entry point: headless mode, sumber kamera dari ENV variable ───────────────
# ENV variables yang bisa diset di Deplexo dashboard:
#   CAMERA_SOURCE   → URL RTSP atau IP Webcam (contoh: rtsp://192.168.1.100:554/live)
#   API_URL         → URL Next.js produksi Vercel (contoh: https://smart-learning-black.vercel.app/api/telemetry/ingest)
#   DEVICE_KEY      → Secret key dari .env (EDGE_DEVICE_SECRET)
#   SESSION_ID      → UUID sesi kelas (opsional, bisa di-set default)
#   PORT            → Port server (default: 5000)

CMD python main.py \
    --source "${CAMERA_SOURCE:-http://10.10.10.33:8080/video}" \
    --port "${PORT:-5000}" \
    --api-url "${API_URL:-https://smart-learning-black.vercel.app/api/telemetry/ingest}" \
    --device-key "${DEVICE_KEY:-dev-edge-secret-key-2026}" \
    --session-id "${SESSION_ID:-00000000-0000-0000-0000-000000000001}" \
    --headless

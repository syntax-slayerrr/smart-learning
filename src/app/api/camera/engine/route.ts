import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

export const dynamic = "force-dynamic";

async function isEngineRunning(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1200);
    const res = await fetch("http://127.0.0.1:5000/status", {
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

function startEngineProcess(): boolean {
  try {
    const rootDir = process.cwd();
    const pythonExe = path.join(rootDir, ".venv312", "Scripts", "python.exe");
    const scriptPath = path.join(rootDir, "experiments", "cv-poc", "main.py");

    if (!fs.existsSync(pythonExe) || !fs.existsSync(scriptPath)) {
      return false;
    }

    const child = spawn(
      pythonExe,
      ["-X", "faulthandler", "-u", scriptPath, "--source", "0", "--port", "5000", "--headless"],
      {
        cwd: rootDir,
        detached: true,
        stdio: "ignore",
        windowsHide: false,
      }
    );

    child.unref();
    return true;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const isRunning = await isEngineRunning();

  if (!isRunning) {
    startEngineProcess();
  }

  // Jika diakses langsung oleh user di address bar browser
  const acceptHeader = request.headers.get("accept") || "";
  if (acceptHeader.includes("text/html")) {
    const html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Smart Learning — AI Camera Engine</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #09090b;
      color: #fafafa;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
    }
    .card {
      background: #18181b;
      border: 1px border #27272a;
      border-radius: 16px;
      padding: 32px;
      max-width: 440px;
      width: 100%;
      box-shadow: 0 8px 30px rgba(0,0,0,0.5);
      text-align: center;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      font-family: monospace;
      background: rgba(16, 185, 129, 0.1);
      color: #10b981;
      border: 1px solid rgba(16, 185, 129, 0.25);
      margin-bottom: 16px;
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(1.2); }
    }
    h1 { font-size: 18px; font-weight: 800; margin: 0 0 8px; letter-spacing: -0.02em; }
    p { font-size: 13px; color: #a1a1aa; line-height: 1.5; margin: 0 0 24px; }
    .btn-group { display: flex; flex-direction: column; gap: 10px; }
    .btn {
      display: inline-block;
      padding: 11px 18px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.15s;
    }
    .btn-primary { background: #ea580c; color: white; }
    .btn-primary:hover { background: #c2410c; }
    .btn-secondary { background: #27272a; color: #e4e4e7; }
    .btn-secondary:hover { background: #3f3f46; }
    .meta { font-size: 11px; font-family: monospace; color: #71717a; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">
      <span class="dot"></span>
      <span>${isRunning ? "PORT 5000 ONLINE" : "MEMULAI MESIN..."}</span>
    </div>
    <h1>AI Vision Camera Engine</h1>
    <p>
      ${
        isRunning
          ? "Mesin Python AI Vision sudah aktif dan siap melayani stream video & telemetri."
          : "Perintah start telah dikirimkan ke mesin Python. Kamera akan segera aktif di port 5000."
      }
    </p>
    <div class="btn-group">
      <a href="/teacher/camera-monitor" class="btn btn-primary">Buka Live Camera Monitor →</a>
      <a href="/teacher" class="btn btn-secondary">Kembali ke Dashboard Guru</a>
    </div>
    <div class="meta">Target: http://127.0.0.1:5000 • Smart Learning</div>
  </div>
</body>
</html>
    `;
    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return NextResponse.json({
    success: true,
    running: true,
    previouslyRunning: isRunning,
    port: 5000,
    streamUrl: "http://localhost:5000/video_feed",
    statusUrl: "http://localhost:5000/status",
  });
}

export async function POST() {
  const isRunning = await isEngineRunning();
  if (isRunning) {
    return NextResponse.json({
      success: true,
      message: "Engine is already running",
      port: 5000,
    });
  }

  const started = startEngineProcess();
  return NextResponse.json({
    success: started,
    message: started ? "Engine started successfully" : "Failed to start engine",
    port: 5000,
  });
}

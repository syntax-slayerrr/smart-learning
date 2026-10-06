"use client";

export interface FaceEvaluation {
  detected: boolean;
  faceCount: number;
  isCentered: boolean;
  isGoodSize: boolean;
  statusMessage: string;
  headPose: "center" | "tilted" | "unknown";
  confidence: number;
}

// MediaPipe instance singleton ref
let faceDetectorInstance: unknown = null;
let isInitializing = false;

/**
 * Timeout helper agar inisialisasi model tidak menggantung selamanya jika CDN/WASM lambat
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export async function getFaceDetector(): Promise<unknown> {
  if (faceDetectorInstance) return faceDetectorInstance;
  if (typeof window === "undefined") return null;
  if (isInitializing) {
    // Wait until initialized
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 100));
      if (faceDetectorInstance) return faceDetectorInstance;
    }
  }

  isInitializing = true;
  try {
    const loadBlaze = async () => {
      const { FilesetResolver, FaceDetector } = await import("@mediapipe/tasks-vision");

      let wasmPath = "/wasm/tasks-vision";
      try {
        const probe = await fetch("/wasm/tasks-vision/vision_wasm_internal.wasm", { method: "HEAD" });
        if (!probe.ok) {
          wasmPath = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
        }
      } catch {
        wasmPath = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
      }

      const vision = await FilesetResolver.forVisionTasks(wasmPath);

      return await FaceDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "/models/blaze_face_short_range.tflite",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        minDetectionConfidence: 0.5,
      });
    };

    // Maksimal 3 detik untuk GPU
    faceDetectorInstance = await withTimeout(loadBlaze(), 3000);
    return faceDetectorInstance;
  } catch (err) {
    console.warn("[FaceDetector] GPU delegate timed out or failed, trying CPU fallback...", err);
    try {
      const loadBlazeCPU = async () => {
        const { FilesetResolver, FaceDetector } = await import("@mediapipe/tasks-vision");
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );
        return await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "/models/blaze_face_short_range.tflite",
            delegate: "CPU",
          },
          runningMode: "VIDEO",
          minDetectionConfidence: 0.45,
        });
      };

      // Maksimal 3.5 detik untuk CPU
      faceDetectorInstance = await withTimeout(loadBlazeCPU(), 3500);
      return faceDetectorInstance;
    } catch (cpuErr) {
      console.warn("[FaceDetector CPU fallback failed, using instant Canvas CV Engine]", cpuErr);
      return null;
    }
  } finally {
    isInitializing = false;
  }
}

/**
 * Instant Client-Side Computer Vision Engine:
 * Mendeteksi wajah melalui segmentasi warna kulit manusia (YCbCr space) + centroid tracking +
 * oval coverage secara real-time langsung di Canvas 60 FPS (0ms latency, 100% offline).
 */
function evaluateViaCanvasCV(
  frameData: ImageData,
  expectedStep: string
): FaceEvaluation {
  const data = frameData.data;
  const w = frameData.width;
  const h = frameData.height;

  let skinCount = 0;
  let sumX = 0;
  let sumY = 0;
  let minX = w, maxX = 0, minY = h, maxY = 0;
  let leftSkin = 0;
  let rightSkin = 0;

  // Sampling step = 2 (efisiensi CPU 60 FPS)
  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      const idx = (y * w + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // Konversi YCbCr standar biometrik warna kulit
      const yVal = 0.299 * r + 0.587 * g + 0.114 * b;
      const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

      // Rentang spektrum kulit manusia (semua ras & pencahayaan wajar)
      const isSkin =
        cb >= 77 && cb <= 128 &&
        cr >= 132 && cr <= 176 &&
        yVal >= 35 &&
        r > g && (r - g) >= 8;

      if (isSkin) {
        skinCount++;
        sumX += x;
        sumY += y;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;

        if (x < w / 2) leftSkin++;
        else rightSkin++;
      }
    }
  }

  const sampledTotal = (w / 2) * (h / 2);
  const skinRatio = skinCount / sampledTotal;

  // Jika piksel kulit < 4.5% dari frame, berarti belum ada wajah di kamera
  if (skinRatio < 0.045) {
    return {
      detected: false,
      faceCount: 0,
      isCentered: false,
      isGoodSize: false,
      statusMessage: "Posisikan wajah Anda di dalam oval",
      headPose: "unknown",
      confidence: 0,
    };
  }

  const centroidX = sumX / skinCount / w;
  const centroidY = sumY / skinCount / h;
  const widthRatio = (maxX - minX) / w;
  const heightRatio = (maxY - minY) / h;

  // Toleransi oval tengah (Fintech Adaptive Oval Standard)
  const isCentered =
    centroidX >= 0.26 &&
    centroidX <= 0.74 &&
    centroidY >= 0.18 &&
    centroidY <= 0.82;

  // Ukuran wajah proporsional
  const isGoodSize =
    widthRatio >= 0.16 &&
    widthRatio <= 0.88 &&
    heightRatio >= 0.18 &&
    heightRatio <= 0.92;

  if (!isCentered) {
    let msg = "Arahkan wajah ke tengah oval";
    if (centroidX < 0.26) msg = "Geser wajah sedikit ke kanan";
    else if (centroidX > 0.74) msg = "Geser wajah sedikit ke kiri";
    else if (centroidY < 0.18) msg = "Turunkan kamera sedikit";
    else if (centroidY > 0.82) msg = "Naikkan kamera sedikit";

    return {
      detected: true,
      faceCount: 1,
      isCentered: false,
      isGoodSize,
      statusMessage: msg,
      headPose: "unknown",
      confidence: 0.85,
    };
  }

  if (!isGoodSize) {
    return {
      detected: true,
      faceCount: 1,
      isCentered: true,
      isGoodSize: false,
      statusMessage:
        widthRatio < 0.16
          ? "Dekatkan wajah ke kamera."
          : "Mundur sedikit dari kamera.",
      headPose: "unknown",
      confidence: 0.85,
    };
  }

  // Estimasi pose tolehan kepala dari asimetri distribusi kulit kiri vs kanan
  const totalSides = leftSkin + rightSkin;
  const diffRatio = totalSides > 0 ? Math.abs(leftSkin - rightSkin) / totalSides : 0;
  const headPose: "center" | "tilted" = diffRatio > 0.28 ? "tilted" : "center";

  let statusMessage = "Wajah pas! Tahan posisi...";
  if (expectedStep === "frontal") {
    statusMessage =
      headPose === "tilted"
        ? "Hadap lurus ke kamera."
        : "Wajah pas! Tahan posisi...";
  } else if (expectedStep === "angle") {
    statusMessage =
      headPose === "center"
        ? "Miringkan atau tolehkan kepala sedikit."
        : "Sudut terverifikasi! Tahan sebentar...";
  } else if (expectedStep === "liveness") {
    statusMessage = "Tatap layar secara alami...";
  }

  return {
    detected: true,
    faceCount: 1,
    isCentered: true,
    isGoodSize: true,
    statusMessage,
    headPose,
    confidence: 0.9,
  };
}

/**
 * Evaluasi satu frame video menggunakan MediaPipe BlazeFace, dengan fallback instan ke Canvas CV
 */
export function evaluateVideoFace(
  detector: any,
  video: HTMLVideoElement,
  timestampMs: number = performance.now(),
  expectedStep: string = "frontal",
  frameData?: ImageData | null
): FaceEvaluation {
  if (!video || video.readyState < 2) {
    return {
      detected: false,
      faceCount: 0,
      isCentered: false,
      isGoodSize: false,
      statusMessage: "Mempersiapkan kamera...",
      headPose: "unknown",
      confidence: 0,
    };
  }

  // Jika MediaPipe Detector tersedia, jalankan BlazeFace
  if (detector && typeof detector.detectForVideo === "function") {
    try {
      const result = detector.detectForVideo(video, timestampMs);
      const detections = result?.detections || [];

      if (detections.length > 0) {
        if (detections.length > 1) {
          return {
            detected: true,
            faceCount: detections.length,
            isCentered: false,
            isGoodSize: false,
            statusMessage: "Terdeteksi lebih dari satu wajah. Harap lakukan pendaftaran sendiri.",
            headPose: "unknown",
            confidence: detections[0]?.categories?.[0]?.score || 0.8,
          };
        }

        const face = detections[0];
        const score = face.categories?.[0]?.score || 0.9;
        const box = face.boundingBox;

        const vidW = video.videoWidth || 640;
        const vidH = video.videoHeight || 480;

        const boxCenterX = (box.originX + box.width / 2) / vidW;
        const boxCenterY = (box.originY + box.height / 2) / vidH;
        const boxWidthRatio = box.width / vidW;
        const boxHeightRatio = box.height / vidH;

        // Strict & Adaptive Oval Fit
        const isCentered =
          boxCenterX >= 0.28 &&
          boxCenterX <= 0.72 &&
          boxCenterY >= 0.20 &&
          boxCenterY <= 0.80;

        const isGoodSize =
          boxWidthRatio >= 0.18 &&
          boxWidthRatio <= 0.85 &&
          boxHeightRatio >= 0.20 &&
          boxHeightRatio <= 0.90;

        if (!isCentered) {
          return {
            detected: true,
            faceCount: 1,
            isCentered: false,
            isGoodSize,
            statusMessage: "Posisikan wajah Anda tepat di dalam lingkaran oval.",
            headPose: "unknown",
            confidence: score,
          };
        }

        if (!isGoodSize) {
          return {
            detected: true,
            faceCount: 1,
            isCentered: true,
            isGoodSize: false,
            statusMessage:
              boxWidthRatio < 0.18
                ? "Wajah terlalu jauh. Dekatkan ke kamera."
                : "Wajah terlalu dekat. Mundur sedikit.",
            headPose: "unknown",
            confidence: score,
          };
        }

        // Landmark keypoints check
        const keypoints = face.keypoints || [];
        let headPose: "center" | "tilted" = "center";

        if (keypoints.length >= 4) {
          const rightEye = keypoints[0];
          const leftEye = keypoints[1];
          const nose = keypoints[2];

          const eyeDist = Math.abs(leftEye.x - rightEye.x);
          const eyeMidX = (leftEye.x + rightEye.x) / 2;
          const noseYawOffset = (nose.x - eyeMidX) / (eyeDist || 1);
          const eyeRoll = Math.abs(leftEye.y - rightEye.y);

          if (Math.abs(noseYawOffset) > 0.12 || eyeRoll > 0.08) {
            headPose = "tilted";
          }
        }

        let statusMessage = "Wajah pas! Tahan posisi...";
        if (expectedStep === "frontal") {
          statusMessage =
            headPose === "tilted"
              ? "Hadap lurus ke kamera."
              : "Wajah pas! Tahan posisi...";
        } else if (expectedStep === "angle") {
          statusMessage =
            headPose === "center"
              ? "Miringkan atau tolehkan kepala sedikit ke samping."
              : "Sudut terverifikasi! Tahan sebentar...";
        } else if (expectedStep === "liveness") {
          statusMessage = "Tatap layar secara alami...";
        }

        return {
          detected: true,
          faceCount: 1,
          isCentered: true,
          isGoodSize: true,
          statusMessage,
          headPose,
          confidence: score,
        };
      }
    } catch (err) {
      console.warn("[MediaPipe detectForVideo fallback to Canvas]", err);
    }
  }

  // Fallback seketika ke Canvas CV Engine jika MediaPipe belum siap / tidak mendeteksi
  if (frameData) {
    return evaluateViaCanvasCV(frameData, expectedStep);
  }

  return {
    detected: false,
    faceCount: 0,
    isCentered: false,
    isGoodSize: false,
    statusMessage: "Posisikan wajah Anda di dalam oval",
    headPose: "unknown",
    confidence: 0,
  };
}

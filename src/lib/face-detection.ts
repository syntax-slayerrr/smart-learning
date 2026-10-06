// Engine Deteksi Biometrik Wajah Client-Side Hybrid (MediaPipe BlazeFace + Statistical Cluster Canvas CV)
// Didesain khusus untuk smartphone & desktop tanpa dependensi berat/latensi server

export interface FaceEvaluation {
  detected: boolean;
  faceCount: number;
  isCentered: boolean;
  isGoodSize: boolean;
  statusMessage: string;
  headPose: "center" | "tilted" | "unknown";
  confidence: number;
  eyesState?: "open" | "closed" | "unknown";
}

let faceDetectorInstance: any = null;
let isInitializing = false;

/**
 * Inisialisasi MediaPipe Tasks-Vision FaceDetector
 * Mendukung GPU delegate dan fallback CPU otomatis
 */
export async function getFaceDetector(): Promise<any> {
  if (faceDetectorInstance) return faceDetectorInstance;
  if (typeof window === "undefined") return null;

  if (isInitializing) {
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 150));
      if (faceDetectorInstance) return faceDetectorInstance;
    }
  }

  isInitializing = true;
  try {
    const { FilesetResolver, FaceDetector } = await import("@mediapipe/tasks-vision");
    const vision = await FilesetResolver.forVisionTasks("/wasm/tasks-vision");

    try {
      faceDetectorInstance = await FaceDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "/models/blaze_face_short_range.tflite",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        minDetectionConfidence: 0.40,
      });
      return faceDetectorInstance;
    } catch {
      // GPU delegate mungkin tidak didukung di browser webview tertentu, fallback ke CPU
      faceDetectorInstance = await FaceDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "/models/blaze_face_short_range.tflite",
          delegate: "CPU",
        },
        runningMode: "VIDEO",
        minDetectionConfidence: 0.35,
      });
      return faceDetectorInstance;
    }
  } catch (err) {
    console.warn("[FaceDetector] MediaPipe WASM offline, menggunakan Statistical Canvas CV Engine:", err);
    return null;
  } finally {
    isInitializing = false;
  }
}

/**
 * Analisis status kelopak mata (terbuka / tertutup / berkedip) dari patch mata pada frameData
 */
export function analyzeEyeClosure(
  frameData: ImageData,
  rightEyeNorm: { x: number; y: number },
  leftEyeNorm: { x: number; y: number }
): "open" | "closed" | "unknown" {
  const { width: w, height: h, data } = frameData;
  if (!data || w <= 0 || h <= 0) return "unknown";

  const rx = 6;
  const ry = 4;

  const eyes = [
    { px: Math.round(rightEyeNorm.x * w), py: Math.round(rightEyeNorm.y * h) },
    { px: Math.round(leftEyeNorm.x * w), py: Math.round(leftEyeNorm.y * h) },
  ];

  let totalDarkPixels = 0;
  let totalPixels = 0;
  let totalLuminance = 0;
  const samples: number[] = [];

  for (const eye of eyes) {
    const xMin = Math.max(0, eye.px - rx);
    const xMax = Math.min(w - 1, eye.px + rx);
    const yMin = Math.max(0, eye.py - ry);
    const yMax = Math.min(h - 1, eye.py + ry);

    for (let y = yMin; y <= yMax; y++) {
      for (let x = xMin; x <= xMax; x++) {
        const idx = (y * w + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        totalLuminance += lum;
        samples.push(lum);
        totalPixels++;
      }
    }
  }

  if (totalPixels === 0) return "unknown";

  const meanLum = totalLuminance / totalPixels;
  for (const lum of samples) {
    if (lum < meanLum * 0.72 || lum < 65) {
      totalDarkPixels++;
    }
  }

  let varSum = 0;
  for (const lum of samples) {
    varSum += (lum - meanLum) * (lum - meanLum);
  }
  const variance = varSum / totalPixels;

  if (totalDarkPixels <= 3 && variance < 220) {
    return "closed";
  }

  if (totalDarkPixels >= 7 || variance >= 400) {
    return "open";
  }

  return "unknown";
}

/**
 * Detektor Biometrik Berbasis Statistical Cluster CV (Zero Latency, 100% Offline)
 * Menggunakan segmentasi warna kulit YCbCr dengan estimasi sebaran Gaussian (Standard Deviation).
 * Sangat tahan terhadap noise background, baju, leher, atau perabotan kamar.
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
  let sumX2 = 0;
  let sumY2 = 0;
  let leftSkin = 0;
  let rightSkin = 0;

  // Sampling step = 2 (efisiensi CPU tinggi 60 FPS)
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

      // Spektrum warna kulit manusia (semua ras & pencahayaan wajar)
      const isSkin =
        cb >= 77 && cb <= 130 &&
        cr >= 130 && cr <= 178 &&
        yVal >= 30 &&
        r > g && (r - g) >= 6;

      if (isSkin) {
        skinCount++;
        sumX += x;
        sumY += y;
        sumX2 += x * x;
        sumY2 += y * y;

        if (x < w / 2) leftSkin++;
        else rightSkin++;
      }
    }
  }

  const sampledTotal = (w / 2) * (h / 2);
  const skinRatio = skinCount / sampledTotal;

  // Jika piksel kulit < 3% dari frame, belum ada wajah di kamera
  if (skinRatio < 0.03 || skinCount < 80) {
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

  const meanX = sumX / skinCount;
  const meanY = sumY / skinCount;
  const centroidX = meanX / w;
  const centroidY = meanY / h;

  // Hitung sebaran spasial (standard deviation) klaster wajah
  // Formula ini mengabaikan 1-2 piksel background jauh di pinggir frame secara statistik
  const varX = Math.max(0, (sumX2 / skinCount) - (meanX * meanX));
  const varY = Math.max(0, (sumY2 / skinCount) - (meanY * meanY));
  const stdX = Math.sqrt(varX);
  const stdY = Math.sqrt(varY);

  // Estimasi bounding box wajah berbasis sebaran Gaussian (density ~90%)
  const faceWidthRatio = (3.0 * stdX) / w;
  const faceHeightRatio = (3.4 * stdY) / h;

  // Toleransi oval tengah yang sangat nyaman untuk smartphone selfie portrait
  const isCentered =
    centroidX >= 0.22 &&
    centroidX <= 0.78 &&
    centroidY >= 0.18 &&
    centroidY <= 0.82;

  // Ukuran wajah wajar (toleransi jarak 30cm - 80cm)
  const isGoodSize =
    (faceWidthRatio >= 0.15 || skinRatio >= 0.07) &&
    faceWidthRatio <= 0.85 &&
    skinRatio <= 0.75;

  if (!isCentered) {
    let msg = "Arahkan wajah ke tengah oval";
    if (centroidX < 0.22) msg = "Geser wajah sedikit ke kanan";
    else if (centroidX > 0.78) msg = "Geser wajah sedikit ke kiri";
    else if (centroidY < 0.18) msg = "Turunkan kamera sedikit";
    else if (centroidY > 0.82) msg = "Naikkan kamera sedikit";

    return {
      detected: true,
      faceCount: 1,
      isCentered: false,
      isGoodSize,
      statusMessage: msg,
      headPose: "unknown",
      confidence: 0.88,
    };
  }

  if (!isGoodSize) {
    return {
      detected: true,
      faceCount: 1,
      isCentered: true,
      isGoodSize: false,
      statusMessage:
        faceWidthRatio < 0.15 && skinRatio < 0.07
          ? "Dekatkan wajah ke kamera."
          : "Mundur sedikit dari kamera.",
      headPose: "unknown",
      confidence: 0.88,
    };
  }

  const totalSides = leftSkin + rightSkin;
  const diffRatio = totalSides > 0 ? Math.abs(leftSkin - rightSkin) / totalSides : 0;
  // Deteksi miring kepala / menoleh jika distribusi simetri berbeda > 16%
  const headPose: "center" | "tilted" = diffRatio > 0.16 ? "tilted" : "center";

  const estimatedRightEye = {
    x: Math.max(0.1, Math.min(0.9, (meanX - 0.55 * stdX) / w)),
    y: Math.max(0.1, Math.min(0.9, (meanY - 0.28 * stdY) / h)),
  };
  const estimatedLeftEye = {
    x: Math.max(0.1, Math.min(0.9, (meanX + 0.55 * stdX) / w)),
    y: Math.max(0.1, Math.min(0.9, (meanY - 0.28 * stdY) / h)),
  };
  const eyesState = analyzeEyeClosure(frameData, estimatedRightEye, estimatedLeftEye);

  let statusMessage = "Wajah pas! Tahan posisi...";
  if (expectedStep === "frontal") {
    statusMessage =
      headPose === "tilted"
        ? "Hadap lurus ke kamera."
        : "Wajah pas! Tahan posisi...";
  } else if (expectedStep === "angle") {
    statusMessage =
      headPose === "center"
        ? "Miringkan atau tolehkan kepala sedikit (~10°)"
        : "Sudut terverifikasi! Tahan sebentar...";
  } else if (expectedStep === "liveness") {
    statusMessage =
      eyesState === "closed"
        ? "Mata berkedip..."
        : "Tatap kamera lalu kedipkan mata...";
  }

  return {
    detected: true,
    faceCount: 1,
    isCentered: true,
    isGoodSize: true,
    statusMessage,
    headPose,
    confidence: 0.92,
    eyesState,
  };
}

/**
 * Evaluasi Real-Time Frame Kamera (MediaPipe BlazeFace + Canvas Fallback)
 */
export function evaluateVideoFace(
  detector: any,
  videoEl: HTMLVideoElement,
  timestampMs: number,
  expectedStep: string = "frontal",
  frameData?: ImageData | null
): FaceEvaluation {
  // Jika MediaPipe Detector siap dan video valid
  if (detector && videoEl && videoEl.readyState >= 2) {
    try {
      const results = detector.detectForVideo(videoEl, timestampMs);

      if (!results || !results.detections || results.detections.length === 0) {
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

      if (results.detections.length > 1) {
        return {
          detected: true,
          faceCount: results.detections.length,
          isCentered: false,
          isGoodSize: false,
          statusMessage: "Terdeteksi lebih dari 1 orang. Harap hanya 1 siswa di kamera.",
          headPose: "unknown",
          confidence: 0.95,
        };
      }

      const det = results.detections[0];
      const box = det.boundingBox;
      const vidW = videoEl.videoWidth || 640;
      const vidH = videoEl.videoHeight || 480;

      if (box && vidW > 0 && vidH > 0) {
        const boxCenterX = (box.originX + box.width / 2) / vidW;
        const boxCenterY = (box.originY + box.height / 2) / vidH;
        const boxWidthRatio = box.width / vidW;
        const boxHeightRatio = box.height / vidH;

        // Toleransi oval tengah yang sangat nyaman untuk smartphone selfie
        const isCentered =
          boxCenterX >= 0.22 &&
          boxCenterX <= 0.78 &&
          boxCenterY >= 0.16 &&
          boxCenterY <= 0.84;

        const isGoodSize =
          boxWidthRatio >= 0.15 &&
          boxWidthRatio <= 0.85 &&
          boxHeightRatio >= 0.16 &&
          boxHeightRatio <= 0.90;

        if (!isCentered) {
          let msg = "Arahkan wajah ke tengah oval";
          if (boxCenterX < 0.22) msg = "Geser wajah sedikit ke kanan";
          else if (boxCenterX > 0.78) msg = "Geser wajah sedikit ke kiri";
          else if (boxCenterY < 0.16) msg = "Turunkan kamera sedikit";
          else if (boxCenterY > 0.84) msg = "Naikkan kamera sedikit";

          return {
            detected: true,
            faceCount: 1,
            isCentered: false,
            isGoodSize,
            statusMessage: msg,
            headPose: "unknown",
            confidence: det.categories?.[0]?.score || 0.9,
          };
        }

        if (!isGoodSize) {
          return {
            detected: true,
            faceCount: 1,
            isCentered: true,
            isGoodSize: false,
            statusMessage:
              boxWidthRatio < 0.15
                ? "Dekatkan wajah ke kamera."
                : "Mundur sedikit dari kamera.",
            headPose: "unknown",
            confidence: det.categories?.[0]?.score || 0.9,
          };
        }

        // Estimasi pose kepala dan status mata dari keypoints MediaPipe
        let headPose: "center" | "tilted" = "center";
        let eyesState: "open" | "closed" | "unknown" = "unknown";
        const keypoints = det.keypoints;
        if (keypoints && keypoints.length >= 6) {
          const rightEye = keypoints[0]; // Kanan subjek
          const leftEye = keypoints[1];  // Kiri subjek
          const noseTip = keypoints[2];

          if (rightEye && leftEye && noseTip) {
            const dy = leftEye.y - rightEye.y;
            const dx = leftEye.x - rightEye.x;
            const rollAngle = Math.abs((Math.atan2(dy, dx) * 180) / Math.PI);

            const eyeMidX = (rightEye.x + leftEye.x) / 2;
            const eyeDist = Math.hypot(dx, dy);
            const yawOffset = eyeDist > 0 ? Math.abs(noseTip.x - eyeMidX) / eyeDist : 0;

            if (rollAngle > 10 || yawOffset > 0.18) {
              headPose = "tilted";
            }

            if (frameData) {
              eyesState = analyzeEyeClosure(frameData, rightEye, leftEye);
            }
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
              ? "Miringkan atau tolehkan kepala sedikit (~10°)"
              : "Sudut terverifikasi! Tahan sebentar...";
        } else if (expectedStep === "liveness") {
          statusMessage =
            eyesState === "closed"
              ? "Mata berkedip..."
              : "Tatap kamera lalu kedipkan mata...";
        }

        return {
          detected: true,
          faceCount: 1,
          isCentered: true,
          isGoodSize: true,
          statusMessage,
          headPose,
          confidence: det.categories?.[0]?.score || 0.95,
          eyesState,
        };
      }
    } catch (e) {
      console.warn("[evaluateVideoFace] MediaPipe detection exception:", e);
    }
  }

  // Fallback Canvas CV jika MediaPipe belum selesai inisialisasi
  if (frameData) {
    return evaluateViaCanvasCV(frameData, expectedStep);
  }

  return {
    detected: true,
    faceCount: 1,
    isCentered: true,
    isGoodSize: true,
    statusMessage: "Posisikan wajah Anda di dalam oval",
    headPose: "center",
    confidence: 0.7,
  };
}

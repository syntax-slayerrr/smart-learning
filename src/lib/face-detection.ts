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

export async function getFaceDetector() {
  if (faceDetectorInstance) return faceDetectorInstance;
  if (typeof window === "undefined") return null;
  if (isInitializing) {
    // Wait until initialized
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 100));
      if (faceDetectorInstance) return faceDetectorInstance;
    }
  }

  isInitializing = true;
  try {
    const { FilesetResolver, FaceDetector } = await import("@mediapipe/tasks-vision");
    
    // Coba wasm lokal terlebih dahulu, fallback ke CDN jika diperlukan
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

    faceDetectorInstance = await FaceDetector.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: "/models/blaze_face_short_range.tflite",
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      minDetectionConfidence: 0.55,
    });
    return faceDetectorInstance;
  } catch (err) {
    console.warn("[FaceDetector] GPU delegate failed or not supported, retrying with CPU:", err);
    try {
      const { FilesetResolver, FaceDetector } = await import("@mediapipe/tasks-vision");
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
      );
      faceDetectorInstance = await FaceDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "/models/blaze_face_short_range.tflite",
          delegate: "CPU",
        },
        runningMode: "VIDEO",
        minDetectionConfidence: 0.5,
      });
      return faceDetectorInstance;
    } catch (cpuErr) {
      console.error("[FaceDetector Init Failed]", cpuErr);
      return null;
    }
  } finally {
    isInitializing = false;
  }
}

/**
 * Evaluasi satu frame video menggunakan MediaPipe BlazeFace
 */
export function evaluateVideoFace(
  detector: any,
  video: HTMLVideoElement,
  timestampMs: number = performance.now(),
  expectedStep: string = "frontal"
): FaceEvaluation {
  if (!detector || !video || video.readyState < 2) {
    return {
      detected: false,
      faceCount: 0,
      isCentered: false,
      isGoodSize: false,
      statusMessage: "Menyiapkan sensor kamera...",
      headPose: "unknown",
      confidence: 0,
    };
  }

  try {
    const result = detector.detectForVideo(video, timestampMs);
    const detections = result?.detections || [];

    if (detections.length === 0) {
      return {
        detected: false,
        faceCount: 0,
        isCentered: false,
        isGoodSize: false,
        statusMessage: "Wajah tidak terdeteksi. Arahkan kamera ke wajah Anda.",
        headPose: "unknown",
        confidence: 0,
      };
    }

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

    // Normalisasi koordinat bounding box ke rasio 0.0 - 1.0 terhadap dimensi video
    const vidW = video.videoWidth || 640;
    const vidH = video.videoHeight || 480;

    const boxCenterX = (box.originX + box.width / 2) / vidW;
    const boxCenterY = (box.originY + box.height / 2) / vidH;
    const boxWidthRatio = box.width / vidW;
    const boxHeightRatio = box.height / vidH;

    // 1. Strict Oval Fit (Fintech Standard)
    // Titik pusat wajah harus berada di area tengah (32% - 68% X, 25% - 72% Y)
    const isCentered =
      boxCenterX >= 0.32 &&
      boxCenterX <= 0.68 &&
      boxCenterY >= 0.25 &&
      boxCenterY <= 0.72;

    // Ukuran wajah harus proporsional di dalam oval (tidak terlalu jauh atau terlalu dekat)
    const isGoodSize =
      boxWidthRatio >= 0.22 &&
      boxWidthRatio <= 0.78 &&
      boxHeightRatio >= 0.25 &&
      boxHeightRatio <= 0.85;

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
          boxWidthRatio < 0.22
            ? "Wajah terlalu jauh. Dekatkan ke kamera."
            : "Wajah terlalu dekat. Mundur sedikit.",
        headPose: "unknown",
        confidence: score,
      };
    }

    // 2. Pose & Landmark Analysis (Keypoints: 0=right_eye, 1=left_eye, 2=nose, 3=mouth)
    const keypoints = face.keypoints || [];
    let headPose: "center" | "tilted" = "center";

    if (keypoints.length >= 4) {
      const rightEye = keypoints[0];
      const leftEye = keypoints[1];
      const nose = keypoints[2];

      // Jarak horizontal mata ke hidung
      const eyeDist = Math.abs(leftEye.x - rightEye.x);
      const eyeMidX = (leftEye.x + rightEye.x) / 2;
      const noseYawOffset = (nose.x - eyeMidX) / (eyeDist || 1);

      // Kemiringan mata (roll)
      const eyeRoll = Math.abs(leftEye.y - rightEye.y);

      // Jika ada tolehan horizontal atau tilt signifikan
      if (Math.abs(noseYawOffset) > 0.12 || eyeRoll > 0.08) {
        headPose = "tilted";
      }
    }

    // 3. Step Guidance
    let statusMessage = "Tahan posisi Anda...";
    if (expectedStep === "frontal") {
      if (headPose === "tilted") {
        statusMessage = "Hadap lurus ke kamera.";
      } else {
        statusMessage = "Wajah terdeteksi sempurna. Tahan posisi...";
      }
    } else if (expectedStep === "angle") {
      if (headPose === "center") {
        statusMessage = "Miringkan atau tolehkan kepala sedikit ke samping.";
      } else {
        statusMessage = "Sudut terverifikasi! Tahan sebentar...";
      }
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
  } catch (err) {
    console.error("[evaluateVideoFace error]", err);
    return {
      detected: false,
      faceCount: 0,
      isCentered: false,
      isGoodSize: false,
      statusMessage: "Sedang menganalisis wajah...",
      headPose: "unknown",
      confidence: 0,
    };
  }
}

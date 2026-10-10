import { NextRequest } from "next/server";

/**
 * Enterprise Security Guardrails & Request Validation Helpers
 * Inspired by SuaraKita's centralized security architecture (includes/security.php).
 */

const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^169\.254\./, // AWS / GCP / Azure Instance Metadata Service
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
];

/**
 * Validates external camera tunnel / edge server URLs to prevent Server-Side Request Forgery (SSRF).
 * Blocks RFC1918 private subnets, loopbacks, and cloud metadata IP (169.254.169.254).
 */
export function validateTunnelUrl(candidateUrl: string | null | undefined): string | null {
  if (!candidateUrl || typeof candidateUrl !== "string") {
    return null;
  }

  try {
    const parsed = new URL(candidateUrl.trim());

    // Only allow HTTP/HTTPS
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    const hostname = parsed.hostname.toLowerCase();

    // In production, strictly block local, private, and cloud metadata endpoints
    if (process.env.NODE_ENV === "production") {
      for (const pattern of BLOCKED_HOST_PATTERNS) {
        if (pattern.test(hostname)) {
          return null;
        }
      }
    }

    return parsed.origin;
  } catch {
    return null;
  }
}

/**
 * Verifies CRON execution authorization.
 * Strict comparison against CRON_SECRET. Rejects unauthenticated requests when secret is missing.
 */
export function verifyCronAuthorization(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || cronSecret.trim().length < 8) {
    // If CRON_SECRET is not configured or too weak, reject execution in non-test environments
    return false;
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;

  const expectedBearer = `Bearer ${cronSecret}`;
  return authHeader === expectedBearer;
}

/**
 * Verifies Edge Device telemetry & stream requests.
 * Uses timing-safe verification or strict equality against EDGE_DEVICE_SECRET.
 */
export function verifyEdgeDeviceAuthorization(request: NextRequest): boolean {
  const edgeDeviceKey = request.headers.get("x-edge-device-key");
  const configuredSecret = process.env.EDGE_DEVICE_SECRET;

  if (process.env.NODE_ENV === "production") {
    if (!configuredSecret || configuredSecret.length < 8) {
      return false;
    }
    return edgeDeviceKey === configuredSecret;
  }

  // Development fallback
  const devSecret = configuredSecret || "dev-edge-secret-key-2026";
  return edgeDeviceKey === devSecret;
}

/**
 * Type-safe input sanitizer preventing stored/reflected XSS in user payloads.
 */
export function sanitizeText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .trim();
}

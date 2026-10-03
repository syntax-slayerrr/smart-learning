// ============================================
// Rate Limiting Utility — SYNTAX SLAYER
// In-memory rate limiter for API routes.
// For production at scale, replace with Redis.
// ============================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt < now) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

interface RateLimitConfig {
  /** Maximum number of requests allowed within the window */
  maxRequests: number;
  /** Time window in seconds */
  windowSeconds: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check if a request is within rate limits.
 * 
 * @param identifier - Unique key (e.g. IP address, user ID)
 * @param config - Rate limit configuration
 * @returns Whether the request is allowed and remaining quota
 * 
 * @example
 * ```ts
 * const result = checkRateLimit(clientIp, { maxRequests: 10, windowSeconds: 60 });
 * if (!result.allowed) {
 *   return NextResponse.json({ error: "Too many requests" }, { status: 429 });
 * }
 * ```
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;

  const existing = store.get(identifier);

  if (!existing || existing.resetAt < now) {
    // First request or window expired — create new entry
    const entry: RateLimitEntry = {
      count: 1,
      resetAt: now + windowMs,
    };
    store.set(identifier, entry);
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: entry.resetAt,
    };
  }

  // Within window — increment
  existing.count++;
  store.set(identifier, existing);

  if (existing.count > config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
    };
  }

  return {
    allowed: true,
    remaining: config.maxRequests - existing.count,
    resetAt: existing.resetAt,
  };
}

/**
 * Extract client IP from Next.js request headers.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }
  return "unknown";
}

// Pre-defined rate limit configs
export const RATE_LIMITS = {
  /** QR validation: 20 attempts per minute per IP */
  QR_VALIDATE: { maxRequests: 20, windowSeconds: 60 },
  /** Login: 5 attempts per minute per IP */
  LOGIN: { maxRequests: 5, windowSeconds: 60 },
  /** Notification send: 10 calls per minute */
  NOTIFICATION: { maxRequests: 10, windowSeconds: 60 },
  /** General API: 60 requests per minute per IP */
  GENERAL: { maxRequests: 60, windowSeconds: 60 },
} as const;

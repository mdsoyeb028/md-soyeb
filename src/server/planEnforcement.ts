import { Redis } from "@upstash/redis";
import { SubscriptionPlanId } from "../types.ts";
import { CENTRAL_PLANS, getDailyLimitForPlan } from "../data/plans.ts";
import { verifyAuthToken, AuthenticatedUser } from "./auth.ts";

export interface PlanVerificationResult {
  allowed: boolean;
  code?: "daily_limit_reached" | "need_signup" | "fair_use_exceeded";
  message?: string;
  limit: number;
  currentCount: number;
  plan: SubscriptionPlanId | "guest";
  key: string;
}

// In-memory fallback if UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are not configured
const memoryUsageStore = new Map<string, number>();

let redisClient: Redis | null = null;

function getRedis(): Redis | null {
  if (redisClient) return redisClient;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    redisClient = new Redis({ url, token });
    return redisClient;
  }
  return null;
}

export function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Atomic INCR on Upstash Redis (or memory fallback).
 */
async function atomicIncr(key: string): Promise<number> {
  const redis = getRedis();
  if (redis) {
    const count = await redis.incr(key);
    // Set 48-hour expiration on first increment so stale keys clean up automatically
    if (count === 1) {
      await redis.expire(key, 172800).catch(() => {});
    }
    return count;
  }

  // Fallback in-memory counter
  const current = (memoryUsageStore.get(key) || 0) + 1;
  memoryUsageStore.set(key, current);
  return current;
}

/**
 * Atomic DECR on Upstash Redis (or memory fallback) to refund failed or over-limit requests.
 */
async function atomicDecr(key: string): Promise<number> {
  const redis = getRedis();
  if (redis) {
    const count = await redis.decr(key);
    return Math.max(0, count);
  }

  // Fallback in-memory counter
  const current = Math.max(0, (memoryUsageStore.get(key) || 1) - 1);
  memoryUsageStore.set(key, current);
  return current;
}

/**
 * Reserves usage BEFORE the AI call using atomic INCR with key usage:{id}:{YYYY-MM-DD}.
 * Not-logged-in guests get 3 free requests per day per IP.
 * Verified users get daily limits based on their Firestore users/{uid}.plan.
 */
export async function reserveUsage(params: {
  userId: string | null;
  plan: SubscriptionPlanId;
  isGuest: boolean;
  clientIp: string;
}): Promise<PlanVerificationResult> {
  const today = getTodayString();
  const isGuest = params.isGuest || !params.userId;
  const id = !isGuest && params.userId ? params.userId : (params.clientIp || "unknown");
  const key = `usage:${id}:${today}`;

  // 1. Determine plan limit
  // Guests get 3 free requests per day per IP
  const GUEST_DAILY_LIMIT = 3;
  const limit = isGuest ? GUEST_DAILY_LIMIT : getDailyLimitForPlan(params.plan);

  // 2. Atomic INCR to reserve usage
  const count = await atomicIncr(key);

  // 3. Check if over limit
  if (count > limit) {
    // Over limit: immediately refund reservation so counter is not inflated
    await atomicDecr(key);

    if (isGuest) {
      return {
        allowed: false,
        code: "need_signup",
        message: "You have used your 3 free daily requests. Please sign in or create a free account to continue with 10 free AI requests daily.",
        limit: GUEST_DAILY_LIMIT,
        currentCount: count - 1,
        plan: "guest",
        key,
      };
    }

    if (params.plan === "pro") {
      return {
        allowed: false,
        code: "fair_use_exceeded",
        message: "You have reached the Pro daily fair-use processing threshold (1000 requests). Daily limits reset at midnight UTC.",
        limit,
        currentCount: count - 1,
        plan: "pro",
        key,
      };
    }

    return {
      allowed: false,
      code: "daily_limit_reached",
      message: `You have reached your daily limit of ${limit} AI requests for the ${CENTRAL_PLANS[params.plan].name} plan. Please upgrade or try again tomorrow.`,
      limit,
      currentCount: count - 1,
      plan: params.plan,
      key,
    };
  }

  return {
    allowed: true,
    limit,
    currentCount: count,
    plan: isGuest ? "guest" : params.plan,
    key,
  };
}

/**
 * Refunds usage with atomic DECR if the AI call fails.
 */
export async function refundUsage(key: string): Promise<void> {
  if (!key) return;
  try {
    await atomicDecr(key);
  } catch (err) {
    console.error(`Failed to refund usage for key ${key}:`, err);
  }
}

/**
 * Central enforcement helper:
 * Verifies ID token from "Authorization: Bearer <token>", reads plan from Firestore on server,
 * and atomically reserves usage before the AI call. Sends 429 response if rejected.
 * If UPSTASH env variables are missing in production (process.env.VERCEL set), fails closed: returns 503.
 */
export async function enforcePlanLimit(
  req: any,
  res: any
): Promise<{ allowed: boolean; key: string; user: AuthenticatedUser }> {
  const authUser = await verifyAuthToken(req);

  // If UPSTASH env variables are missing in production (process.env.VERCEL set), fail closed: return 503
  if (process.env.VERCEL && (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN)) {
    const errorBody = {
      success: false,
      error: "service_unavailable",
      message: "Rate limiting service is unconfigured in production. Please set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.",
    };
    if (typeof res.status === "function" && typeof res.json === "function") {
      res.status(503).json(errorBody);
    } else {
      res.statusCode = 503;
      if (typeof res.setHeader === "function" && !res.headersSent) {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
      }
      res.end(JSON.stringify(errorBody));
    }
    return { allowed: false, key: "", user: authUser };
  }

  const rawIp =
    req.ip ||
    req.headers?.["x-forwarded-for"] ||
    req.socket?.remoteAddress ||
    "127.0.0.1";
  const clientIp = (Array.isArray(rawIp) ? rawIp[0] : String(rawIp))
    .split(",")[0]
    .trim();

  const reservation = await reserveUsage({
    userId: authUser.uid,
    plan: authUser.plan,
    isGuest: authUser.isGuest,
    clientIp,
  });

  if (!reservation.allowed) {
    const errorBody = {
      success: false,
      error: reservation.code,
      message: reservation.message,
      limit: reservation.limit,
      plan: reservation.plan,
    };

    if (typeof res.status === "function" && typeof res.json === "function") {
      res.status(429).json(errorBody);
    } else {
      res.statusCode = 429;
      if (typeof res.setHeader === "function" && !res.headersSent) {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
      }
      res.end(JSON.stringify(errorBody));
    }

    return { allowed: false, key: reservation.key, user: authUser };
  }

  return { allowed: true, key: reservation.key, user: authUser };
}

/**
 * Formats provider limit errors into human-readable messages.
 * Checks err.status === 429 or provider error codes instead of loose substring "429".
 */
export function isProviderQuotaError(error: unknown): boolean {
  if (!error) return false;
  const err = error as any;
  if (err.status === 429 || err.statusCode === 429) {
    return true;
  }
  const code = (err.code || err.error?.code || "").toString().toLowerCase();
  if (
    code === "resource_exhausted" ||
    code === "rate_limit_exceeded" ||
    code === "quota_exceeded" ||
    code === "insufficient_quota" ||
    code === "too_many_requests" ||
    code === "429"
  ) {
    return true;
  }
  const msg = (err.message || "").toString().toLowerCase();
  return (
    msg.includes("resource_exhausted") ||
    msg.includes("rate limit") ||
    msg.includes("quota exceeded") ||
    msg.includes("too many requests")
  );
}

export function getProviderQuotaErrorMessage(): string {
  return "Underlying AI provider capacity limit reached. Please wait a moment or upgrade for priority processing.";
}

/**
 * Daily email dispatch limits per plan:
 * Free: 5/day, Starter: 50/day, Business: 250/day, Pro: 1000/day
 */
const EMAIL_DAILY_LIMITS: Record<SubscriptionPlanId, number> = {
  free: 5,
  starter: 50,
  business: 250,
  pro: 1000,
};

export async function enforceEmailSendLimit(uid: string, plan: SubscriptionPlanId): Promise<{
  allowed: boolean;
  limit: number;
  count: number;
  message?: string;
}> {
  const limit = EMAIL_DAILY_LIMITS[plan] || 5;
  const today = getTodayString();
  const key = `usage:email:${uid}:${today}`;

  const count = await atomicIncr(key);
  if (count > limit) {
    await atomicDecr(key);
    return {
      allowed: false,
      limit,
      count: count - 1,
      message: `Daily email sending limit reached (${limit} emails/day for ${plan.toUpperCase()} plan). Resets at midnight UTC.`,
    };
  }

  return {
    allowed: true,
    limit,
    count,
  };
}

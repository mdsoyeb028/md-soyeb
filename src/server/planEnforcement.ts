import { SubscriptionPlanId } from "../types.ts";
import { CENTRAL_PLANS, getDailyLimitForPlan } from "../data/plans.ts";

export interface PlanVerificationResult {
  allowed: boolean;
  code?: "daily_limit_reached" | "need_signup" | "fair_use_exceeded";
  message?: string;
  limit: number;
  currentCount: number;
  plan: SubscriptionPlanId;
}

interface UserUsageRecord {
  date: string; // YYYY-MM-DD
  count: number;
  plan: SubscriptionPlanId;
  isAnonymous: boolean;
  totalConsultations: number;
}

// In-memory server-authoritative rate/usage tracker indexed by userId or guest identifier
const serverUsageStore = new Map<string, UserUsageRecord>();

function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Verifies if the request is permitted under the user's plan.
 * Does NOT consume credits here - credits are only recorded AFTER a successful AI completion.
 */
export function verifyPlanLimit(params: {
  userId?: string;
  clientPlan?: string;
  isAnonymous?: boolean;
  consultationsUsed?: number;
  clientIp?: string;
}): PlanVerificationResult {
  const today = getTodayString();
  const effectiveId = params.userId || `guest_${params.clientIp || "anon"}`;
  const isAnonymous = Boolean(params.isAnonymous || !params.userId || params.userId.startsWith("guest_"));
  const rawPlan = (params.clientPlan || "free").toLowerCase() as SubscriptionPlanId;
  const plan: SubscriptionPlanId = ["free", "starter", "business", "pro"].includes(rawPlan)
    ? rawPlan
    : "free";

  let record = serverUsageStore.get(effectiveId);
  if (!record || record.date !== today) {
    record = {
      date: today,
      count: 0,
      plan,
      isAnonymous,
      totalConsultations: params.consultationsUsed || 0,
    };
    serverUsageStore.set(effectiveId, record);
  }

  // Update plan if upgraded
  record.plan = plan;

  const dailyLimit = getDailyLimitForPlan(plan);

  // 1. Anonymous Onboarding Threshold:
  // Anonymous users get initial free AI exploration. After 1 consultation, sign up is required.
  if (isAnonymous) {
    if (record.totalConsultations >= 1 || record.count >= 1) {
      return {
        allowed: false,
        code: "need_signup",
        message: "You have used your initial free AI consultation. Please create a free account to continue with 10 free AI requests daily.",
        limit: 1,
        currentCount: record.totalConsultations,
        plan: "free",
      };
    }
    return {
      allowed: true,
      limit: 1,
      currentCount: record.totalConsultations,
      plan: "free",
    };
  }

  // 2. Pro Plan Fair-Use Handling (Subject to provider/fair-use limits)
  if (plan === "pro") {
    // Generous enterprise fair-use cap per day to protect infrastructure from infinite automated loops
    const FAIR_USE_CAP = 1000;
    if (record.count >= FAIR_USE_CAP) {
      return {
        allowed: false,
        code: "fair_use_exceeded",
        message: "You have reached the Pro fair-use processing threshold for today. Consultations will resume at midnight UTC, or contact enterprise support.",
        limit: FAIR_USE_CAP,
        currentCount: record.count,
        plan: "pro",
      };
    }
    return {
      allowed: true,
      limit: Infinity,
      currentCount: record.count,
      plan: "pro",
    };
  }

  // 3. Free (10/day), Starter (50/day), Business (250/day)
  if (record.count >= dailyLimit) {
    return {
      allowed: false,
      code: "daily_limit_reached",
      message: `You have reached your daily limit of ${dailyLimit} AI requests for the ${CENTRAL_PLANS[plan].name} plan. Please upgrade or try again tomorrow.`,
      limit: dailyLimit,
      currentCount: record.count,
      plan,
    };
  }

  return {
    allowed: true,
    limit: dailyLimit,
    currentCount: record.count,
    plan,
  };
}

/**
 * Increments the request count ONLY after a successful AI generation.
 * Failed requests never consume credits.
 */
export function recordSuccessfulUsage(userId?: string, clientIp?: string): { currentCount: number } {
  const today = getTodayString();
  const effectiveId = userId || `guest_${clientIp || "anon"}`;
  let record = serverUsageStore.get(effectiveId);

  if (!record || record.date !== today) {
    record = {
      date: today,
      count: 1,
      plan: "free",
      isAnonymous: Boolean(!userId || userId.startsWith("guest_")),
      totalConsultations: 1,
    };
  } else {
    record.count += 1;
    record.totalConsultations += 1;
  }

  serverUsageStore.set(effectiveId, record);
  return { currentCount: record.count };
}

/**
 * Formats provider limit errors into human-readable messages.
 */
export function isProviderQuotaError(error: unknown): boolean {
  if (!error) return false;
  const str = String(error).toLowerCase();
  return (
    str.includes("resource_exhausted") ||
    str.includes("quota exceeded") ||
    str.includes("rate limit") ||
    str.includes("429") ||
    str.includes("too many requests")
  );
}

export function getProviderQuotaErrorMessage(): string {
  return "Underlying AI provider capacity limit reached. Please wait a moment or upgrade for priority processing.";
}

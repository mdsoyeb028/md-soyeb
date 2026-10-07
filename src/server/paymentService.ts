import crypto from "crypto";
import { getAdminFirestore } from "./auth.ts";
import { getPlanPeriodDays } from "../data/plans.ts";
import { SubscriptionPlanId } from "../types.ts";

export interface PlanActivationResult {
  success: boolean;
  alreadyProcessed: boolean;
  uid: string;
  plan: SubscriptionPlanId;
  planPeriod: "monthly" | "yearly";
  planExpiresAt: string;
}

/**
 * Idempotently activates a user plan in a Firestore transaction.
 * 
 * 1. Checks if paymentId has already been processed to prevent double crediting.
 * 2. Extends plan from current planExpiresAt if still in the future, otherwise from now.
 * 3. Updates users/{uid} with plan, planExpiresAt, planPeriod, lastPaymentId.
 * 4. Records completed transaction in payments/{paymentId}.
 */
export async function activateUserPlan(params: {
  paymentId: string;
  orderId: string;
  uid: string;
  planId: "starter" | "business" | "pro";
  period: "monthly" | "yearly";
  amount: number;
  currency: string;
  source: "verify" | "webhook";
}): Promise<PlanActivationResult> {
  const db = getAdminFirestore();
  if (!db) {
    throw new Error("Database service is temporarily unavailable.");
  }

  const { paymentId, orderId, uid, planId, period, amount, currency, source } = params;

  return await db.runTransaction(async (transaction) => {
    // 1. Check if this paymentId was already completed
    const paymentDocRef = db.collection("payments").doc(paymentId);
    const paymentSnap = await transaction.get(paymentDocRef);

    if (paymentSnap.exists && paymentSnap.data()?.status === "captured") {
      const existingData = paymentSnap.data()!;
      return {
        success: true,
        alreadyProcessed: true,
        uid,
        plan: planId,
        planPeriod: period,
        planExpiresAt: existingData.planExpiresAt || new Date().toISOString(),
      };
    }

    // 2. Read the user's current profile document
    const userDocRef = db.collection("users").doc(uid);
    const userSnap = await transaction.get(userDocRef);
    const currentData = userSnap.data() || {};

    const nowMs = Date.now();
    const currentExpiresAt = currentData.planExpiresAt ? new Date(currentData.planExpiresAt).getTime() : 0;

    // Extend from current expiry if valid and in future; otherwise from now
    const baseMs = currentExpiresAt > nowMs ? currentExpiresAt : nowMs;
    const additionalDays = getPlanPeriodDays(period);
    const newExpiresAtMs = baseMs + additionalDays * 24 * 60 * 60 * 1000;
    const newExpiresAtIso = new Date(newExpiresAtMs).toISOString();

    const timestampIso = new Date().toISOString();

    // 3. Update the user document
    transaction.set(
      userDocRef,
      {
        plan: planId,
        planPeriod: period,
        planExpiresAt: newExpiresAtIso,
        lastPaymentId: paymentId,
        updatedAt: timestampIso,
      },
      { merge: true }
    );

    // 4. Save/update payments/{paymentId} record
    transaction.set(
      paymentDocRef,
      {
        id: paymentId,
        paymentId,
        orderId,
        uid,
        planId,
        period,
        amount,
        currency,
        status: "captured",
        activatedVia: source,
        planExpiresAt: newExpiresAtIso,
        createdAt: paymentSnap.exists ? paymentSnap.data()?.createdAt : timestampIso,
        updatedAt: timestampIso,
      },
      { merge: true }
    );

    // 5. Also mark the order document as paid if it exists in payments/{orderId}
    if (orderId && orderId !== paymentId) {
      const orderDocRef = db.collection("payments").doc(orderId);
      transaction.set(
        orderDocRef,
        {
          status: "paid",
          paymentId,
          updatedAt: timestampIso,
        },
        { merge: true }
      );
    }

    return {
      success: true,
      alreadyProcessed: false,
      uid,
      plan: planId,
      planPeriod: period,
      planExpiresAt: newExpiresAtIso,
    };
  });
}

/**
 * Constant-time safe string comparison to prevent timing attacks.
 */
export function timingSafeEqualString(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a, "utf-8");
  const bufB = Buffer.from(b, "utf-8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verifies Razorpay checkout signature HMAC SHA256 of "orderId|paymentId".
 */
export function verifyRazorpayCheckoutSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
): boolean {
  if (!orderId || !paymentId || !signature || !secret) return false;
  const payload = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  return timingSafeEqualString(expectedSignature, signature);
}

/**
 * Verifies Razorpay Webhook signature HMAC SHA256 of raw request body.
 */
export function verifyRazorpayWebhookSignature(
  rawBody: Buffer | string,
  signature: string,
  webhookSecret: string
): boolean {
  if (!rawBody || !signature || !webhookSecret) return false;
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");
  return timingSafeEqualString(expectedSignature, signature);
}

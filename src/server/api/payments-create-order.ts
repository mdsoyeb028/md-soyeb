import Razorpay from "razorpay";
import { parseRequestBody, sendJsonResponse } from "../serverlessHttp.ts";
import { verifyAuthToken, getAdminFirestore } from "../auth.ts";
import { CreateOrderSchema } from "../schemas.ts";
import { getPlanPriceInPaise } from "../../data/plans.ts";
import { normalizeServerErrorMessage } from "../aiProvider.ts";

// Simple per-user rate limiter for order creation (max 5 orders/min per user)
const orderRateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkOrderRateLimit(uid: string): boolean {
  const now = Date.now();
  const entry = orderRateLimitMap.get(uid);
  if (!entry || now > entry.resetAt) {
    orderRateLimitMap.set(uid, { count: 1, resetAt: now + 60000 });
    return true;
  }
  if (entry.count >= 5) {
    return false;
  }
  entry.count += 1;
  return true;
}

export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (typeof res.status === "function") res.status(204).end();
    else {
      res.statusCode = 204;
      res.end();
    }
    return;
  }

  if (req.method !== "POST") {
    sendJsonResponse(res, 405, {
      success: false,
      error: `Method ${req.method} Not Allowed. Expected POST.`,
    });
    return;
  }

  try {
    // 1. Authenticate user strictly (must be verified non-guest Firebase user)
    const authUser = await verifyAuthToken(req);
    if (!authUser.uid || authUser.isGuest) {
      sendJsonResponse(res, 401, {
        success: false,
        error: "Authentication required. Please sign in with your Google account to upgrade your plan.",
      });
      return;
    }

    if (!checkOrderRateLimit(authUser.uid)) {
      sendJsonResponse(res, 429, {
        success: false,
        error: "Too many order requests. Please wait a moment before trying again.",
      });
      return;
    }

    // 2. Validate request body with Zod
    const rawBody = await parseRequestBody(req);
    const parseResult = CreateOrderSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues[0]?.message || "Invalid order parameters.";
      sendJsonResponse(res, 400, { success: false, error: errorMsg });
      return;
    }

    const { planId, period } = parseResult.data;

    // 3. Compute price in paise strictly on the server from CENTRAL_PLANS
    const amountInPaise = getPlanPriceInPaise(planId, period);

    // 4. Validate Razorpay credentials
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      sendJsonResponse(res, 503, {
        success: false,
        error: "Payment gateway is currently undergoing maintenance. Please try again shortly or contact support.",
      });
      return;
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    // 5. Create Razorpay Order
    const receiptId = `rcpt_${authUser.uid.slice(0, 8)}_${Date.now()}`;
    const orderOptions = {
      amount: amountInPaise,
      currency: "INR",
      receipt: receiptId.slice(0, 40),
      notes: {
        uid: authUser.uid,
        planId,
        period,
        email: authUser.email || "",
      },
    };

    const razorpayOrder = await razorpay.orders.create(orderOptions);

    // 6. Record pending payment/order in Firestore payments/{orderId} via firebase-admin
    const db = getAdminFirestore();
    if (db) {
      const nowIso = new Date().toISOString();
      await db
        .collection("payments")
        .doc(razorpayOrder.id)
        .set({
          id: razorpayOrder.id,
          orderId: razorpayOrder.id,
          uid: authUser.uid,
          userEmail: authUser.email || null,
          planId,
          period,
          amount: amountInPaise / 100, // stored in INR
          amountInPaise,
          currency: "INR",
          status: "created",
          receipt: orderOptions.receipt,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
    }

    sendJsonResponse(res, 200, {
      success: true,
      orderId: razorpayOrder.id,
      amount: amountInPaise,
      currency: "INR",
      keyId,
      planId,
      period,
    });
  } catch (err: unknown) {
    console.error("Payment create-order error:", err);
    sendJsonResponse(res, 500, {
      success: false,
      error: normalizeServerErrorMessage(err, "Failed to create payment order."),
    });
  }
}

import { parseRequestBody, sendJsonResponse } from "../serverlessHttp.ts";
import { verifyAuthToken, getAdminFirestore } from "../auth.ts";
import { VerifyPaymentSchema } from "../schemas.ts";
import {
  verifyRazorpayCheckoutSignature,
  activateUserPlan,
} from "../paymentService.ts";
import { normalizeServerErrorMessage } from "../aiProvider.ts";

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
    // 1. Authenticate user
    const authUser = await verifyAuthToken(req);
    if (!authUser.uid || authUser.isGuest) {
      sendJsonResponse(res, 401, {
        success: false,
        error: "Authentication required to verify payment.",
      });
      return;
    }

    // 2. Validate request body with Zod
    const rawBody = await parseRequestBody(req);
    const parseResult = VerifyPaymentSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues[0]?.message || "Invalid payment verification data.";
      sendJsonResponse(res, 400, { success: false, error: errorMsg });
      return;
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parseResult.data;

    // 3. Verify signature using timing-safe comparison with RAZORPAY_KEY_SECRET
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      sendJsonResponse(res, 503, {
        success: false,
        error: "Payment verification service is not properly configured.",
      });
      return;
    }

    const isValidSig = verifyRazorpayCheckoutSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      keySecret
    );

    if (!isValidSig) {
      sendJsonResponse(res, 400, {
        success: false,
        error: "Payment verification failed: Invalid transaction signature.",
      });
      return;
    }

    // 4. Check order record in Firestore payments/{orderId} to verify UID match and plan details
    const db = getAdminFirestore();
    if (!db) {
      sendJsonResponse(res, 503, {
        success: false,
        error: "Database service unavailable.",
      });
      return;
    }

    const orderDocSnap = await db.collection("payments").doc(razorpay_order_id).get();
    if (!orderDocSnap.exists) {
      sendJsonResponse(res, 404, {
        success: false,
        error: "Order record not found.",
      });
      return;
    }

    const orderData = orderDocSnap.data();
    if (orderData?.uid !== authUser.uid) {
      sendJsonResponse(res, 403, {
        success: false,
        error: "Security error: Order does not belong to the authenticated user.",
      });
      return;
    }

    const planId = orderData.planId as "starter" | "business" | "pro";
    const period = (orderData.period || "monthly") as "monthly" | "yearly";
    const amount = Number(orderData.amount || 0);

    // 5. Idempotently activate plan via transaction
    const activation = await activateUserPlan({
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      uid: authUser.uid,
      planId,
      period,
      amount,
      currency: "INR",
      source: "verify",
    });

    sendJsonResponse(res, 200, {
      success: true,
      message: "Payment verified successfully. Plan activated!",
      plan: activation.plan,
      planPeriod: activation.planPeriod,
      planExpiresAt: activation.planExpiresAt,
      alreadyProcessed: activation.alreadyProcessed,
    });
  } catch (err: unknown) {
    console.error("Payment verify error:", err);
    sendJsonResponse(res, 500, {
      success: false,
      error: normalizeServerErrorMessage(err, "Failed to verify payment."),
    });
  }
}

import { sendJsonResponse } from "../serverlessHttp.ts";
import { getAdminFirestore } from "../auth.ts";
import {
  verifyRazorpayWebhookSignature,
  activateUserPlan,
} from "../paymentService.ts";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    sendJsonResponse(res, 405, { success: false, error: "Method Not Allowed" });
    return;
  }

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("RAZORPAY_WEBHOOK_SECRET is not configured.");
    sendJsonResponse(res, 500, { success: false, error: "Webhook secret not configured." });
    return;
  }

  const signature = req.headers["x-razorpay-signature"] as string;
  if (!signature) {
    sendJsonResponse(res, 400, { success: false, error: "Missing webhook signature." });
    return;
  }

  // Obtain RAW body buffer for signature verification
  const rawBody = req.rawBody || req.body;
  const isBuffer = Buffer.isBuffer(rawBody);
  const isValidSig = verifyRazorpayWebhookSignature(
    isBuffer ? rawBody : Buffer.from(typeof rawBody === "string" ? rawBody : JSON.stringify(rawBody)),
    signature,
    webhookSecret
  );

  if (!isValidSig) {
    console.warn("Invalid Razorpay webhook signature received.");
    sendJsonResponse(res, 400, { success: false, error: "Invalid webhook signature." });
    return;
  }

  let event: any = null;
  try {
    event = isBuffer ? JSON.parse(rawBody.toString("utf-8")) : (typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody);
  } catch (parseErr) {
    sendJsonResponse(res, 400, { success: false, error: "Malformed webhook JSON." });
    return;
  }

  const eventName = event?.event;
  const payload = event?.payload;

  console.log(`Processing Razorpay webhook event: ${eventName}`);

  const db = getAdminFirestore();
  if (!db) {
    sendJsonResponse(res, 503, { success: false, error: "Database unavailable." });
    return;
  }

  try {
    if (eventName === "payment.captured" || eventName === "order.paid") {
      const paymentEntity = payload?.payment?.entity;
      const orderEntity = payload?.order?.entity;

      const paymentId = paymentEntity?.id;
      const orderId = paymentEntity?.order_id || orderEntity?.id;
      const notes = paymentEntity?.notes || orderEntity?.notes || {};

      let uid = notes.uid;
      let planId = notes.planId as "starter" | "business" | "pro";
      let period = (notes.period || "monthly") as "monthly" | "yearly";
      let amount = Number((paymentEntity?.amount || orderEntity?.amount || 0) / 100);

      // If notes are missing from payment entity, check order document in payments/{orderId}
      if ((!uid || !planId) && orderId) {
        const orderSnap = await db.collection("payments").doc(orderId).get();
        if (orderSnap.exists) {
          const orderData = orderSnap.data();
          uid = uid || orderData?.uid;
          planId = planId || orderData?.planId;
          period = period || orderData?.period || "monthly";
          amount = amount || orderData?.amount || 0;
        }
      }

      if (uid && planId && paymentId) {
        await activateUserPlan({
          paymentId,
          orderId: orderId || paymentId,
          uid,
          planId,
          period,
          amount,
          currency: paymentEntity?.currency || "INR",
          source: "webhook",
        });
        console.log(`Plan ${planId} activated successfully via webhook for uid ${uid}`);
      } else {
        console.warn("Webhook payment.captured event missing required activation fields:", {
          paymentId,
          orderId,
          hasUid: Boolean(uid),
          hasPlanId: Boolean(planId),
        });
      }
    } else if (eventName === "payment.failed") {
      const paymentEntity = payload?.payment?.entity;
      const paymentId = paymentEntity?.id;
      const orderId = paymentEntity?.order_id;
      const notes = paymentEntity?.notes || {};

      if (paymentId) {
        await db.collection("payments").doc(paymentId).set(
          {
            id: paymentId,
            paymentId,
            orderId: orderId || null,
            uid: notes.uid || null,
            status: "failed",
            errorCode: paymentEntity?.error_code || null,
            errorDescription: paymentEntity?.error_description || null,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }
    }

    sendJsonResponse(res, 200, { status: "ok", received: true });
  } catch (err: unknown) {
    console.error("Error processing Razorpay webhook:", err);
    sendJsonResponse(res, 500, { status: "error", message: "Failed to process webhook event." });
  }
}

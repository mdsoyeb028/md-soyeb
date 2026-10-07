import { parseRequestBody, sendJsonResponse } from "../serverlessHttp.ts";
import { normalizeServerErrorMessage } from "../aiProvider.ts";
import { CustomerAppointmentSchema } from "../schemas.ts";
import { getAdminFirestore } from "../auth.ts";
import { loadVerifiedCustomerAgent } from "../customerAgentLoader.ts";

// Simple in-memory IP rate limiter for appointments: max 5 appointments/min per IP
const apptIpRateLimit = new Map<string, { count: number; resetAt: number }>();

function checkApptRateLimit(clientIp: string): boolean {
  const now = Date.now();
  const entry = apptIpRateLimit.get(clientIp);
  if (!entry || now > entry.resetAt) {
    apptIpRateLimit.set(clientIp, { count: 1, resetAt: now + 60000 });
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

  const clientIp = (req.headers?.["x-forwarded-for"] || req.socket?.remoteAddress || "unknown")
    .toString()
    .split(",")[0]
    .trim();

  if (!checkApptRateLimit(clientIp)) {
    sendJsonResponse(res, 429, {
      success: false,
      error: "Too many appointment requests. Please wait a moment before trying again.",
    });
    return;
  }

  try {
    const rawBody = await parseRequestBody(req);
    const parsed = CustomerAppointmentSchema.safeParse(rawBody);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || "Invalid appointment booking data.";
      sendJsonResponse(res, 400, { success: false, error: errorMsg });
      return;
    }

    const {
      agentId,
      customerName,
      customerEmail,
      customerPhone,
      service,
      preferredDate,
      preferredTime,
      notes,
    } = parsed.data;

    // 1. Verify agent existence and get owner UID
    const { ownerUid, config } = await loadVerifiedCustomerAgent(agentId);

    const db = getAdminFirestore();
    if (!db) {
      sendJsonResponse(res, 503, { success: false, error: "Database service unavailable." });
      return;
    }

    const apptId = `appt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const createdAppointment = {
      id: apptId,
      agentId,
      customerName: customerName.trim(),
      customerEmail: (customerEmail || "").trim(),
      customerPhone: (customerPhone || "").trim(),
      service: (service || "General Consultation").trim(),
      preferredDate: (preferredDate || "Earliest available").trim(),
      preferredTime: (preferredTime || "Morning").trim(),
      notes: (notes || "").trim(),
      status: "REQUESTED",
      createdAt: now,
      updatedAt: now,
    };

    // 2. Persist directly into the owner's customerAppointments subcollection using firebase-admin
    await db
      .collection("users")
      .doc(ownerUid)
      .collection("agents")
      .doc(agentId)
      .collection("customerAppointments")
      .doc(apptId)
      .set(createdAppointment);

    // 3. In-app notification task for the owner
    try {
      const notifId = `task_appt_${Date.now()}`;
      await db
        .collection("users")
        .doc(ownerUid)
        .collection("agents")
        .doc(agentId)
        .collection("tasks")
        .doc(notifId)
        .set({
          id: notifId,
          userId: ownerUid,
          agentId,
          title: `Appointment Request: ${createdAppointment.customerName} (${createdAppointment.service})`,
          description: `Requested Date: ${createdAppointment.preferredDate} at ${createdAppointment.preferredTime}. Contact: ${createdAppointment.customerEmail || createdAppointment.customerPhone || "N/A"}`,
          status: "TODO",
          createdAt: now,
          updatedAt: now,
        });
    } catch (notifErr) {
      console.warn("Could not create owner notification task:", notifErr);
    }

    sendJsonResponse(res, 200, {
      success: true,
      appointment: createdAppointment,
      message: `Appointment request submitted to ${config.businessName}. The team will confirm your slot shortly.`,
    });
  } catch (err: unknown) {
    console.error("Error creating customer appointment:", err);
    sendJsonResponse(res, 500, { success: false, error: normalizeServerErrorMessage(err) });
  }
}

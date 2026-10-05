import { parseRequestBody, sendJsonResponse } from "../serverlessHttp.ts";
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
    const body = await parseRequestBody(req);
    const { 
      agentId, 
      customerName, 
      customerEmail, 
      customerPhone, 
      service, 
      preferredDate, 
      preferredTime, 
      notes 
    } = body || {};

    if (!agentId) {
      sendJsonResponse(res, 400, { success: false, error: "agentId is required." });
      return;
    }

    if (!customerName || (!customerEmail && !customerPhone)) {
      sendJsonResponse(res, 400, { success: false, error: "Customer name and either email or phone are required." });
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

    sendJsonResponse(res, 200, {
      success: true,
      appointment: createdAppointment,
      message: "Appointment request received. Our team will verify availability and confirm your booking.",
    });
  } catch (err: unknown) {
    sendJsonResponse(res, 500, { success: false, error: normalizeServerErrorMessage(err) });
  }
}

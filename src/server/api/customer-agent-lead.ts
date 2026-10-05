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
    const { agentId, name, email, phone, requirement, serviceOrProduct, source = "website_widget" } = body || {};

    if (!agentId) {
      sendJsonResponse(res, 400, { success: false, error: "agentId is required." });
      return;
    }

    if (!name && !email && !phone) {
      sendJsonResponse(res, 400, { success: false, error: "At least one contact field (name, email, or phone) is required." });
      return;
    }

    const leadId = `lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const createdLead = {
      id: leadId,
      agentId,
      name: (name || "Website Visitor").trim(),
      email: (email || "").trim(),
      phone: (phone || "").trim(),
      requirement: (requirement || "Customer inquiry through website widget").trim(),
      serviceOrProduct: (serviceOrProduct || "").trim(),
      source,
      status: "NEW",
      createdAt: now,
      lastContactAt: now,
    };

    sendJsonResponse(res, 200, {
      success: true,
      lead: createdLead,
      message: "Lead recorded successfully. The business team has been notified.",
    });
  } catch (err: unknown) {
    sendJsonResponse(res, 500, { success: false, error: normalizeServerErrorMessage(err) });
  }
}

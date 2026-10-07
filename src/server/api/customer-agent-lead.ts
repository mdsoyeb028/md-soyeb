import { parseRequestBody, sendJsonResponse } from "../serverlessHttp.ts";
import { normalizeServerErrorMessage } from "../aiProvider.ts";
import { CustomerLeadSchema } from "../schemas.ts";
import { getAdminFirestore } from "../auth.ts";
import { loadVerifiedCustomerAgent } from "../customerAgentLoader.ts";

// Simple in-memory IP rate limiter for leads to prevent form spam: max 5 leads/min per IP
const leadIpRateLimit = new Map<string, { count: number; resetAt: number }>();

function checkLeadRateLimit(clientIp: string): boolean {
  const now = Date.now();
  const entry = leadIpRateLimit.get(clientIp);
  if (!entry || now > entry.resetAt) {
    leadIpRateLimit.set(clientIp, { count: 1, resetAt: now + 60000 });
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

  if (!checkLeadRateLimit(clientIp)) {
    sendJsonResponse(res, 429, {
      success: false,
      error: "Too many lead submissions. Please wait a moment before submitting again.",
    });
    return;
  }

  try {
    const rawBody = await parseRequestBody(req);
    const parsed = CustomerLeadSchema.safeParse(rawBody);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || "Invalid lead details.";
      sendJsonResponse(res, 400, { success: false, error: errorMsg });
      return;
    }

    const { agentId, name, email, phone, requirement, serviceOrProduct, source } = parsed.data;

    // 1. Verify that the agent exists and fetch owner UID
    const { ownerUid, config } = await loadVerifiedCustomerAgent(agentId);

    const db = getAdminFirestore();
    if (!db) {
      sendJsonResponse(res, 503, { success: false, error: "Database service unavailable." });
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
      source: source || "website_widget",
      status: "NEW",
      createdAt: now,
      lastContactAt: now,
    };

    // 2. Persist directly into the business owner's customerLeads subcollection using firebase-admin
    await db
      .collection("users")
      .doc(ownerUid)
      .collection("agents")
      .doc(agentId)
      .collection("customerLeads")
      .doc(leadId)
      .set(createdLead);

    // 3. In-app notification task for the owner
    try {
      const notifId = `task_lead_${Date.now()}`;
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
          title: `New Customer Lead: ${createdLead.name}`,
          description: `Contact: ${createdLead.email || createdLead.phone || "N/A"}. Requirement: ${createdLead.requirement}`,
          status: "TODO",
          createdAt: now,
          updatedAt: now,
        });
    } catch (notifErr) {
      console.warn("Could not create owner notification task:", notifErr);
    }

    sendJsonResponse(res, 200, {
      success: true,
      lead: createdLead,
      message: `Lead recorded successfully. The team at ${config.businessName} has been notified.`,
    });
  } catch (err: unknown) {
    console.error("Error creating customer lead:", err);
    sendJsonResponse(res, 500, { success: false, error: normalizeServerErrorMessage(err) });
  }
}

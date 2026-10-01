import { parseRequestBody, sendJsonResponse } from "../_lib/serverlessHttp.ts";
import { generateAICompletion, normalizeServerErrorMessage } from "../../src/server/aiProvider.ts";
import { 
  verifyPlanLimit, 
  recordSuccessfulUsage, 
  isProviderQuotaError, 
  getProviderQuotaErrorMessage 
} from "../../src/server/planEnforcement.ts";

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
      reportType, 
      agentConfig, 
      customFocus, 
      language = "English",
      userId,
      userPlan,
      isAnonymous
    } = body || {};

    if (!reportType) {
      sendJsonResponse(res, 400, { success: false, error: "Report type is required." });
      return;
    }

    if (!agentConfig || !agentConfig.name) {
      sendJsonResponse(res, 400, { success: false, error: "Agent configuration is required." });
      return;
    }

    const rawIp = req.headers?.["x-forwarded-for"] || req.socket?.remoteAddress || "127.0.0.1";
    const clientIp = Array.isArray(rawIp) ? rawIp[0] : String(rawIp).split(",")[0].trim();

    // Server-side plan limit check
    const planCheck = verifyPlanLimit({
      userId,
      clientPlan: userPlan,
      isAnonymous,
      clientIp,
    });

    if (!planCheck.allowed) {
      sendJsonResponse(res, 429, {
        success: false,
        error: planCheck.code,
        message: planCheck.message,
        limit: planCheck.limit,
        plan: planCheck.plan,
      });
      return;
    }

    const prompt = `You are a Senior Strategic Business Operations Consultant.
Generate an exhaustive, highly practical ${reportType} specifically for:

Business Name: ${agentConfig.name}
Industry: ${agentConfig.industry}
Location: ${agentConfig.location || "Global"}
Website: ${agentConfig.website || "Not provided"}
Products/Services: ${agentConfig.productsServices || "Not provided"}
Target Customers: ${agentConfig.targetCustomers || "Target audience"}
Business Goals: ${agentConfig.businessGoals || "Scaling revenue and efficiency"}
Custom Focus / Owner Notes: ${customFocus || "Full standard executive audit"}
Language: ${language}

Strict Rules:
- Support this specific legitimate business context.
- Be concrete: write real proposed headlines, outreach scripts, pricing tactics, or technical fixes.
- Distinguish verified facts vs recommended action.
- Produce pure markdown with clear headings, bullet points, and an Immediate 7-Day Action Plan.`;

    const completion = await generateAICompletion(prompt, {
      systemPrompt: `You are an expert strategic business consultant. Write thorough, actionable business reports in ${language}.`,
    });

    // Record usage only on success
    recordSuccessfulUsage(userId, clientIp);

    const reportId = `report_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const title = `${reportType} — ${agentConfig.name}`;
    const summary = `Comprehensive ${reportType} generated for ${agentConfig.name} (${agentConfig.industry}) with immediate execution roadmap.`;

    sendJsonResponse(res, 200, {
      success: true,
      report: {
        id: reportId,
        agentId: agentConfig.id,
        userId: userId || "guest",
        title,
        type: "business",
        category: reportType,
        summary,
        content: completion.text,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (err: unknown) {
    if (isProviderQuotaError(err)) {
      sendJsonResponse(res, 429, { success: false, error: "provider_quota_reached", message: getProviderQuotaErrorMessage() });
      return;
    }
    sendJsonResponse(res, 500, { success: false, error: normalizeServerErrorMessage(err) });
  }
}

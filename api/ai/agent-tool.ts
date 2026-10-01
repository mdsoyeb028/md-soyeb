import { parseRequestBody, sendJsonResponse } from "../_lib/serverlessHttp.ts";
import { executeAgentTool, SupportedAgentTool } from "../../src/server/agentToolDispatcher.ts";
import { 
  verifyPlanLimit, 
  recordSuccessfulUsage, 
  isProviderQuotaError, 
  getProviderQuotaErrorMessage 
} from "../../src/server/planEnforcement.ts";
import { normalizeServerErrorMessage } from "../../src/server/aiProvider.ts";

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
      tool, 
      args, 
      agentConfig, 
      language,
      userId,
      userPlan,
      isAnonymous
    } = body || {};

    if (!tool || typeof tool !== "string") {
      sendJsonResponse(res, 400, { success: false, error: "Tool name is required." });
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

    const toolRes = await executeAgentTool({
      tool: tool as SupportedAgentTool,
      args: args || {},
      agentConfig: agentConfig || { name: "Business", industry: "General", location: "Global" },
      language: language || "English",
    });

    // Record usage only on success
    if (toolRes.success) {
      recordSuccessfulUsage(userId, clientIp);
    }

    sendJsonResponse(res, 200, { success: true, result: toolRes });
  } catch (err: unknown) {
    if (isProviderQuotaError(err)) {
      sendJsonResponse(res, 429, {
        success: false,
        error: "provider_quota_reached",
        message: getProviderQuotaErrorMessage(),
      });
      return;
    }
    sendJsonResponse(res, 500, { success: false, error: normalizeServerErrorMessage(err) });
  }
}

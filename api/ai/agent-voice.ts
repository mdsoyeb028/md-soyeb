import { parseRequestBody, sendJsonResponse } from "../_lib/serverlessHttp.ts";
import { handleAgentVoiceInteraction } from "../../src/server/agentVoiceHandler.ts";
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
      speechText, 
      agentConfig, 
      conversationHistory, 
      language,
      userId,
      userPlan,
      isAnonymous
    } = body || {};

    if (!speechText || typeof speechText !== "string" || !speechText.trim()) {
      sendJsonResponse(res, 400, { success: false, error: "Spoken text is required." });
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

    const voiceRes = await handleAgentVoiceInteraction({
      speechText: speechText.trim(),
      agentConfig,
      conversationHistory,
      language: language || "English",
    });

    // Record usage on success
    recordSuccessfulUsage(userId, clientIp);

    sendJsonResponse(res, 200, { success: true, ...voiceRes });
  } catch (err: unknown) {
    if (isProviderQuotaError(err)) {
      sendJsonResponse(res, 429, { success: false, error: "provider_quota_reached", message: getProviderQuotaErrorMessage() });
      return;
    }
    sendJsonResponse(res, 500, { success: false, error: normalizeServerErrorMessage(err) });
  }
}

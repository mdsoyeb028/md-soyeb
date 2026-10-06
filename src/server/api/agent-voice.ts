import { parseRequestBody, sendJsonResponse } from "../serverlessHttp.ts";
import { handleAgentVoiceInteraction } from "../agentVoiceHandler.ts";
import { 
  enforcePlanLimit, 
  refundUsage, 
  isProviderQuotaError, 
  getProviderQuotaErrorMessage 
} from "../planEnforcement.ts";
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

  const planCheck = await enforcePlanLimit(req, res);
  if (!planCheck.allowed) return;

  try {
    const body = await parseRequestBody(req);
    const { 
      speechText, 
      agentConfig, 
      conversationHistory, 
      language
    } = body || {};

    if (!speechText || typeof speechText !== "string" || !speechText.trim()) {
      await refundUsage(planCheck.key);
      sendJsonResponse(res, 400, { success: false, error: "Spoken text is required." });
      return;
    }

    const voiceRes = await handleAgentVoiceInteraction({
      speechText: speechText.trim(),
      agentConfig,
      conversationHistory,
      language: language || "English",
    });

    sendJsonResponse(res, 200, { success: true, ...voiceRes });
  } catch (err: unknown) {
    await refundUsage(planCheck.key);
    if (isProviderQuotaError(err)) {
      sendJsonResponse(res, 429, { success: false, error: "provider_quota_reached", message: getProviderQuotaErrorMessage() });
      return;
    }
    sendJsonResponse(res, 500, { success: false, error: normalizeServerErrorMessage(err) });
  }
}

import { parseRequestBody, sendJsonResponse } from "../serverlessHttp.ts";
import { handleAgentChat } from "../agentChatHandler.ts";
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
      message, 
      agentConfig, 
      conversationHistory, 
      attachedDocuments, 
      analyzedUrlContext,
      language
    } = body || {};

    if (!message || typeof message !== "string" || !message.trim()) {
      await refundUsage(planCheck.key);
      sendJsonResponse(res, 400, { success: false, error: "Message is required." });
      return;
    }

    if (!agentConfig || !agentConfig.name) {
      await refundUsage(planCheck.key);
      sendJsonResponse(res, 400, { success: false, error: "Active business agent configuration is required." });
      return;
    }

    const chatRes = await handleAgentChat({
      message: message.trim(),
      agentConfig,
      conversationHistory,
      attachedDocuments,
      analyzedUrlContext,
      language,
    });

    sendJsonResponse(res, 200, { success: true, ...chatRes });
  } catch (err: unknown) {
    await refundUsage(planCheck.key);
    if (isProviderQuotaError(err)) {
      sendJsonResponse(res, 429, { success: false, error: "provider_quota_reached", message: getProviderQuotaErrorMessage() });
      return;
    }
    sendJsonResponse(res, 500, { success: false, error: normalizeServerErrorMessage(err) });
  }
}

import { parseRequestBody, sendJsonResponse } from "../serverlessHttp.ts";
import { handleCustomerAgentChat } from "../customerAgentChatHandler.ts";
import { normalizeServerErrorMessage } from "../aiProvider.ts";
import { recordSuccessfulUsage } from "../planEnforcement.ts";

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
      message, 
      customerConfig, 
      conversationHistory, 
      knowledgeItems, 
      businessContext, 
      language,
      userId
    } = body || {};

    if (!message || typeof message !== "string" || !message.trim()) {
      sendJsonResponse(res, 400, { success: false, error: "Customer message is required." });
      return;
    }

    if (!customerConfig || !customerConfig.agentId) {
      sendJsonResponse(res, 400, { success: false, error: "Customer agent configuration is required." });
      return;
    }

    const rawIp = req.headers?.["x-forwarded-for"] || req.socket?.remoteAddress || "127.0.0.1";
    const clientIp = Array.isArray(rawIp) ? rawIp[0] : String(rawIp).split(",")[0].trim();

    const chatRes = await handleCustomerAgentChat({
      message: message.trim(),
      customerConfig,
      conversationHistory,
      knowledgeItems,
      businessContext,
      language,
    });

    if (userId) {
      recordSuccessfulUsage(userId, clientIp);
    }

    sendJsonResponse(res, 200, { success: true, ...chatRes });
  } catch (err: unknown) {
    sendJsonResponse(res, 500, { success: false, error: normalizeServerErrorMessage(err) });
  }
}

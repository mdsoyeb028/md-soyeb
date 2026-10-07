import { parseRequestBody, sendJsonResponse } from "../serverlessHttp.ts";
import { handleCustomerAgentChat } from "../customerAgentChatHandler.ts";
import { normalizeServerErrorMessage } from "../aiProvider.ts";
import { 
  enforcePlanLimit, 
  refundUsage, 
  isProviderQuotaError, 
  getProviderQuotaErrorMessage 
} from "../planEnforcement.ts";
import { CustomerAgentChatSchema } from "../schemas.ts";
import { loadVerifiedCustomerAgent, sanitizeVisitorInput } from "../customerAgentLoader.ts";
import { getAdminFirestore } from "../auth.ts";

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

  const rawBody = await parseRequestBody(req);
  const parseResult = CustomerAgentChatSchema.safeParse(rawBody);
  if (!parseResult.success) {
    const errorMsg = parseResult.error.issues[0]?.message || "Invalid request parameters.";
    sendJsonResponse(res, 400, { success: false, error: errorMsg });
    return;
  }

  const { agentId, message, conversationHistory, language } = parseResult.data;

  // Rate limiting / quota check
  const planCheck = await enforcePlanLimit(req, res);
  if (!planCheck.allowed) return;

  try {
    // 1. Strictly load agent configuration and verified knowledge items from Firestore using firebase-admin
    const { config, knowledgeItems } = await loadVerifiedCustomerAgent(agentId);

    // 2. Sanitize visitor message
    const sanitizedMsg = sanitizeVisitorInput(message);

    // 3. Execute AI response with strict server-loaded knowledge and prompt injection guard
    const chatRes = await handleCustomerAgentChat({
      message: sanitizedMsg,
      customerConfig: config,
      conversationHistory,
      knowledgeItems,
      businessContext: {
        name: config.businessName,
        description: config.businessDescription,
      },
      language,
    });

    sendJsonResponse(res, 200, { success: true, ...chatRes });
  } catch (err: unknown) {
    await refundUsage(planCheck.key);
    if (isProviderQuotaError(err)) {
      sendJsonResponse(res, 429, { 
        success: false, 
        error: "provider_quota_reached", 
        message: getProviderQuotaErrorMessage() 
      });
      return;
    }
    console.error("Error in customer-agent-chat:", err);
    sendJsonResponse(res, 500, { 
      success: false, 
      error: normalizeServerErrorMessage(err) 
    });
  }
}

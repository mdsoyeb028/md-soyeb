import { parseRequestBody, sendJsonResponse } from "../serverlessHttp.ts";
import { handleCustomerAgentChat } from "../customerAgentChatHandler.ts";
import { 
  enforcePlanLimit, 
  refundUsage, 
  isProviderQuotaError, 
  getProviderQuotaErrorMessage 
} from "../planEnforcement.ts";
import { normalizeServerErrorMessage } from "../aiProvider.ts";
import { CustomerAgentVoiceSchema } from "../schemas.ts";
import { loadVerifiedCustomerAgent, sanitizeVisitorInput } from "../customerAgentLoader.ts";

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
  const parseResult = CustomerAgentVoiceSchema.safeParse(rawBody);
  if (!parseResult.success) {
    const errorMsg = parseResult.error.issues[0]?.message || "Invalid voice request parameters.";
    sendJsonResponse(res, 400, { success: false, error: errorMsg });
    return;
  }

  const { agentId, callerAudioTranscript, conversationHistory } = parseResult.data;

  const planCheck = await enforcePlanLimit(req, res);
  if (!planCheck.allowed) return;

  try {
    // 1. Strictly load agent configuration and verified knowledge items from Firestore using firebase-admin
    const { config, knowledgeItems } = await loadVerifiedCustomerAgent(agentId);

    // 2. Sanitize visitor input
    const sanitizedTranscript = sanitizeVisitorInput(callerAudioTranscript);

    const hasTwilioCredentials = Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);

    // 3. Run AI employee conversation handling
    const chatRes = await handleCustomerAgentChat({
      message: sanitizedTranscript,
      conversationHistory: conversationHistory || [],
      customerConfig: config,
      knowledgeItems,
      businessContext: {
        name: config.businessName,
        description: config.businessDescription,
      },
      language: config.language || "English",
    });

    sendJsonResponse(res, 200, {
      success: true,
      audioResponseText: chatRes.replyText,
      intent: chatRes.intent,
      leadData: chatRes.leadData,
      appointmentData: chatRes.appointmentData,
      humanHandoffReason: chatRes.humanHandoffReason,
      telephonyStatus: hasTwilioCredentials ? "ACTIVE_TWILIO_TRUNK" : "PHONE_PROVIDER_NOT_CONNECTED",
      telephonyNotice: hasTwilioCredentials 
        ? "Telephony provider connected" 
        : "Demo Mode (In-Browser Simulation) — Phone provider not connected. Connect Twilio or SIP provider in Integrations to receive live phone calls.",
    });
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
    console.error("Error in customer-agent-voice:", err);
    sendJsonResponse(res, 500, { 
      success: false, 
      error: normalizeServerErrorMessage(err)
    });
  }
}

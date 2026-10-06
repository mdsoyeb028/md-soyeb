import { parseRequestBody, sendJsonResponse } from "../serverlessHttp.ts";
import { handleCustomerAgentChat } from "../customerAgentChatHandler.ts";
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
      agentId, 
      callerAudioTranscript, 
      customerConfig, 
      conversationHistory, 
      knowledgeItems,
      businessContext 
    } = body || {};

    if (!callerAudioTranscript || !callerAudioTranscript.trim()) {
      await refundUsage(planCheck.key);
      sendJsonResponse(res, 400, { success: false, error: "Caller audio transcript is required." });
      return;
    }

    const hasTwilioCredentials = Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);

    // Run AI employee conversation handling
    const chatRes = await handleCustomerAgentChat({
      message: callerAudioTranscript,
      conversationHistory: conversationHistory || [],
      customerConfig: customerConfig || { agentId, agentName: "AI Voice Employee", tone: "Professional" },
      knowledgeItems: knowledgeItems || [],
      businessContext: businessContext || {},
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
        : "Phone provider not connected — connect Twilio or SIP provider in Integrations to receive live phone calls.",
    });
  } catch (err: unknown) {
    await refundUsage(planCheck.key);
    if (isProviderQuotaError(err)) {
      sendJsonResponse(res, 429, { success: false, error: "provider_quota_reached", message: getProviderQuotaErrorMessage() });
      return;
    }
    sendJsonResponse(res, 500, { 
      success: false, 
      error: normalizeServerErrorMessage(err)
    });
  }
}

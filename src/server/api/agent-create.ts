import { parseRequestBody, sendJsonResponse } from "../serverlessHttp.ts";
import { generateBusinessAgentProfile } from "../businessAgentGenerator.ts";
import { 
  enforcePlanLimit, 
  refundUsage, 
  isProviderQuotaError, 
  getProviderQuotaErrorMessage 
} from "../planEnforcement.ts";
import { normalizeServerErrorMessage } from "../aiProvider.ts";

export default async function handler(req: any, res: any) {
  // CORS / Preflight handling
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
      name, 
      industry, 
      country,
      city,
      location, 
      website, 
      productsServices, 
      targetCustomers, 
      description, 
      preferredLanguage, 
      brandTone, 
      socialUrls, 
      businessGoals, 
      customInstructions
    } = body || {};

    if (!name || !industry) {
      await refundUsage(planCheck.key);
      sendJsonResponse(res, 400, {
        success: false,
        error: "Business name and industry are required to create an agent.",
      });
      return;
    }

    const locationComputed = city && country 
      ? `${city}, ${country}` 
      : city || country || location || "Global";

    const generated = await generateBusinessAgentProfile({
      name,
      industry,
      country,
      city,
      location: locationComputed,
      website,
      productsServices,
      targetCustomers,
      description,
      preferredLanguage: preferredLanguage || "English",
      brandTone,
      socialUrls,
      businessGoals,
      customInstructions,
      userId: planCheck.user.uid || undefined,
    });

    sendJsonResponse(res, 200, {
      success: true,
      agent: generated.agent,
      customSystemPrompt: generated.customSystemPrompt,
      recommendedWorkflowTemplates: generated.recommendedWorkflowTemplates,
      initialSuggestedTasks: generated.initialSuggestedTasks,
      quickPrompts: generated.quickPrompts,
    });
  } catch (err: unknown) {
    await refundUsage(planCheck.key);
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

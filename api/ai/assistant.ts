import {
  generateAICompletion,
  AIProviderError,
  normalizeServerErrorMessage,
  safeParseJson,
  getProviderSourceName,
} from "../../src/server/aiProvider";
import { parseRequestBody, sendJsonResponse } from "../../src/server/serverlessHttp";

export default async function handler(req: any, res: any) {
  // Handle CORS / preflight requests if needed
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
    const { query, category, context, conversationHistory } = body || {};

    if (!query || typeof query !== "string" || !query.trim()) {
      sendJsonResponse(res, 400, {
        success: false,
        error: "Inquiry query is required and must not be empty.",
      });
      return;
    }

    if (query.length > 3000) {
      sendJsonResponse(res, 400, {
        success: false,
        error: "Inquiry query exceeds 3,000 characters limit.",
      });
      return;
    }

    const trimmedQuery = query.trim();
    const domainContext =
      category && typeof category === "string" ? category.trim() : "General Business Growth & Export Strategy";
    const extraContext = context && typeof context === "string" ? context.trim() : "";
    const historyText = Array.isArray(conversationHistory)
      ? conversationHistory.map((m: { role?: string; content?: string }) => `${m.role || "user"}: ${m.content || ""}`).join("\n")
      : "";

    const prompt = `You are a world-class senior business growth strategist, digital marketing specialist, international trade consultant, and SEO & branding advisor for the "Business Growth & Export Hub".

SPECIALIZATIONS YOU COVER:
- SEO (Search engine optimization, keywords, technical audits, content strategy)
- Social Media (Platform strategy, viral content hooks, B2B/B2C engagement, publishing calendar)
- Export & International Trade (Market suitability, Incoterms, customs documentation, buyer outreach)
- Business Strategy (Pricing models, unit economics, scaling, operational planning)
- Marketing & Paid Channels (Customer acquisition funnels, conversion rate optimization, positioning)
- Branding & Value Proposition (Brand identity, storytelling, USP, competitor differentiation)
- Customer Communication (B2B cold outreach, sales email scripts, retention, customer support)
- Website & Business Growth (Conversion journeys, retention, internationalization)

USER INQUIRY:
"${trimmedQuery}"

ADDITIONAL USER CONTEXT:
Category: ${domainContext}
Context: ${extraContext || "Not provided"}
${historyText ? `Recent Conversation History:\n${historyText}` : ""}

CRITICAL INTEGRITY & ACCURACY RULES:
1. Do NOT invent fake customers, fake buyers, fake company names, fake phone numbers, fake email addresses, or fake order numbers.
2. Do NOT fabricate revenue figures, guaranteed sales, guaranteed ROI, guaranteed SERP rank #1, or unsubstantiated market statistics.
3. Clearly distinguish estimates, strategic assumptions, and information that requires formal verification.
4. When information touches official regulations, export licenses, tariffs, tax law, FDA/CE compliance, or legal requirements, explicitly mark it as: "Needs verification with the relevant official authority."
5. Give deeply practical, actionable, highly structured advice tailored directly to the user's inquiry.

Respond ONLY with strictly valid JSON matching this exact structure:
{
  "answer": "Direct, insightful, executive-level answer to the user's query explaining the strategy clearly and concisely.",
  "actions": [
    "Action 1: Immediate practical recommendation",
    "Action 2: Tactical optimization step",
    "Action 3: Key workflow execution"
  ],
  "stepByStepPlan": [
    "Step 1: Foundational setup and audit",
    "Step 2: Core strategy implementation",
    "Step 3: Execution and launch",
    "Step 4: Measurement, iteration, and scaling"
  ],
  "importantConsiderations": [
    "Crucial risk or operational caveat",
    "Resource or budget constraint consideration",
    "Compliance or quality requirement - Needs verification with relevant official authority"
  ],
  "nextSteps": [
    "Immediate action to take within the next 24-48 hours",
    "Next key milestone to schedule"
  ],
  "verificationNotice": "Strategic advice and projections are educational estimates. Official regulations, tariffs, tax implications, and legal compliance require verification with the relevant official authority."
}`;

    const { text, provider } = await generateAICompletion(prompt, { jsonMode: true });
    const parsed = safeParseJson<any>(text);

    const markdownContent = [
      `### Strategy & Direct Answer\n${parsed.answer || ""}`,
      parsed.actions && parsed.actions.length > 0
        ? `\n\n### 🎯 Recommended Actions\n${parsed.actions.map((a: string) => `* ${a}`).join("\n")}`
        : "",
      parsed.stepByStepPlan && parsed.stepByStepPlan.length > 0
        ? `\n\n### 🗺️ Step-by-Step Strategic Plan\n${parsed.stepByStepPlan.map((s: string, idx: number) => `${idx + 1}. ${s}`).join("\n")}`
        : "",
      parsed.importantConsiderations && parsed.importantConsiderations.length > 0
        ? `\n\n### ⚠️ Important Considerations & Risks\n${parsed.importantConsiderations.map((c: string) => `* ${c}`).join("\n")}`
        : "",
      parsed.nextSteps && parsed.nextSteps.length > 0
        ? `\n\n### 🚀 Immediate Next Steps\n${parsed.nextSteps.map((n: string) => `* ${n}`).join("\n")}`
        : "",
      `\n\n> **Notice:** ${parsed.verificationNotice || "Needs verification with the relevant official authority or professional advisor."}`,
    ].join("");

    const sourceName = getProviderSourceName(provider);

    sendJsonResponse(res, 200, {
      success: true,
      data: {
        answer: parsed.answer || "Strategy generated successfully.",
        actions: Array.isArray(parsed.actions) ? parsed.actions : [],
        stepByStepPlan: Array.isArray(parsed.stepByStepPlan) ? parsed.stepByStepPlan : [],
        importantConsiderations: Array.isArray(parsed.importantConsiderations) ? parsed.importantConsiderations : [],
        nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps : [],
        verificationNotice: parsed.verificationNotice || "Needs verification with the relevant official authority.",
        content: markdownContent,
        source: sourceName,
      },
      provider,
      content: markdownContent,
      source: sourceName,
    });
  } catch (err: unknown) {
    console.error("Assistant API error:", err);
    if (err instanceof AIProviderError) {
      sendJsonResponse(res, err.statusCode, {
        success: false,
        error: normalizeServerErrorMessage(err.message),
        code: err.code || "AI_PROVIDER_ERROR",
      });
      return;
    }
    sendJsonResponse(res, 503, {
      success: false,
      error: normalizeServerErrorMessage(err, "AI service temporarily unavailable"),
      code: "AI_PROVIDER_ERROR",
    });
  }
}

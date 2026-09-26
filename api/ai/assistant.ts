import {
  generateAICompletion,
  AIProviderError,
  normalizeServerErrorMessage,
  safeParseJson,
  getProviderSourceName,
} from "../_lib/aiProvider.ts";
import { performRealSeoAudit } from "../_lib/seoCrawler.ts";
import { parseRequestBody, sendJsonResponse } from "../_lib/serverlessHttp.ts";

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
    const { 
      query, 
      category, 
      context, 
      conversationHistory, 
      language, 
      languageName,
      websiteUrl,
      doItForMe,
    } = body || {};

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
    const selectedLanguage = languageName || language || "English";
    const historyText = Array.isArray(conversationHistory)
      ? conversationHistory.map((m: { role?: string; content?: string }) => `${m.role || "user"}: ${m.content || ""}`).join("\n")
      : "";

    // 1. Real Website Crawl & Inspection (when website URL is supplied or detected in query)
    let targetWebsiteUrl = websiteUrl && typeof websiteUrl === "string" ? websiteUrl.trim() : "";
    if (!targetWebsiteUrl) {
      const urlMatch = trimmedQuery.match(/https?:\/\/[^\s$.?#].[^\s]*/i) || 
                       trimmedQuery.match(/\b([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)\b/);
      if (urlMatch) {
        targetWebsiteUrl = urlMatch[0];
        if (!targetWebsiteUrl.startsWith("http")) targetWebsiteUrl = "https://" + targetWebsiteUrl;
      }
    }

    let crawledWebsiteSummary = "";
    let websiteCrawlData: any = null;
    if (targetWebsiteUrl) {
      try {
        const auditResult = await performRealSeoAudit(targetWebsiteUrl);
        websiteCrawlData = {
          url: auditResult.normalizedUrl,
          detectedTitle: auditResult.detectedData?.title || "",
          detectedH1: auditResult.detectedData?.h1Samples || [],
          score: auditResult.score,
          observableIssues: auditResult.suggestions?.slice(0, 4).map(s => `${s.title}: ${s.action}`) || [],
        };
        crawledWebsiteSummary = `
REAL CRAWLED WEBSITE DATA FOR "${auditResult.normalizedUrl}":
- Page Title: "${auditResult.detectedData?.title || "None"}" (${auditResult.detectedData?.titleLength || 0} chars)
- Meta Description: "${auditResult.detectedData?.metaDescription || "None"}"
- H1 Headings: "${auditResult.detectedData?.h1Samples?.join(" | ") || "None found"}"
- H2 Headings: "${auditResult.detectedData?.h2Samples?.slice(0, 4).join(" | ") || "None found"}"
- Health Score: ${auditResult.score}/100
- Observable Issues: ${websiteCrawlData.observableIssues.join("; ")}
Use this real observed content to provide realistic OLD vs NEW headline, CTA, and positioning changes!`;
      } catch (crawlErr) {
        console.warn("Website crawl attempt skipped or failed:", crawlErr);
      }
    }

    const isDoItForMe = Boolean(doItForMe || trimmedQuery.toLowerCase().includes("create everything") || trimmedQuery.toLowerCase().includes("solve my problem"));

    const prompt = `You are the executive intelligence of the "Business Growth Center & Self-Solving Engine".

PRIMARY MANDATE:
ACTUALLY SOLVE the user's business problem. DO NOT return a list of links, articles, generic advice, "go read this website", or "research this yourself".
Perform the solution inside the app by generating the ACTUAL READY-TO-USE MATERIALS that the user can immediately copy, send, publish, or use.

SELF-SOLVING WORKFLOW:
PROBLEM → DIAGNOSIS → SOLUTION → READY-TO-USE MATERIAL → ACTION → MEASUREMENT

USER INQUIRY / BUSINESS PROBLEM:
"${trimmedQuery}"

MODE:
${isDoItForMe ? "⚡ 'CREATE EVERYTHING FOR ME' MODE ACTIVATED: Generate complete ready-to-use materials, copy, scripts, and prioritized checklist." : "STANDARD PROBLEM-SOLVING MODE"}

TARGET OUTPUT LANGUAGE:
"${selectedLanguage}"

ADDITIONAL USER CONTEXT:
Category: ${domainContext}
Context: ${extraContext || "Not provided"}
${crawledWebsiteSummary}
${historyText ? `Recent Conversation History:\n${historyText}` : ""}

PROBLEM-SOLVING SCENARIO GUIDELINES:
1. Sales Problem ("My sales are low" / drop in revenue):
   - Analyze: Offer, target customer, pricing, positioning, visibility, lead generation, conversion, sales process, follow-up, retention, competition.
   - Generate: Sales improvement plan, offer improvement, customer segment, value proposition, ready-to-copy sales message, WhatsApp message, email message, follow-up sequence, phone call script, objection responses, CTA, 7-day and 30-day action plans.
2. No Customers ("I don't have customers" / zero traction):
   - Generate: Target customer definition, customer problem, offer, acquisition channels, outreach strategy, organic content strategy, referral strategy, partnership ideas, lead collection method, ready-to-copy outreach messages, ready-to-copy follow-up messages, weekly activity target.
3. Website Not Converting / Website Provided:
   - Format: CURRENT PROBLEM → WHY IT MAY HURT CONVERSION → WHAT TO CHANGE → REPLACEMENT COPY.
   - Include OLD vs NEW headline and OLD vs NEW CTA.
   - Generate: Homepage structure, service section, trust section, FAQ, CTA, contact/enquiry messaging, lead form questions, 7-day plan.
4. SEO Problem:
   - Generate: Title replacement, meta description, H1 suggestion, H2 structure, content outline, keyword placement, image alt-text guidance, technical fix checklist.
5. Social Media Stagnant:
   - Generate: Target audience, content pillars, 30-day content calendar, post ideas, viral hooks, ready-to-post captions, CTAs, short-video scripts, carousel ideas.
6. Local Business:
   - Generate: Local positioning, business description, service descriptions, Google Business Profile content, genuine customer review request message, review response templates, local visibility plan.
7. Low-Budget Business ("I have no money for marketing"):
   - Activate LOW-BUDGET MODE: Prioritize FREE -> LOW-COST -> PAID. 7-day execution plan.
8. Competitor Problem:
   - Generate: Observable competitor differences, user's current gaps, positioning opportunities, offer differentiation, "How to compete" actions.
9. General Growth Plan:
   - Generate: Clear, specific roadmap for TODAY, 7 DAYS, 30 DAYS, 60 DAYS, 90 DAYS.

CRITICAL INTEGRITY & LANGUAGE RULES:
1. All generated text, messages, scripts, headlines, and plans MUST be written in ${selectedLanguage}.
2. DO NOT provide external links or tell the user to go read an external website.
3. Every solution MUST include the "readyMaterials" array containing ready-to-use materials with a clear instruction: "I prepared everything. You only need to copy and paste/send it."
4. Every solution MUST include a "nextAction" object specifying the single immediate next action the user should take right now, along with the exact text to copy and where to paste it.
5. Every solution MUST include a "diagnosis" object breaking down likely bottlenecks, confirmed findings, assumptions, and the priority fix.
6. DO NOT invent fake customers, fake orders, fake guarantees, or promise guaranteed 100 sales / #1 rankings. Use responsible commercial phrasing: "This action is intended to improve...", "Measure results by...".
7. Technical strings, URLs, and emails remain untranslated.

Respond strictly in valid JSON matching this schema:
{
  "answer": "Direct, executive-level diagnosis and solution explanation.",
  "problemType": "sales" | "no_customers" | "website" | "seo" | "social" | "local" | "low_budget" | "competitor" | "growth",
  "isLowBudgetMode": boolean,
  "diagnosis": {
    "summary": "Clear executive summary of the business diagnosis",
    "likelyBottlenecks": ["Bottleneck 1", "Bottleneck 2", "Bottleneck 3"],
    "confirmedFindings": ["Observed finding 1", "Observed finding 2"],
    "assumptions": ["Assumption requiring user confirmation 1"],
    "priorityFix": "The single highest-priority problem to fix first"
  },
  "readyMaterials": [
    {
      "id": "mat-1",
      "category": "headline_cta" | "website_copy" | "whatsapp_message" | "email_sequence" | "sales_script" | "objection_handling" | "google_business" | "social_content" | "faq" | "offer_positioning",
      "title": "Title of Material (e.g., High-Converting Homepage Headline & CTA)",
      "description": "What this material does and where to apply it",
      "content": "Exact copyable text ready to paste and use immediately",
      "oldVsNew": {
        "oldText": "Observed or typical weak copy",
        "newText": "Improved replacement copy",
        "reason": "Why this improves conversion"
      },
      "instructions": "I prepared everything. You only need to copy and paste/send it."
    }
  ],
  "nextAction": {
    "title": "Immediate Next Action",
    "actionText": "Replace your homepage headline with the improved version",
    "materialToCopy": "Exact text to copy for this action",
    "whereToUse": "Homepage hero section",
    "stepIndex": 1
  },
  "implementationSteps": [
    {
      "id": "step-1",
      "stepNumber": 1,
      "timeframe": "TODAY" | "DAY 1-2" | "WEEK 1" | "30 DAYS",
      "title": "Step 1 title",
      "action": "Exact step instruction",
      "readyMaterialSnippet": "Snippet of prepared copy",
      "completed": false
    }
  ],
  "sevenDayPlan": [
    {
      "day": "Day 1",
      "focus": "Immediate Conversion / Value Fix",
      "action": "Replace homepage headline and primary CTA with high-converting versions",
      "materialSnippet": "Snippet of prepared copy to deploy"
    },
    {
      "day": "Day 2",
      "focus": "Positioning & Trust Building",
      "action": "Deploy trust section and core value proposition",
      "materialSnippet": "Prepared value prop"
    },
    {
      "day": "Day 3",
      "focus": "Direct Buyer Outreach",
      "action": "Send 15 personalized outreach messages to ideal target customers",
      "materialSnippet": "Ready WhatsApp/Email template"
    },
    {
      "day": "Day 4",
      "focus": "Objection Handling & Follow-up",
      "action": "Follow up with prospects using prepared sequence and answer common objections",
      "materialSnippet": "Ready follow-up message"
    },
    {
      "day": "Day 5",
      "focus": "Organic Visibility & GBP/Social",
      "action": "Publish high-converting social carousel or Google Business update",
      "materialSnippet": "Ready social/GBP post"
    },
    {
      "day": "Day 6",
      "focus": "Referral & Partnership Activation",
      "action": "Reach out to past clients or strategic partners with referral offer",
      "materialSnippet": "Ready referral script"
    },
    {
      "day": "Day 7",
      "focus": "Measurement & Pipeline Review",
      "action": "Review conversion clicks, outreach replies, and calibrate next week's activity target",
      "materialSnippet": "Activity target metrics"
    }
  ],
  "actionPlan": {
    "today": ["Action today"],
    "next7Days": ["Action 1 for week 1", "Action 2 for week 1"],
    "next30Days": ["Action for month 1"],
    "next60Days": ["Action for month 2"],
    "next90Days": ["Action for month 3"]
  },
  "actions": ["Primary action 1", "Primary action 2", "Primary action 3"],
  "stepByStepPlan": ["Plan step 1", "Plan step 2", "Plan step 3", "Plan step 4"],
  "importantConsiderations": ["Key risk or factor 1", "Key factor 2"],
  "nextSteps": ["Next step 1", "Next step 2"],
  "verificationNotice": "Strategic advice and generated materials are ready-to-use business solutions. Official compliance, licensing, tariffs and legal requirements require verification with relevant official authorities."
}`;

    const { text, provider } = await generateAICompletion(prompt, { jsonMode: true });
    const parsed = safeParseJson<any>(text);

    // Build comprehensive markdown content for exports and backwards compatibility
    const markdownSections: string[] = [
      `### 🔍 Diagnosis & Strategic Solution\n${parsed.answer || ""}`,
    ];

    if (parsed.diagnosis?.priorityFix) {
      markdownSections.push(`\n\n### ⚡ Priority Fix (Fix This First)\n**${parsed.diagnosis.priorityFix}**`);
    }

    if (parsed.nextAction?.actionText) {
      markdownSections.push(`\n\n### 🚀 Your Immediate Next Action\n**${parsed.nextAction.title}**: ${parsed.nextAction.actionText}\n${parsed.nextAction.materialToCopy ? `\n\`\`\`text\n${parsed.nextAction.materialToCopy}\n\`\`\`` : ""}`);
    }

    if (Array.isArray(parsed.readyMaterials) && parsed.readyMaterials.length > 0) {
      markdownSections.push(`\n\n### 📦 Ready-to-Use Materials (Copy & Use Directly)\n*I prepared everything. You only need to copy, publish, or send it.*`);
      parsed.readyMaterials.forEach((m: any) => {
        markdownSections.push(`\n#### ${m.title} (${m.category || "Asset"})\n${m.description || ""}\n\n\`\`\`text\n${m.content || ""}\n\`\`\``);
      });
    }

    if (Array.isArray(parsed.actions) && parsed.actions.length > 0) {
      markdownSections.push(`\n\n### 🎯 Recommended Strategic Actions\n${parsed.actions.map((a: string) => `* ${a}`).join("\n")}`);
    }

    if (Array.isArray(parsed.sevenDayPlan) && parsed.sevenDayPlan.length > 0) {
      markdownSections.push(`\n\n### 📅 7-Day Action Plan\n${parsed.sevenDayPlan.map((d: any) => `* **${d.day} (${d.focus})**: ${d.action}${d.materialSnippet ? ` \n  *Asset:* \`${d.materialSnippet}\`` : ""}`).join("\n")}`);
    }

    if (Array.isArray(parsed.stepByStepPlan) && parsed.stepByStepPlan.length > 0) {
      markdownSections.push(`\n\n### 🗺️ Step-by-Step Execution Plan\n${parsed.stepByStepPlan.map((s: string, idx: number) => `${idx + 1}. ${s}`).join("\n")}`);
    }

    if (Array.isArray(parsed.importantConsiderations) && parsed.importantConsiderations.length > 0) {
      markdownSections.push(`\n\n### ⚠️ Critical Considerations & Risk Controls\n${parsed.importantConsiderations.map((c: string) => `* ${c}`).join("\n")}`);
    }

    markdownSections.push(`\n\n> **Notice:** ${parsed.verificationNotice || "Strategic advice and generated materials are ready-to-use business solutions. Official compliance, licensing, tariffs and legal requirements require verification with relevant official authorities."}`);

    const markdownContent = markdownSections.join("");
    const sourceName = getProviderSourceName(provider);

    sendJsonResponse(res, 200, {
      success: true,
      data: {
        answer: parsed.answer || "Problem diagnosed and solution materials generated.",
        problemType: parsed.problemType || "general",
        isLowBudgetMode: Boolean(parsed.isLowBudgetMode),
        diagnosis: parsed.diagnosis || {
          summary: parsed.answer || "Business diagnostic completed.",
          likelyBottlenecks: parsed.actions || [],
          confirmedFindings: [],
          assumptions: [],
          priorityFix: parsed.actions?.[0] || "Execute initial tactical step.",
        },
        readyMaterials: Array.isArray(parsed.readyMaterials) ? parsed.readyMaterials : [],
        nextAction: parsed.nextAction || null,
        implementationSteps: Array.isArray(parsed.implementationSteps) ? parsed.implementationSteps : [],
        sevenDayPlan: Array.isArray(parsed.sevenDayPlan) ? parsed.sevenDayPlan : [],
        actionPlan: parsed.actionPlan || null,
        websiteCrawlData,
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

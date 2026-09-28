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

    const prompt = `You are a practical business problem solver. Your only job is to solve whatever problem the user describes and help them get real results (customers, sales, inquiries, or growth).

Rules:
- Work for ANY business problem (sales, no customers, website, Instagram, Facebook, export, local shop, pricing, reviews, competition, etc.)
- No motivational talk, no long theory
- Be direct and practical
- Give ready-to-use materials that the user can copy-paste immediately
- Prefer free or low-cost methods first
- Speak in the same language the user used (English, Bangla, Hindi, or mixed Hinglish/Banglish)
- Keep answers short, clear, and actionable

USER BUSINESS PROBLEM / INQUIRY:
"${trimmedQuery}"

TARGET OUTPUT LANGUAGE:
"${selectedLanguage}"

${crawledWebsiteSummary ? `\n${crawledWebsiteSummary}\n` : ""}
${historyText ? `Recent Conversation History:\n${historyText}\n` : ""}

Always reply in this exact JSON format:
{
  "understood": "One line showing you understood the problem",
  "real_problem": "What is actually wrong (1-2 lines)",
  "immediate_action": "What they should do right now",
  "ready_materials": {
    "main_script": "Ready WhatsApp / DM / Message script",
    "headline_or_offer": "New headline or offer they can use",
    "cta": "Clear call-to-action",
    "extra_material": "Any extra useful thing (bio, email, caption, reply message, etc.)"
  },
  "action_plan": [
    { "day": 1, "task": "Exact task" },
    { "day": 2, "task": "Exact task" },
    { "day": 3, "task": "Exact task" },
    { "day": 4, "task": "Exact task" },
    { "day": 5, "task": "Exact task" }
  ],
  "expected_result": "Realistic result if they follow the plan",
  "next_one_thing": "The single most important action they must do today"
}`;

    const { text, provider } = await generateAICompletion(prompt, { jsonMode: true });
    const parsed = safeParseJson<any>(text);

    // Normalize practical result
    const practicalResult = {
      understood: parsed.understood || "Understood your business problem.",
      real_problem: parsed.real_problem || parsed.diagnosis?.summary || "Friction in customer acquisition and conversion.",
      immediate_action: parsed.immediate_action || parsed.next_action || "Deploy the new headline and send the ready outreach script.",
      ready_materials: {
        main_script: parsed.ready_materials?.main_script || parsed.ready_materials?.whatsapp_scripts?.[0] || "Hi, thank you for reaching out...",
        headline_or_offer: parsed.ready_materials?.headline_or_offer || parsed.ready_materials?.headline_options?.[0] || parsed.ready_materials?.offer_or_pricing || "High-converting business offer",
        cta: parsed.ready_materials?.cta || parsed.ready_materials?.cta_examples?.[0] || "Chat on WhatsApp",
        extra_material: parsed.ready_materials?.extra_material || parsed.ready_materials?.email_or_dm_scripts?.[0] || "Follow-up message template",
      },
      action_plan: Array.isArray(parsed.action_plan) ? parsed.action_plan : [
        { day: 1, task: "Replace headline and add direct WhatsApp CTA button" },
        { day: 2, task: "Send main outreach script to 15 warm prospects" },
        { day: 3, task: "Follow up with warm inquiries using the extra script" },
        { day: 4, task: "Post customer proof or behind-the-scenes on social / Google Business Profile" },
        { day: 5, task: "Review inquiries and count qualified leads" }
      ],
      expected_result: parsed.expected_result || parsed.expected_outcome || "Realistic 3-5 qualified buyer conversations within 5-7 days.",
      next_one_thing: parsed.next_one_thing || parsed.next_action || parsed.immediate_action || "Send the ready outreach script today.",
      website_data: websiteCrawlData,
    };

    // Also build backward-compatible solutionPack
    const solutionPack = {
      diagnosis: {
        main_problem: practicalResult.real_problem,
        root_causes: [practicalResult.real_problem],
        severity: "High" as const,
        summary: practicalResult.understood + " " + practicalResult.real_problem,
      },
      ready_materials: {
        headline_options: [practicalResult.ready_materials.headline_or_offer],
        whatsapp_scripts: [practicalResult.ready_materials.main_script],
        email_or_dm_scripts: [practicalResult.ready_materials.extra_material],
        offer_or_pricing: practicalResult.ready_materials.headline_or_offer,
        cta_examples: [practicalResult.ready_materials.cta],
        faqs: [],
      },
      seven_day_plan: practicalResult.action_plan.map((item: any, idx: number) => ({
        day: item.day || idx + 1,
        title: item.task.slice(0, 30),
        tasks: [item.task],
        time_required: "30-45 mins",
      })),
      growth_roadmap: {
        day_30: "Consistent inbound inquiries established",
        day_60: "Repeat orders and referral engine active",
        day_90: "Scaling to new geographic regions or product categories",
      },
      expected_outcome: practicalResult.expected_result,
      next_action: practicalResult.next_one_thing,
      website_data: websiteCrawlData,
    };

    // Flatten into readyMaterials array for backwards compatibility
    const readyMaterialsList: any[] = [
      {
        id: "mat-main-script",
        category: "whatsapp_message",
        title: "Ready WhatsApp / DM Script",
        description: "Ready to copy and send immediately to prospective buyers or inquiries",
        content: practicalResult.ready_materials.main_script,
        instructions: "I prepared everything. You only need to copy and send.",
      },
      {
        id: "mat-headline-offer",
        category: "headline_cta",
        title: "Headline & Offer",
        description: "Direct conversion headline or offer to paste on your site or bio",
        content: practicalResult.ready_materials.headline_or_offer,
        instructions: "I prepared everything. Replace your existing headline with this.",
      },
      {
        id: "mat-cta",
        category: "headline_cta",
        title: "Call-to-Action (CTA)",
        description: "High-intent CTA copy for buttons and links",
        content: practicalResult.ready_materials.cta,
        instructions: "I prepared everything. Update your primary button copy.",
      },
      {
        id: "mat-extra",
        category: "email_sequence",
        title: "Extra Material (Follow-up / Bio / Email)",
        description: "Additional copy asset for conversions",
        content: practicalResult.ready_materials.extra_material,
        instructions: "I prepared everything. Use this for follow-ups or bio updates.",
      }
    ];

    // Build comprehensive markdown content for exports
    const markdownContent = `### 🔍 Understood
${practicalResult.understood}

### ⚠️ Real Problem
${practicalResult.real_problem}

### 🚀 Immediate Action (Do Right Now)
${practicalResult.immediate_action}

### 📦 Ready-to-Use Materials
#### Ready WhatsApp / DM Script
\`\`\`text
${practicalResult.ready_materials.main_script}
\`\`\`

#### New Headline or Offer
\`\`\`text
${practicalResult.ready_materials.headline_or_offer}
\`\`\`

#### Call-to-Action
\`\`\`text
${practicalResult.ready_materials.cta}
\`\`\`

#### Extra Material
\`\`\`text
${practicalResult.ready_materials.extra_material}
\`\`\`

### 📅 Action Plan
${practicalResult.action_plan.map((item: any) => `* **Day ${item.day}:** ${item.task}`).join("\n")}

### 🎯 Expected Result
${practicalResult.expected_result}

### ⭐ Next One Thing Today
${practicalResult.next_one_thing}`;

    const sourceName = getProviderSourceName(provider);

    sendJsonResponse(res, 200, {
      success: true,
      data: {
        practicalResult,
        solutionPack,
        answer: practicalResult.real_problem,
        problemType: "practical_solution",
        isLowBudgetMode: true,
        diagnosis: {
          summary: practicalResult.real_problem,
          likelyBottlenecks: [practicalResult.real_problem],
          confirmedFindings: [practicalResult.understood],
          assumptions: [],
          priorityFix: practicalResult.next_one_thing,
        },
        readyMaterials: readyMaterialsList,
        nextAction: {
          title: "Immediate Next Action",
          actionText: practicalResult.next_one_thing,
          materialToCopy: practicalResult.ready_materials.main_script || practicalResult.ready_materials.headline_or_offer,
          whereToUse: "WhatsApp / Direct outreach / Bio",
          stepIndex: 1,
        },
        implementationSteps: practicalResult.action_plan.map((d: any) => ({
          id: `step-${d.day}`,
          stepNumber: d.day,
          timeframe: `Day ${d.day}`,
          title: `Day ${d.day} Task`,
          action: d.task,
          readyMaterialSnippet: "",
          completed: false,
        })),
        sevenDayPlan: practicalResult.action_plan.map((d: any) => ({
          day: `Day ${d.day}`,
          focus: `Action ${d.day}`,
          action: d.task,
          materialSnippet: "",
          completed: false,
        })),
        actionPlan: {
          today: [practicalResult.next_one_thing],
          next7Days: practicalResult.action_plan.map((d: any) => `Day ${d.day}: ${d.task}`),
          next30Days: ["Evaluate conversion results and customer response"],
        },
        websiteCrawlData,
        actions: practicalResult.action_plan.map((d: any) => `Day ${d.day}: ${d.task}`),
        stepByStepPlan: practicalResult.action_plan.map((d: any) => `Day ${d.day}: ${d.task}`),
        importantConsiderations: [practicalResult.real_problem],
        nextSteps: [practicalResult.next_one_thing, practicalResult.expected_result],
        verificationNotice: "Guidance is practical commercial strategy. Official regulatory compliance, export licensing, and taxes require verification with relevant authorities.",
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

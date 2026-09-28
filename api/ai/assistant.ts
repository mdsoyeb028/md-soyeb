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

    const prompt = `You are an expert business growth coach and diagnostic specialist for small businesses, freelancers, local shops, manufacturers, and exporters (especially from Bangladesh, India, and similar markets).

Your job is to take the user's business problem and return a complete, practical Solution Pack. Never give vague or motivational advice. Be direct, specific, and actionable.

USER BUSINESS PROBLEM / INQUIRY:
"${trimmedQuery}"

TARGET OUTPUT LANGUAGE:
"${selectedLanguage}"

CRITICAL RULES:
1. Always respond in the same language the user used (English, Bangla, Hindi, or mixed Hinglish/Banglish). Keep business terms natural and crisp.
2. Diagnosis must be honest and specific. Point out the real bottleneck (e.g. lack of trust, confusing offer, zero outreach, weak pricing, bad CTA).
3. Every material must be ready to copy-paste (headlines, WhatsApp messages, emails, offers, CTAs, FAQs).
4. 7-Day Plan must have exact daily tasks (not "work on marketing").
5. Include expected realistic outcome if they follow the plan (e.g., "Expected 3-5 qualified buyer conversations in 7 days").
6. If a website URL is provided, use the crawl data below to make the diagnosis accurate and ground headlines/CTAs on actual observed content.
7. Keep language simple and practical. Prefer short sentences and bullet points.
8. Do NOT invent fake revenues, fake customers, or fake guarantees.

${crawledWebsiteSummary ? `\n${crawledWebsiteSummary}\n` : ""}
${historyText ? `Recent Conversation History:\n${historyText}\n` : ""}

Respond strictly in valid JSON matching this exact schema:
{
  "diagnosis": {
    "main_problem": "One clear sentence diagnosing the core bottleneck",
    "root_causes": ["Specific root cause 1", "Specific root cause 2", "Specific root cause 3"],
    "severity": "High",
    "summary": "2-3 sentence honest, direct diagnosis"
  },
  "ready_materials": {
    "headline_options": [
      "High-converting headline option 1",
      "High-converting headline option 2",
      "High-converting headline option 3"
    ],
    "whatsapp_scripts": [
      "Ready WhatsApp message script 1 (ready to copy and send)",
      "Ready WhatsApp follow-up script 2"
    ],
    "email_or_dm_scripts": [
      "Ready cold outreach or DM script (ready to copy and send)"
    ],
    "offer_or_pricing": "Clear, compelling offer structure or pricing guidance",
    "cta_examples": [
      "High-converting CTA 1",
      "High-converting CTA 2"
    ],
    "faqs": [
      {
        "question": "Realistic customer objection or question 1",
        "answer": "Clear, reassuring answer"
      },
      {
        "question": "Realistic customer objection or question 2",
        "answer": "Clear, reassuring answer"
      }
    ]
  },
  "seven_day_plan": [
    {
      "day": 1,
      "title": "Immediate Headline & CTA Fix",
      "tasks": [
        "Replace hero headline with generated option 1",
        "Add direct WhatsApp order/inquiry CTA button"
      ],
      "time_required": "30-45 mins"
    },
    {
      "day": 2,
      "title": "Offer & Pricing Clarity",
      "tasks": [
        "Update product/service descriptions with the new offer structure",
        "Add trust badges or verified guarantees"
      ],
      "time_required": "45 mins"
    },
    {
      "day": 3,
      "title": "Targeted Outbound Outreach",
      "tasks": [
        "Identify 15 ideal prospects in target location",
        "Send personalized WhatsApp / Email script 1"
      ],
      "time_required": "60 mins"
    },
    {
      "day": 4,
      "title": "Organic Content / Proof Publishing",
      "tasks": [
        "Publish behind-the-scenes or client proof post",
        "Share customer review / satisfaction highlight"
      ],
      "time_required": "30 mins"
    },
    {
      "day": 5,
      "title": "Past Client & Warm Inquiries Follow-Up",
      "tasks": [
        "Send WhatsApp script 2 to inquiries from past 30 days",
        "Activate referral offer for 5 past happy clients"
      ],
      "time_required": "45 mins"
    },
    {
      "day": 6,
      "title": "Local SEO / Profile Optimization",
      "tasks": [
        "Update Google Business Profile or social bio with new keywords",
        "Add updated price sheet / catalog link"
      ],
      "time_required": "30 mins"
    },
    {
      "day": 7,
      "title": "Review Inquiries & Next Activity Target",
      "tasks": [
        "Count total replies and qualified conversations",
        "Calibrate outreach list for the upcoming week"
      ],
      "time_required": "30 mins"
    }
  ],
  "growth_roadmap": {
    "day_30": "What should be achieved in 30 days",
    "day_60": "What should be achieved in 60 days",
    "day_90": "What should be achieved in 90 days"
  },
  "expected_outcome": "Realistic result if they follow the 7-day plan (e.g. 3-8 qualified buyer conversations and reduced inquiry drop-off)",
  "next_action": "The single most important thing they should do right now (e.g. Copy Headline 1 and update your homepage/bio)"
}`;

    const { text, provider } = await generateAICompletion(prompt, { jsonMode: true });
    const parsed = safeParseJson<any>(text);

    // Normalize SolutionPack structure
    const solutionPack = {
      diagnosis: parsed.diagnosis || {
        main_problem: parsed.answer || "Identified conversion and growth bottleneck",
        root_causes: ["Unclear offer", "Low conversion CTA", "Insufficient outreach"],
        severity: "High",
        summary: parsed.answer || "Business growth diagnosis completed.",
      },
      ready_materials: parsed.ready_materials || {
        headline_options: ["High-Converting Business Headline"],
        whatsapp_scripts: ["Hi, thank you for reaching out..."],
        email_or_dm_scripts: ["Hi, I noticed your business..."],
        offer_or_pricing: "Clear commercial offer",
        cta_examples: ["Inquire on WhatsApp", "Get Instant Quote"],
        faqs: [{ question: "How does this work?", answer: "Direct service delivery." }],
      },
      seven_day_plan: Array.isArray(parsed.seven_day_plan) ? parsed.seven_day_plan : [
        { day: 1, title: "Headline Fix", tasks: ["Update headline"], time_required: "30 mins" },
        { day: 2, title: "Offer Update", tasks: ["Clarify offer"], time_required: "30 mins" },
        { day: 3, title: "Direct Outreach", tasks: ["Send 15 messages"], time_required: "45 mins" },
        { day: 4, title: "Follow-up", tasks: ["Follow up with prospects"], time_required: "30 mins" },
        { day: 5, title: "Social Update", tasks: ["Post case study"], time_required: "30 mins" },
        { day: 6, title: "Referral Push", tasks: ["Ask 5 past clients"], time_required: "30 mins" },
        { day: 7, title: "Review & Measure", tasks: ["Count qualified leads"], time_required: "30 mins" }
      ],
      growth_roadmap: parsed.growth_roadmap || {
        day_30: "Consistent inbound inquiries established",
        day_60: "Repeat orders and referral engine active",
        day_90: "Scaling to new geographic regions or product categories",
      },
      expected_outcome: parsed.expected_outcome || "Realistic 3-8 qualified buyer conversations within 7-14 days.",
      next_action: parsed.next_action || "Deploy the updated headline and direct WhatsApp CTA immediately.",
      website_data: websiteCrawlData,
    };

    // Flatten into readyMaterials array for backwards compatibility
    const readyMaterialsList: any[] = [];
    if (solutionPack.ready_materials?.headline_options?.length) {
      readyMaterialsList.push({
        id: "mat-headlines",
        category: "headline_cta",
        title: "High-Converting Headlines",
        description: "Choose one of these tested headlines for your homepage hero or social bio",
        content: solutionPack.ready_materials.headline_options.map((h: string, i: number) => `Option ${i + 1}: ${h}`).join("\n\n"),
        instructions: "I prepared everything. You only need to copy and paste it into your hero section.",
      });
    }
    if (solutionPack.ready_materials?.whatsapp_scripts?.length) {
      readyMaterialsList.push({
        id: "mat-whatsapp",
        category: "whatsapp_message",
        title: "WhatsApp Inbound & Follow-Up Scripts",
        description: "Ready-to-send messages for incoming leads and warm prospect follow-ups",
        content: solutionPack.ready_materials.whatsapp_scripts.join("\n\n---\n\n"),
        instructions: "I prepared everything. You only need to copy and send it on WhatsApp.",
      });
    }
    if (solutionPack.ready_materials?.email_or_dm_scripts?.length) {
      readyMaterialsList.push({
        id: "mat-email",
        category: "email_sequence",
        title: "Cold Outreach / DM Script",
        description: "Personalized outbound pitch for potential clients or B2B buyers",
        content: solutionPack.ready_materials.email_or_dm_scripts.join("\n\n---\n\n"),
        instructions: "I prepared everything. You only need to copy and send.",
      });
    }
    if (solutionPack.ready_materials?.offer_or_pricing) {
      readyMaterialsList.push({
        id: "mat-offer",
        category: "offer_positioning",
        title: "Offer & Value Proposition",
        description: "Clear customer-centric offer structure and pricing framing",
        content: solutionPack.ready_materials.offer_or_pricing,
        instructions: "I prepared everything. Use this on your services page or quote sheet.",
      });
    }
    if (solutionPack.ready_materials?.cta_examples?.length) {
      readyMaterialsList.push({
        id: "mat-cta",
        category: "headline_cta",
        title: "Call-to-Action (CTA) Buttons",
        description: "High-intent CTA copy for buttons and banners",
        content: solutionPack.ready_materials.cta_examples.join("  |  "),
        instructions: "I prepared everything. Replace generic 'Submit' buttons with these.",
      });
    }
    if (solutionPack.ready_materials?.faqs?.length) {
      readyMaterialsList.push({
        id: "mat-faq",
        category: "faq",
        title: "Objection-Busting FAQs",
        description: "Answers to top buyer hesitations to remove friction before purchase",
        content: solutionPack.ready_materials.faqs.map((f: any) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n"),
        instructions: "I prepared everything. Paste this into your FAQ or sales conversations.",
      });
    }

    // Build comprehensive markdown content for exports
    const markdownContent = `### 🔍 Diagnosis: ${solutionPack.diagnosis.main_problem}
**Severity:** ${solutionPack.diagnosis.severity}
${solutionPack.diagnosis.summary}

**Root Causes:**
${solutionPack.diagnosis.root_causes.map((c: string) => `* ${c}`).join("\n")}

### 🚀 Immediate Next Action
${solutionPack.next_action}

### 📦 Ready-to-Use Materials
${readyMaterialsList.map((m: any) => `#### ${m.title}\n\`\`\`text\n${m.content}\n\`\`\``).join("\n\n")}

### 📅 7-Day Action Plan
${solutionPack.seven_day_plan.map((d: any) => `* **Day ${d.day}: ${d.title}** (${d.time_required})\n  ${d.tasks.map((t: string) => `  - ${t}`).join("\n")}`).join("\n")}

### 📈 30/60/90-Day Growth Roadmap
* **Day 30:** ${solutionPack.growth_roadmap.day_30}
* **Day 60:** ${solutionPack.growth_roadmap.day_60}
* **Day 90:** ${solutionPack.growth_roadmap.day_90}

### 🎯 Expected Realistic Outcome
${solutionPack.expected_outcome}`;

    const sourceName = getProviderSourceName(provider);

    sendJsonResponse(res, 200, {
      success: true,
      data: {
        solutionPack,
        answer: solutionPack.diagnosis.summary,
        problemType: "solution_pack",
        isLowBudgetMode: true,
        diagnosis: {
          summary: solutionPack.diagnosis.summary,
          likelyBottlenecks: solutionPack.diagnosis.root_causes,
          confirmedFindings: [solutionPack.diagnosis.main_problem],
          assumptions: [],
          priorityFix: solutionPack.next_action,
        },
        readyMaterials: readyMaterialsList,
        nextAction: {
          title: "Immediate Next Action",
          actionText: solutionPack.next_action,
          materialToCopy: solutionPack.ready_materials?.headline_options?.[0] || solutionPack.ready_materials?.whatsapp_scripts?.[0] || solutionPack.next_action,
          whereToUse: "Website hero section / WhatsApp bio",
          stepIndex: 1,
        },
        implementationSteps: solutionPack.seven_day_plan.map((d: any) => ({
          id: `step-${d.day}`,
          stepNumber: d.day,
          timeframe: `Day ${d.day}`,
          title: d.title,
          action: d.tasks.join("; "),
          readyMaterialSnippet: d.time_required,
          completed: false,
        })),
        sevenDayPlan: solutionPack.seven_day_plan.map((d: any) => ({
          day: `Day ${d.day}`,
          focus: d.title,
          action: d.tasks.join("; "),
          materialSnippet: d.time_required,
          completed: false,
        })),
        actionPlan: {
          today: [solutionPack.next_action],
          next7Days: solutionPack.seven_day_plan.map((d: any) => `Day ${d.day}: ${d.title}`),
          next30Days: [solutionPack.growth_roadmap.day_30],
          next60Days: [solutionPack.growth_roadmap.day_60],
          next90Days: [solutionPack.growth_roadmap.day_90],
        },
        websiteCrawlData,
        actions: solutionPack.seven_day_plan.map((d: any) => `Day ${d.day}: ${d.title} - ${d.tasks[0] || ""}`),
        stepByStepPlan: solutionPack.seven_day_plan.map((d: any) => `${d.title} (${d.time_required})`),
        importantConsiderations: solutionPack.diagnosis.root_causes,
        nextSteps: [solutionPack.next_action, solutionPack.expected_outcome],
        verificationNotice: "Guidance is tailored commercial strategy. Official regulatory compliance, export licensing, and taxes require verification with relevant authorities.",
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

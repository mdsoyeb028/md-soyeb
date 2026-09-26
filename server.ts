import express, { Request, Response, NextFunction } from "express";
import path from "path";
import dotenv from "dotenv";
import { performRealSeoAudit } from "./src/server/seoCrawler";
import { generateAICompletion, AIProviderError, normalizeServerErrorMessage } from "./src/server/aiProvider";

dotenv.config();

const app = express();
const PORT = 3000;

// Handle serverless runtimes (e.g. Vercel) where req.body has already been buffered/parsed
app.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.body !== undefined && req.body !== null) {
    (req as any)._body = true;
  }
  next();
});

app.use(express.json({ limit: "1mb" }));

// In-Memory IP Rate Limiter (30 requests per minute per IP to protect AI resources)
const ipRequestCounts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 30;

function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Exclude health check, static assets, sitemap and robots
  if (
    req.path === "/api/health" || 
    req.path.startsWith("/assets") ||
    req.path === "/sitemap.xml" ||
    req.path === "/robots.txt"
  ) {
    return next();
  }

  const clientIp = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown-ip";
  const now = Date.now();
  const clientRecord = ipRequestCounts.get(clientIp);

  if (!clientRecord || now > clientRecord.resetAt) {
    ipRequestCounts.set(clientIp, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return next();
  }

  if (clientRecord.count >= MAX_REQUESTS_PER_WINDOW) {
    res.status(429).setHeader("Content-Type", "application/json; charset=utf-8").json({
      success: false,
      error: "Rate limit reached (30 requests/min). Please slow down and try again shortly.",
      code: "RATE_LIMIT_EXCEEDED",
    });
    return;
  }

  clientRecord.count++;
  next();
}

app.use(rateLimitMiddleware);

// Periodic cleanup of rate limiter map
if (process.env.NODE_ENV !== "test" && !process.env.VERCEL) {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of ipRequestCounts.entries()) {
      if (now > record.resetAt) {
        ipRequestCounts.delete(ip);
      }
    }
  }, 5 * 60 * 1000);
  timer.unref?.();
}

/**
 * Robust JSON parser that strips markdown code blocks or extracts JSON payloads
 */
function safeParseJson<T = Record<string, unknown>>(raw: string): T {
  let clean = raw.trim();
  if (clean.startsWith("```")) {
    clean = clean.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }
  try {
    return JSON.parse(clean) as T;
  } catch {
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]) as T;
    }
    throw new Error("Unable to parse JSON from AI response");
  }
}

const SITEMAP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://md-soyeb.vercel.app/</loc>
    <lastmod>2026-09-23</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://md-soyeb.vercel.app/export</loc>
    <lastmod>2026-09-23</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://md-soyeb.vercel.app/seo</loc>
    <lastmod>2026-09-23</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://md-soyeb.vercel.app/social</loc>
    <lastmod>2026-09-23</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://md-soyeb.vercel.app/business</loc>
    <lastmod>2026-09-23</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://md-soyeb.vercel.app/pricing</loc>
    <lastmod>2026-09-23</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://md-soyeb.vercel.app/dashboard</loc>
    <lastmod>2026-09-23</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>
`;

const ROBOTS_TXT = `# robots.txt for Business Growth & Export Hub
User-agent: *
Allow: /

# Sitemap Reference
Sitemap: https://md-soyeb.vercel.app/sitemap.xml
`;

// Direct SEO sitemap and robots endpoints
app.get("/sitemap.xml", (_req, res) => {
  res.header("Content-Type", "application/xml; charset=utf-8");
  res.status(200).send(SITEMAP_XML);
});

app.get("/robots.txt", (_req, res) => {
  res.header("Content-Type", "text/plain; charset=utf-8");
  res.status(200).send(ROBOTS_TXT);
});

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    hasGroqKey: Boolean(process.env.GROQ_API_KEY),
    hasOpenRouterKey: Boolean(process.env.OPENROUTER_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

function getProviderSourceName(provider: "gemini" | "groq" | "openrouter"): string {
  if (provider === "gemini") return "gemini-ai";
  if (provider === "groq") return "groq-ai";
  return "openrouter-free";
}

// 1. Central AI Business Assistant & Self-Solving Engine
app.post("/api/ai/assistant", async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  try {
    const { 
      query, 
      category, 
      context, 
      conversationHistory, 
      language, 
      languageName,
      websiteUrl,
      doItForMe,
    } = req.body || {};

    if (!query || typeof query !== "string" || !query.trim()) {
      res.status(400).json({ 
        success: false, 
        error: "Inquiry query is required and must not be empty." 
      });
      return;
    }

    if (query.length > 3000) {
      res.status(400).json({ 
        success: false, 
        error: "Inquiry query exceeds 3,000 characters limit." 
      });
      return;
    }

    const trimmedQuery = query.trim();
    const domainContext = category && typeof category === "string" ? category.trim() : "General Business Growth & Export Strategy";
    const extraContext = context && typeof context === "string" ? context.trim() : "";
    const selectedLanguage = languageName || language || "English";
    const historyText = Array.isArray(conversationHistory) 
      ? conversationHistory.map((m: { role?: string; content?: string }) => `${m.role || "user"}: ${m.content || ""}`).join("\n")
      : "";

    // 1. Real Website Crawl & Inspection (when website URL is supplied or detected)
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

    if (Array.isArray(parsed.stepByStepPlan) && parsed.stepByStepPlan.length > 0) {
      markdownSections.push(`\n\n### 🗺️ Step-by-Step Execution Plan\n${parsed.stepByStepPlan.map((s: string, idx: number) => `${idx + 1}. ${s}`).join("\n")}`);
    }

    if (Array.isArray(parsed.importantConsiderations) && parsed.importantConsiderations.length > 0) {
      markdownSections.push(`\n\n### ⚠️ Critical Considerations & Risk Controls\n${parsed.importantConsiderations.map((c: string) => `* ${c}`).join("\n")}`);
    }

    markdownSections.push(`\n\n> **Notice:** ${parsed.verificationNotice || "Strategic advice and generated materials are ready-to-use business solutions. Official compliance, licensing, tariffs and legal requirements require verification with relevant official authorities."}`);

    const markdownContent = markdownSections.join("");
    const sourceName = getProviderSourceName(provider);

    res.status(200).json({
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
      res.status(err.statusCode).json({
        success: false,
        error: normalizeServerErrorMessage(err.message),
        code: err.code || "AI_PROVIDER_ERROR",
      });
      return;
    }
    res.status(503).json({ 
      success: false, 
      error: normalizeServerErrorMessage(err, "AI service temporarily unavailable"),
      code: "AI_PROVIDER_ERROR",
    });
  }
});

// 2. Real SEO Audit Endpoint (Live Crawler + HTML Parser + Mathematical Score)
app.post("/api/ai/seo", async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  try {
    const { url, keyword, language, languageName } = req.body || {};
    if (!url || typeof url !== "string" || !url.trim()) {
      res.status(400).json({ 
        success: false, 
        error: "A valid website URL is required (e.g., https://example.com)." 
      });
      return;
    }

    if (url.length > 500) {
      res.status(400).json({ 
        success: false, 
        error: "URL length exceeds 500 characters." 
      });
      return;
    }

    const selectedLanguage = languageName || language || "English";

    // Perform live webpage audit with SSRF protection (NEVER replaced by AI)
    const auditResult = await performRealSeoAudit(url, keyword);
    let aiProvider: "gemini" | "groq" | "openrouter" | "none" = "none";

    // Enrich with tailored AI semantic recommendations using provider fallback
    const enrichmentPrompt = `You are a technical SEO expert. Here is real crawled data from the website "${auditResult.normalizedUrl}":
Target keyword: "${keyword || 'General'}"
Detected Page Title: "${auditResult.detectedData.title}" (${auditResult.detectedData.titleLength} chars)
Detected Meta Description: "${auditResult.detectedData.metaDescription}" (${auditResult.detectedData.descriptionLength} chars)
Detected H1: "${auditResult.detectedData.h1Samples.join(' | ')}"
Detected H2s: "${auditResult.detectedData.h2Samples.join(' | ')}"
Mathematical SEO Health Score: ${auditResult.score}/100
Target Output Language: "${selectedLanguage}"

CRITICAL INSTRUCTION:
Provide the recommendations (improved description and additional insight) in "${selectedLanguage}". Preserve technical keywords, brand names, and URLs.

Generate optimized meta title and meta description recommendations for this exact page. Return strictly JSON:
{
  "improvedTitle": "string between 45 and 60 chars",
  "improvedDescription": "string between 120 and 155 chars with call to action in ${selectedLanguage}",
  "additionalInsight": "string summarizing one high-impact technical or on-page win in ${selectedLanguage}"
}`;

    try {
      const { text, provider } = await generateAICompletion(enrichmentPrompt, { jsonMode: true, timeoutMs: 12000 });
      aiProvider = provider;
      const parsed = safeParseJson<any>(text);

      if (parsed.improvedTitle) auditResult.metaTitle = parsed.improvedTitle;
      if (parsed.improvedDescription) auditResult.metaDescription = parsed.improvedDescription;
      if (parsed.additionalInsight) {
        auditResult.suggestions.unshift({
          priority: "High",
          title: "AI Semantic Recommendation",
          action: parsed.additionalInsight,
        });
      }
    } catch {
      // Non-fatal enrichment fallback: raw crawl data remains pristine and complete
      aiProvider = "none";
    }

    res.status(200).json({
      success: true,
      data: auditResult,
      audit: auditResult,
      provider: aiProvider,
      ...auditResult,
    });
  } catch (err: unknown) {
    const message = normalizeServerErrorMessage(err, "SEO audit could not be completed.");
    console.error("SEO Audit Error:", message);
    const status = message.includes("SSRF") || message.includes("Invalid URL") || message.includes("empty") ? 400 : 502;
    res.status(status).json({ 
      success: false, 
      error: message,
      code: "AI_PROVIDER_ERROR",
    });
  }
});

// 3. Social Media Content Generation Engine
app.post("/api/ai/social", async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  try {
    const { platform, business, category, audience, topic, language, contentType } = req.body || {};

    if (!business || typeof business !== "string" || !business.trim()) {
      res.status(400).json({ 
        success: false, 
        error: "Business or brand name is required." 
      });
      return;
    }

    if (business.length > 300) {
      res.status(400).json({ 
        success: false, 
        error: "Business name exceeds 300 characters limit." 
      });
      return;
    }

    const selectedPlatform = platform && ["Instagram", "Facebook", "YouTube", "LinkedIn"].includes(platform) ? platform : "Instagram";
    const selectedLanguage = language && typeof language === "string" && language.trim() ? language.trim() : "English";
    const selectedCategory = category && typeof category === "string" && category.trim() ? category.trim() : "General Commerce / Services";
    const selectedAudience = audience && typeof audience === "string" && audience.trim() ? audience.trim() : "B2B Wholesalers & Global Consumers";
    const selectedTopic = topic && typeof topic === "string" && topic.trim() ? topic.trim() : "Brand Growth & Product Value";
    const selectedContentType = contentType && typeof contentType === "string" && contentType.trim() ? contentType.trim() : "Short Videos, Carousels & Thought Leadership";

    const prompt = `You are a world-class senior social media marketing director and copywriter.
Brand / Business Name: "${business.trim()}"
Industry / Category: "${selectedCategory}"
Target Audience: "${selectedAudience}"
Primary Platform Focus: "${selectedPlatform}"
Content Topic / Focus: "${selectedTopic}"
Language: "${selectedLanguage}"
Content Style / Type: "${selectedContentType}"

CRITICAL INSTRUCTIONS:
- You must generate REAL, compelling marketing content, actionable video storyboards, engaging copy, and verified hashtag structures.
- Do NOT generate fake metrics, fabricated follower counts, estimated likes/views/engagement numbers, simulated customers, projected revenue figures, or false viral guarantees.
- Ensure the language of all written text and captions is in: ${selectedLanguage}.

Generate content formatted strictly as valid JSON adhering to this exact schema:
{
  "platform": "${selectedPlatform}",
  "businessName": "${business.trim()}",
  "category": "${selectedCategory}",
  "topic": "${selectedTopic}",
  "language": "${selectedLanguage}",
  "postIdeas": [
    { "hook": "string", "description": "string", "format": "Carousel | Single Image | Video | Text Post" },
    { "hook": "string", "description": "string", "format": "Carousel | Single Image | Video | Text Post" },
    { "hook": "string", "description": "string", "format": "Carousel | Single Image | Video | Text Post" }
  ],
  "reelIdeas": [
    { "visual": "Detailed visual storyboard scene-by-scene", "audioHook": "Specific audio or voiceover cue", "onScreenText": "Exact text overlay" },
    { "visual": "Detailed visual storyboard scene-by-scene", "audioHook": "Specific audio or voiceover cue", "onScreenText": "Exact text overlay" }
  ],
  "captions": [
    { "headline": "string", "body": "multi-line caption body formatted with line breaks", "cta": "compelling call to action" },
    { "headline": "string", "body": "multi-line caption body formatted with line breaks", "cta": "compelling call to action" }
  ],
  "platformDeliverables": {
    "instagram": {
      "caption": "ready to post caption with linebreaks",
      "reelHook": "first 3 seconds video hook"
    },
    "facebook": {
      "postContent": "conversational post fostering community comments",
      "engagementQuestion": "provocative discussion prompt for readers"
    },
    "youtube": {
      "videoTitle": "high CTR, SEO optimized YouTube video title under 65 chars",
      "videoDescription": "structured YouTube description with timestamp outline and links",
      "shortsIdea": "fast-paced vertical video concept for YouTube Shorts",
      "searchTags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
    },
    "linkedin": {
      "thoughtLeadershipPost": "insightful B2B industry analysis post with executive tone",
      "keyTakeaway": "core executive lesson in 1 sentence"
    }
  },
  "hashtags": [
    "#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5",
    "#hashtag6", "#hashtag7", "#hashtag8", "#hashtag9", "#hashtag10",
    "#hashtag11", "#hashtag12"
  ],
  "videoHooks": [
    "Punchy hook 1",
    "Punchy hook 2",
    "Punchy hook 3"
  ],
  "ctaSuggestions": [
    "Call to action 1",
    "Call to action 2",
    "Call to action 3"
  ],
  "calendar": [
    { "day": "Monday", "theme": "string", "content": "string", "bestTime": "string e.g. 09:00 AM" },
    { "day": "Tuesday", "theme": "string", "content": "string", "bestTime": "string e.g. 12:30 PM" },
    { "day": "Wednesday", "theme": "string", "content": "string", "bestTime": "string e.g. 05:00 PM" },
    { "day": "Thursday", "theme": "string", "content": "string", "bestTime": "string e.g. 10:00 AM" },
    { "day": "Friday", "theme": "string", "content": "string", "bestTime": "string e.g. 02:00 PM" },
    { "day": "Saturday", "theme": "string", "content": "string", "bestTime": "string e.g. 08:30 AM" },
    { "day": "Sunday", "theme": "string", "content": "string", "bestTime": "string e.g. 06:00 PM" }
  ]
}`;

    const { text, provider } = await generateAICompletion(prompt, { jsonMode: true });
    const parsed = safeParseJson<any>(text);
    const sourceName = getProviderSourceName(provider);

    res.status(200).json({
      success: true,
      data: {
        ...parsed,
        source: sourceName,
      },
      provider,
      ...parsed,
      source: sourceName,
    });
  } catch (err: unknown) {
    console.error("Social API error:", err);
    if (err instanceof AIProviderError) {
      res.status(err.statusCode).json({
        success: false,
        error: normalizeServerErrorMessage(err.message),
        code: err.code || "AI_PROVIDER_ERROR",
      });
      return;
    }
    res.status(503).json({ 
      success: false, 
      error: normalizeServerErrorMessage(err, "AI service temporarily unavailable"),
      code: "AI_PROVIDER_ERROR",
    });
  }
});

// 4. Export Intelligence Engine
app.post("/api/ai/export", async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  try {
    const {
      productName,
      productCategory,
      originCountry,
      targetCountry,
      buyerType,
      businessSize,
      specificQuestion,
      subTool,
      budget,
      quantity,
      businessType,
      language,
      languageName,
    } = req.body || {};

    if (!productName || typeof productName !== "string" || !productName.trim()) {
      res.status(400).json({ 
        success: false, 
        error: "Product name is required for export analysis." 
      });
      return;
    }

    if (productName.length > 300) {
      res.status(400).json({ 
        success: false, 
        error: "Product name exceeds 300 characters limit." 
      });
      return;
    }

    const selectedProduct = productName.trim();
    const selectedCategory = productCategory && typeof productCategory === "string" && productCategory.trim() ? productCategory.trim() : "Commercial Goods & Manufactured Products";
    const selectedOrigin = originCountry && typeof originCountry === "string" && originCountry.trim() ? originCountry.trim() : "Origin Country";
    const selectedTarget = targetCountry && typeof targetCountry === "string" && targetCountry.trim() ? targetCountry.trim() : "International Market";
    const selectedBuyerType = buyerType && typeof buyerType === "string" && buyerType.trim() ? buyerType.trim() : "B2B Wholesalers, Distributors & Importers";
    const selectedSize = businessSize || businessType || "Small to Medium Exporter";
    const selectedLanguage = languageName || language || "English";
    const selectedQuestion = specificQuestion && typeof specificQuestion === "string" && specificQuestion.trim() ? specificQuestion.trim() : "";
    const selectedSubTool = subTool && typeof subTool === "string" ? subTool.trim() : "opportunities";

    const prompt = `You are an elite international trade consultant, customs logistics strategist, and B2B export advisor.

TRADE PARAMETERS:
- Product Name: "${selectedProduct}"
- Product Category: "${selectedCategory}"
- Country of Origin: "${selectedOrigin}"
- Target Destination Country: "${selectedTarget}"
- Target Buyer/Customer Type: "${selectedBuyerType}"
- Exporter Business Size / Type: "${selectedSize}"
- Specific User Question / Inquiries: "${selectedQuestion || "Complete export feasibility, compliance, Incoterms, and buyer outreach strategy."}"
- Sub-Tool Requested: "${selectedSubTool}"
- Budget / Quantity Context: "${budget || "Commercial scale"} / ${quantity || "Standard export batches"}"
- Target Output Language: "${selectedLanguage}"

CRITICAL LANGUAGE INSTRUCTIONS:
1. Respond in the user's selected language: ${selectedLanguage}. All generated analyses, checklists, drafts, and advice MUST be in ${selectedLanguage}.
2. Do NOT translate: URLs, official trade codes (like HS codes, Incoterms abbreviations like FOB, CIF), emails, or domain names unless requested.

CRITICAL ACCURACY & COMPLIANCE RULES:
1. Do NOT invent or fabricate official regulations, import licenses, exact tariff duty percentages, mandatory HS codes, buyers, companies, phone numbers, email addresses, or market statistics.
2. Do NOT promise guaranteed export profits, guaranteed sales, or verified buyer lists.
3. When information depends on destination-country specific rules, customs classifications, or bi-lateral trade agreements, YOU MUST explicitly label it as: "Needs verification with the relevant official authority."
4. Provide practical, high-value commercial guidance:
   - Target-country market research & product suitability
   - HS-code research guidance
   - Incoterms explanation
   - Payment method guidance
   - Packaging, labeling & seaworthy logistics
   - Required international shipping documents checklist
   - Risk and compliance checklist
   - B2B buyer outreach message draft or quotation draft tailored to this trade relationship.

Respond with strictly valid JSON according to this exact JSON schema:
{
  "product": "${selectedProduct}",
  "category": "${selectedCategory}",
  "originCountry": "${selectedOrigin}",
  "targetCountry": "${selectedTarget}",
  "verificationNotice": "Needs verification with the relevant official authority.",
  "customerTypes": [
    "string",
    "string",
    "string"
  ],
  "marketSuitability": "In-depth analysis of product fit, consumer/commercial demand in ${selectedTarget}, positioning, and competitive entry hurdles.",
  "hsCodeGuidance": "Detailed Harmonized System classification advice, likely chapter range, and steps to determine the exact destination tariff code with the national customs office.",
  "incotermsGuidance": "Clear explanation of standard Incoterms (e.g. FOB Port of Loading vs CIF Destination Port), insurance obligations, and risk allocation for this trade lane.",
  "paymentGuidance": "Practical trade finance and secure payment mechanisms (e.g., Irrevocable Letter of Credit, confirmed LC, advance telegraphic transfer split).",
  "logisticsPackaging": "Export-grade packaging specifications, moisture protection, palletization standards (ISPM-15), drop-testing, and shipping marks.",
  "requiredDocuments": [
    "Commercial Invoice with Incoterms and HS Code",
    "Packing List itemizing net/gross weights and dimensions",
    "Bill of Lading (Ocean) or Air Waybill (Air)",
    "Certificate of Origin (Preferential / Non-Preferential)",
    "Marine Cargo Insurance Certificate",
    "Needs verification with the relevant official authority for specific destination permits"
  ],
  "complianceChecklist": [
    "Obtain Import Export Code (IEC / EORI) from national trade body",
    "Verify product quality, food safety, or technical standard certificates in ${selectedTarget} - Needs verification with the relevant official authority",
    "Confirm destination customs tariff rate and applicable VAT/GST",
    "Ensure packaging complies with international phytosanitary and environmental disposal regulations",
    "Vet buyer legal registration and establish trade credit terms prior to shipping"
  ],
  "buyerOutreachDraft": "Professional, personalized B2B cold introduction letter/email for foreign buyers with clear subject line, value proposition, MOQ, and sample offer.",
  "quotationDraft": "Formal B2B export price quotation framework including validity period, payment terms, Incoterms, lead time, and port specifications.",
  "content": "Comprehensive, beautifully structured Markdown briefing incorporating all executive research, checklists, and actionable advice with clear headers, bullet points, and prominent 'Needs verification with the relevant official authority' notices."
}`;

    const { text, provider } = await generateAICompletion(prompt, { jsonMode: true });
    const parsed = safeParseJson<any>(text);
    const sourceName = getProviderSourceName(provider);

    res.status(200).json({
      success: true,
      data: {
        ...parsed,
        source: sourceName,
      },
      provider,
      ...parsed,
      content: parsed.content || "Export briefing generated successfully.",
      source: sourceName,
    });
  } catch (err: unknown) {
    console.error("Export API error:", err);
    if (err instanceof AIProviderError) {
      res.status(err.statusCode).json({
        success: false,
        error: normalizeServerErrorMessage(err.message),
        code: err.code || "AI_PROVIDER_ERROR",
      });
      return;
    }
    res.status(503).json({ 
      success: false, 
      error: normalizeServerErrorMessage(err, "AI service temporarily unavailable"),
      code: "AI_PROVIDER_ERROR",
    });
  }
});

// 5. Business Planning & Growth Suite Endpoint
app.post("/api/ai/business", async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  try {
    const { toolType, inputData, language, languageName } = req.body || {};

    if (!toolType || typeof toolType !== "string") {
      res.status(400).json({ 
        success: false, 
        error: "toolType is required." 
      });
      return;
    }

    const selectedLanguage = languageName || language || "English";

    const prompt = `You are a senior commercial strategist and business growth advisor.
Tool Requested: ${toolType}
Input Data: ${JSON.stringify(inputData || {})}
Target Output Language: ${selectedLanguage}

CRITICAL LANGUAGE INSTRUCTIONS:
1. Respond in the user's selected language: ${selectedLanguage}. All business advice, calculations explanations, steps, and deliverables MUST be in ${selectedLanguage}.
2. Preserve proper technical terms, brand names, URLs, formulas, and currencies where appropriate.

Provide a structured, highly actionable business deliverable in clear markdown format.
Be rigorous, realistic, and commercially sound. Do not invent fake statistics or guaranteed financial outcomes.`;

    const { text, provider } = await generateAICompletion(prompt);
    const sourceName = getProviderSourceName(provider);

    res.status(200).json({ 
      success: true,
      data: {
        content: text,
        source: sourceName,
      },
      provider,
      content: text, 
      source: sourceName,
    });
  } catch (err: unknown) {
    console.error("Business API error:", err);
    if (err instanceof AIProviderError) {
      res.status(err.statusCode).json({
        success: false,
        error: normalizeServerErrorMessage(err.message),
        code: err.code || "AI_PROVIDER_ERROR",
      });
      return;
    }
    res.status(503).json({ 
      success: false, 
      error: normalizeServerErrorMessage(err, "AI service temporarily unavailable"),
      code: "AI_PROVIDER_ERROR",
    });
  }
});

// Catch-all for undefined /api routes: ALWAYS return JSON, never HTML
app.all("/api/*", (req, res) => {
  res.status(404).setHeader("Content-Type", "application/json; charset=utf-8").json({
    success: false,
    error: `API route ${req.method} ${req.originalUrl} not found.`,
  });
});

// Global API error handler: ALWAYS return JSON, never HTML
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled API error:", err);
  const message = err instanceof Error ? err.message : "Internal server error";
  res.status(500).setHeader("Content-Type", "application/json; charset=utf-8").json({
    success: false,
    error: message,
  });
});

// Vite middleware for dev / static serving for prod
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

// Start server if not running in a serverless environment
if (process.env.NODE_ENV !== "test" && !process.env.VERCEL) {
  startServer();
}

export { app };

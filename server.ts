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

// 1. Central AI Business Assistant
app.post("/api/ai/assistant", async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  try {
    const { query, category, context, conversationHistory, language, languageName } = req.body || {};
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

TARGET OUTPUT LANGUAGE:
"${selectedLanguage}"

ADDITIONAL USER CONTEXT:
Category: ${domainContext}
Context: ${extraContext || "Not provided"}
${historyText ? `Recent Conversation History:\n${historyText}` : ""}

CRITICAL LANGUAGE INSTRUCTIONS:
1. Respond in the user's selected language: ${selectedLanguage}. All generated explanations, actions, plans, and guidance MUST be written in ${selectedLanguage}.
2. If the user inquiry is in another language, understand it and respond in ${selectedLanguage} (or in the query language if no explicit preference is set).
3. Do NOT translate: URLs, API keys, email addresses, technical code, technical identifiers, or website domains.
4. Preserve proper technical terms, brand names, company names, product names, and proper nouns when appropriate.

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

    res.status(200).json({
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
    const { url, keyword } = req.body || {};
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

Generate optimized meta title and meta description recommendations for this exact page. Return strictly JSON:
{
  "improvedTitle": "string between 45 and 60 chars",
  "improvedDescription": "string between 120 and 155 chars with call to action",
  "additionalInsight": "string summarizing one high-impact technical or on-page win"
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

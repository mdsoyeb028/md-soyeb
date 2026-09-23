import express, { Request, Response, NextFunction } from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { performRealSeoAudit } from "./src/server/seoCrawler";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "1mb" }));

// In-Memory IP Rate Limiter (60 requests per minute window)
const ipRequestCounts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 60;

function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Exclude health check and static assets
  if (req.path === "/api/health" || req.path.startsWith("/assets")) {
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
    res.status(429).json({
      error: "Rate limit reached (60 requests/min). Please slow down and try again shortly.",
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

// Initialize Gemini Client safely
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// Candidate models with fast lite first
const CANDIDATE_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-3.8-flash",
  "gemini-flash-latest",
];

async function generateWithGemini(
  prompt: string,
  options?: { jsonMode?: boolean }
): Promise<string> {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error(
      "GEMINI_API_KEY is not configured on the server. Please define GEMINI_API_KEY in your server environment variables."
    );
  }

  let lastError: Error | null = null;

  for (const model of CANDIDATE_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        ...(options?.jsonMode ? { config: { responseMimeType: "application/json" } } : {}),
      });

      if (response && response.text) {
        return response.text;
      }
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      continue;
    }
  }

  throw new Error(
    `AI generation failed across available models: ${lastError?.message || "Service temporarily unavailable. Please try again."}`
  );
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
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// 1. Central AI Business Assistant
app.post("/api/ai/assistant", async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== "string" || !query.trim()) {
      res.status(400).json({ error: "Query is required and must not be empty." });
      return;
    }

    if (query.length > 2000) {
      res.status(400).json({ error: "Query exceeds maximum length of 2,000 characters." });
      return;
    }

    const prompt = `You are a world-class senior international trade advisor and business strategist for the "Business Growth & Export Hub".
User inquiry: "${query.trim()}"

Provide a structured, deeply practical response formatted strictly with the following clear markdown sections:
### 1. 🎯 Possible Target Markets & Demand Analysis
* Identify 2 to 3 highest potential destination countries.
* Explain the specific consumer or industrial demand driver.

### 2. 🤝 Finding Verified Buyers Strategy
* Realistic B2B sourcing methods: trade portals (e.g. Kompass, Europages), verified B2B chambers, export promotion councils, and specialized trade expos.
* Note: Clearly disclaim that live buyer names or contact lists require verified registry validation and cannot be fabricated.

### 3. 📦 Product Packaging, Standards & HS-Codes
* International packaging requirements (e.g. 5-ply corrugated, moisture control, pallet standards).
* Expected Harmonized System (HS) code classification principles.

### 4. 🗺️ Step-by-Step Strategic Action Roadmap
* A sequential roadmap:
  - Step 1: Legal setup & Export licensing.
  - Step 2: Quality compliance and lab testing.
  - Step 3: Proforma invoice & Incoterms agreement (FOB/CIF).
  - Step 4: Freight logistics, marine insurance, and customs clearance.

### 5. ❓ Key Questions to Clarify Before Proceeding
* Ask 3 questions regarding current supply capacity, MOQ, and target margin.

### 6. ⚖️ Regulatory & Legal Advisory Notice
* Include notice that trade, tariff, and customs advice is educational and strategic. Exporters must verify current filings with national customs authorities or certified customs house agents.`;

    const aiContent = await generateWithGemini(prompt);
    res.json({ content: aiContent, source: "gemini-ai" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "AI Trade Advisor failed to process inquiry.";
    console.error("Assistant API error:", message);
    res.status(503).json({ error: message });
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

    // Perform live webpage audit with SSRF protection
    const auditResult = await performRealSeoAudit(url, keyword);

    // If Gemini is available, enrich with tailored title/description improvements based on actual page content
    if (getGeminiClient()) {
      try {
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

        const aiJson = await generateWithGemini(enrichmentPrompt, { jsonMode: true });
        const parsed = JSON.parse(aiJson);

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
        // Non-fatal enrichment fallback: raw crawl data stands pristine
      }
    }

    res.status(200).json({
      success: true,
      audit: auditResult,
      ...auditResult,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "SEO audit could not be completed.";
    console.error("SEO Audit Error:", message);
    const status = message.includes("SSRF") || message.includes("Invalid URL") || message.includes("empty") ? 400 : 502;
    res.status(status).json({ 
      success: false, 
      error: message 
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

    const aiJson = await generateWithGemini(prompt, { jsonMode: true });
    const parsed = JSON.parse(aiJson);

    res.status(200).json({
      success: true,
      data: {
        ...parsed,
        source: "gemini-ai",
      },
      ...parsed,
      source: "gemini-ai",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Social media generation failed.";
    console.error("Social API error:", message);
    const status = message.includes("required") || message.includes("exceeds") ? 400 : 503;
    res.status(status).json({ 
      success: false, 
      error: message 
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

CRITICAL ACCURACY & COMPLIANCE RULES:
1. Do NOT invent or fabricate official regulations, import licenses, exact tariff duty percentages, mandatory HS codes, buyers, companies, phone numbers, email addresses, or market statistics.
2. Do NOT promise guaranteed export profits, guaranteed sales, or verified buyer lists.
3. When information depends on destination-country specific rules, customs classifications, or bi-lateral trade agreements, YOU MUST explicitly label it as: "Needs verification with the relevant official authority."
4. Provide practical, high-value commercial guidance:
   - Target-country market research & product suitability
   - HS-code research guidance (explaining how the 6-digit Harmonized System works and how to find the specific national 8-10 digit tariff line)
   - Incoterms explanation (e.g. FOB vs CIF vs DDP, where transfer of risk occurs)
   - Payment method guidance (e.g. Irrevocable LC at Sight, Advance TT 30/70, Documentary Collections)
   - Packaging, labeling & seaworthy logistics (drop testing, ISPM-15 wooden pallet heat treatment, barcode/country of origin labeling)
   - Required international shipping documents checklist (Commercial Invoice, Packing List, Bill of Lading / Airway Bill, Certificate of Origin, Insurance)
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

    const aiJson = await generateWithGemini(prompt, { jsonMode: true });
    const parsed = JSON.parse(aiJson);

    res.status(200).json({
      success: true,
      data: {
        ...parsed,
        source: "gemini-ai",
      },
      ...parsed,
      content: parsed.content || "Export briefing generated successfully.",
      source: "gemini-ai",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Export intelligence engine call failed.";
    console.error("Export API error:", message);
    const status = message.includes("required") || message.includes("exceeds") ? 400 : 503;
    res.status(status).json({ 
      success: false, 
      error: message 
    });
  }
});

// 5. Business Planning & Growth Suite Endpoint
app.post("/api/ai/business", async (req, res) => {
  try {
    const { toolType, inputData } = req.body;

    if (!toolType || typeof toolType !== "string") {
      res.status(400).json({ error: "toolType is required." });
      return;
    }

    const prompt = `You are a senior commercial strategist and business growth advisor.
Tool Requested: ${toolType}
Input Data: ${JSON.stringify(inputData || {})}

Provide a structured, highly actionable business deliverable in clear markdown format.
Be rigorous, realistic, and commercially sound. Do not invent fake statistics or guaranteed financial outcomes.`;

    const aiText = await generateWithGemini(prompt);
    res.json({ content: aiText, source: "gemini-ai" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Business growth engine call failed.";
    console.error("Business API error:", message);
    res.status(503).json({ error: message });
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

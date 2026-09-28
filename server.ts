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
      businessProfile,
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

    // Parse business profile if provided
    let businessProfileSummary = "";
    if (businessProfile && typeof businessProfile === "object") {
      const parts: string[] = [];
      if (businessProfile.businessName) parts.push(`Business Name: ${businessProfile.businessName}`);
      if (businessProfile.businessType) parts.push(`Business Type: ${businessProfile.businessType}`);
      if (businessProfile.industry) parts.push(`Industry: ${businessProfile.industry}`);
      if (businessProfile.city || businessProfile.country) parts.push(`Location: ${[businessProfile.city, businessProfile.country].filter(Boolean).join(", ")}`);
      if (businessProfile.serviceArea || businessProfile.targetArea) parts.push(`Service Area: ${businessProfile.serviceArea || businessProfile.targetArea}`);
      if (businessProfile.products || businessProfile.services || businessProfile.productsServices) parts.push(`Products/Services: ${businessProfile.products || businessProfile.services || businessProfile.productsServices}`);
      if (businessProfile.priceRange) parts.push(`Price Range: ${businessProfile.priceRange}`);
      if (businessProfile.targetCustomer || businessProfile.targetCustomers) parts.push(`Target Customer: ${businessProfile.targetCustomer || businessProfile.targetCustomers}`);
      if (businessProfile.currentCustomerSource) parts.push(`Current Customer Source: ${businessProfile.currentCustomerSource}`);
      if (businessProfile.marketingBudget || businessProfile.monthlyMarketingBudget) parts.push(`Marketing Budget: ${businessProfile.marketingBudget || businessProfile.monthlyMarketingBudget}`);
      if (businessProfile.mainGoal) parts.push(`Main Goal: ${businessProfile.mainGoal}`);
      if (businessProfile.timePeriod) parts.push(`Time Period: ${businessProfile.timePeriod}`);
      if (parts.length > 0) {
        businessProfileSummary = `\nUSER BUSINESS PROFILE DETAILS:\n${parts.join("\n")}\n`;
      }
    }

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

    const prompt = `You are a practical, results-driven AI Business Growth Operating System.
Your job is to diagnose whatever business problem the user describes and provide an end-to-end practical solution (Root Cause, Website Fixes, Customer Acquisition, Sales Scripts & Objections, Ads Strategy, Local/Organic Growth, Ready-to-Copy Materials, 7-Day Plan, and Tracking & Optimization).

Rules:
- Work for ANY business problem (sales, no customers, website, Instagram, Facebook, export, local shop, pricing, reviews, competition, etc.)
- No motivational talk, no long theory
- Be direct, specific, and hyper-practical
- Give ready-to-use materials that the user can copy-paste immediately
- Prefer free or low-cost methods first
- Keep answers short, clear, and actionable

USER BUSINESS PROBLEM / INQUIRY:
"${trimmedQuery}"
${businessProfileSummary}
${crawledWebsiteSummary ? `\n${crawledWebsiteSummary}\n` : ""}
${historyText ? `Recent Conversation History:\n${historyText}\n` : ""}

TARGET OUTPUT LANGUAGE:
"${selectedLanguage}"

CRITICAL LANGUAGE REQUIREMENT:
The user has chosen "${selectedLanguage}" as their desired output language.
You MUST write all generated text in the JSON response strictly in "${selectedLanguage}".
Even if the user wrote their inquiry in English or another language, translate and provide all answers, scripts, action plans, headlines, and advice in "${selectedLanguage}".
Only keep official URLs or brand names in their original form.

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
    { "day": 1, "task": "Exact task for day 1", "time_required": "30 mins" },
    { "day": 2, "task": "Exact task for day 2", "time_required": "45 mins" },
    { "day": 3, "task": "Exact task for day 3", "time_required": "30 mins" },
    { "day": 4, "task": "Exact task for day 4", "time_required": "45 mins" },
    { "day": 5, "task": "Exact task for day 5", "time_required": "30 mins" },
    { "day": 6, "task": "Exact task for day 6", "time_required": "30 mins" },
    { "day": 7, "task": "Exact task for day 7", "time_required": "30 mins" }
  ],
  "expected_result": "Realistic result if they follow the plan (e.g. 3-8 qualified customer conversations within 7-14 days)",
  "next_one_thing": "The single most important action they must do today",
  "root_cause_diagnosis": {
    "primary_problem": "Core bottleneck",
    "secondary_problems": ["Secondary bottleneck 1", "Secondary bottleneck 2"],
    "evidence": ["Direct observation or evidence"],
    "possible_causes": ["Cause 1", "Cause 2"],
    "confirmed_facts": ["Confirmed point"],
    "assumptions": ["Logical assumption"],
    "missing_information": ["What data to observe next"],
    "fix_this_first": "The exact #1 bottleneck to eliminate first"
  },
  "website_analysis": {
    "what_found": "Observed findings from website or presence",
    "why_it_matters": "Why this hurts conversion",
    "what_to_change": "Exact improvement",
    "exact_replacement": {
      "current_headline": "Old observed or weak headline",
      "recommended_headline": "High-converting headline",
      "current_cta": "Old generic CTA",
      "recommended_cta": "Action-driven CTA"
    },
    "homepage_copy": "Hero & value prop copy",
    "service_copy": "Clear commercial pitch for services",
    "cta": "Primary button copy",
    "faq": [
      { "question": "Customer question", "answer": "Clear persuasive answer" }
    ],
    "lead_form": ["Name", "WhatsApp / Phone", "Specific requirement"],
    "whatsapp_cta": "Click to Chat on WhatsApp: 'Hi, I need details on [Offer]'",
    "landing_page_structure": ["Hero with offer & CTA", "Trust badges / proof", "3 Core Benefits", "Clear Pricing / Packages", "FAQ & Final WhatsApp CTA"]
  },
  "customer_acquisition": {
    "summary": "Core customer acquisition strategy",
    "free_organic_channels": [
      { "channel": "Google Business Profile & Local Groups", "how_to_execute": "Exact steps to get inquiries", "target_reach": "Local high-intent buyers" }
    ],
    "low_cost_channels": [
      { "channel": "Direct WhatsApp / DM Outreach & Partner Referrals", "how_to_execute": "Step-by-step outreach", "target_reach": "Qualified prospects" }
    ],
    "paid_channels": [
      { "channel": "Google Search Ads or Meta/Instagram Ads", "how_to_execute": "Exact campaign setup", "budget_needed": "$5 - $10 / day" }
    ],
    "hundred_prospects_plan": {
      "target_profile": { "industry": "Target niche", "location": "City or territory", "core_need": "Burning problem they pay to solve" },
      "channels": [
        { "channel": "Google Maps / Business Directory", "activity_target": 50, "qualification_criteria": "Active phone and business need", "action_method": "Send personalized WhatsApp/DM" },
        { "channel": "LinkedIn / B2B Network", "activity_target": 50, "qualification_criteria": "Decision maker profile", "action_method": "Send direct connection + intro script" }
      ],
      "outreach_script": "Hi [Name], I noticed your work on [Topic]. We help businesses in [City] achieve [Specific Result]. Would you like to see 2 quick examples?"
    }
  },
  "sales_strategy": {
    "sales_pitch": "30-second conversational pitch",
    "phone_script": "Opening script and qualifying questions for phone calls",
    "whatsapp_sales_script": "Ready message sequence to turn inquiries into paying clients",
    "email_sales_script": "High-response cold / warm email script",
    "objection_handling": [
      { "objection": "Price is too high / I can't afford it", "response": "Exact word-for-word response handling value and ROI" },
      { "objection": "I need to think about it / compare", "response": "Exact word-for-word response creating clarity" },
      { "objection": "Competitor is offering cheaper", "response": "Exact word-for-word response highlighting difference" }
    ],
    "closing_questions": [
      "Shall we reserve your spot for this week, or do you prefer starting Monday?",
      "Would you like to start with package A or package B?"
    ],
    "follow_up_sequence": [
      { "timing": "Day 0", "channel": "WhatsApp", "subject_or_hook": "Thanks for connecting", "message_copy": "Hi [Name], thank you for checking with us. Here is the summary we discussed...", "cta": "Let me know if you have any questions" },
      { "timing": "Day 2", "channel": "WhatsApp / Email", "subject_or_hook": "Case study & quick question", "message_copy": "Hi [Name], thought this quick case study might help with your decision...", "cta": "Should we lock in your order?" },
      { "timing": "Day 5", "channel": "WhatsApp / Phone", "subject_or_hook": "Final check on availability", "message_copy": "Hi [Name], checking in before closing this week's onboarding slots...", "cta": "Let me know if we should proceed" }
    ]
  },
  "ads_strategy": {
    "recommended_platform": "Google Search Ads or Meta / Instagram Ads",
    "campaign_objective": "Lead Generation / Sales",
    "target_audience": {
      "demographics": "Age 25-54, relevant interests",
      "location": "City or Target Radius",
      "interests_or_keywords": ["High intent keyword 1", "High intent keyword 2", "High intent keyword 3"],
      "negative_keywords": ["free", "cheap", "diy", "jobs", "salary"]
    },
    "budget_plan": { "daily_budget": "$5 - $15 / day", "bidding_strategy": "Maximize Conversions or Manual CPC" },
    "ad_copy": {
      "headlines": ["Headline 1 (30 chars max)", "Headline 2", "Headline 3"],
      "descriptions": ["Description 1 (90 chars max)", "Description 2"],
      "cta": "Get Free Quote / Chat on WhatsApp"
    },
    "landing_page_advice": "Send traffic to a dedicated landing page matching the headline with a fast WhatsApp CTA or 3-question form",
    "creative_direction": {
      "image_brief": "Real, high-contrast photo of finished work or before/after in natural light",
      "video_script": {
        "hook": "Tired of [Common Frustration]?",
        "body": "Here is how our proven [Service] gives you [Result] without [Pain]...",
        "cta": "Tap the link below to get started today."
      }
    },
    "tracking_guidance": "Install Meta Pixel or Google Tag to track 'Lead' and 'Contact' button clicks"
  },
  "organic_local_strategy": {
    "gbp_plan": {
      "category_suggestions": ["Primary Category", "Secondary Category"],
      "description": "750-character SEO description highlighting city, services, and trust",
      "photo_checklist": ["Exterior / Storefront", "Team at work", "Finished product / Before & After", "Happy customer moments"],
      "weekly_post_ideas": ["Post 1: Client transformation story", "Post 2: Pro tip answering top customer question"],
      "review_request_template": "Hi [Name], thank you for trusting us! If you liked our service, could you take 30 seconds to drop a quick review? Here is the link: [Link]",
      "review_response_templates": {
        "positive": "Thank you so much [Name]! It was a pleasure serving you.",
        "critical": "Thank you for sharing your feedback [Name]. We take this seriously — please call us at [Phone] so we can make this right immediately."
      }
    },
    "referral_system": {
      "offer": "Give $20 / 10% to your friend, get $20 / 10% credit on your next order",
      "request_script": "Hi [Name], we love working with you. If you know anyone looking for [Service], feel free to share our contact!",
      "incentive_model": "Two-sided win"
    },
    "content_calendar": [
      { "day": 1, "format": "Instagram Reel / Short", "topic": "Top mistake customers make", "hook": "Stop doing this if you want...", "caption": "Full explanation with hashtags", "cta": "Comment 'HELP' for pricing" },
      { "day": 2, "format": "Carousel / Photo", "topic": "Customer transformation", "hook": "How [Client] achieved [Result] in 14 days", "caption": "Story breakdown", "cta": "Save this post" }
    ]
  },
  "action_center": [
    { "timeframe": "TODAY", "action": "Update primary headline & WhatsApp CTA", "why": "Immediate conversion lift", "how": "Copy and paste ready materials", "tool": "Website / Bio", "cost_category": "FREE", "expected_metric": "Zero friction inquiries" },
    { "timeframe": "THIS WEEK", "action": "Send 20 personalized outreach messages", "why": "Generates first 3-5 sales conversations", "how": "Use the ready WhatsApp / DM script", "tool": "WhatsApp / Phone", "cost_category": "FREE", "expected_metric": "3-5 conversations" }
  ],
  "growth_roadmap": {
    "day_30": "Consistent inbound inquiries established (5-10 per week)",
    "day_60": "Referral loop and repeat customer systems active",
    "day_90": "Scalable customer acquisition channel producing predictable revenue"
  },
  "tracking_and_metrics": [
    { "metric": "Total Qualified Inquiries", "target_baseline": "5-10 per week", "how_to_measure": "Inbound chat / call log" },
    { "metric": "Inquiry-to-Sale Conversion Rate", "target_baseline": "20% - 30%", "how_to_measure": "Closed deals divided by total inquiries" }
  ],
  "optimization_guidance": {
    "keep": ["Direct communication with high-intent buyers"],
    "change": ["Weak, generic headlines on site or bio"],
    "pause": ["Unfocused posting without clear CTAs"],
    "test": ["Testing WhatsApp direct CTA vs lead form"],
    "improve": ["Speed of reply to first inquiry (under 5 minutes)"],
    "next_experiment": "Run the 7-day action plan and log every inquiry response"
  }
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
      action_plan: Array.isArray(parsed.action_plan) ? parsed.action_plan.map((item: any, idx: number) => ({
        day: item.day || idx + 1,
        task: item.task || item.action || `Action task ${idx + 1}`,
        time_required: item.time_required || "30-45 mins",
      })) : [
        { day: 1, task: "Replace headline and add direct WhatsApp CTA button", time_required: "30 mins" },
        { day: 2, task: "Send main outreach script to 15 warm prospects", time_required: "45 mins" },
        { day: 3, task: "Follow up with warm inquiries using the extra script", time_required: "30 mins" },
        { day: 4, task: "Post customer proof or behind-the-scenes on social / Google Business Profile", time_required: "45 mins" },
        { day: 5, task: "Review inquiries and count qualified leads", time_required: "30 mins" },
        { day: 6, task: "Follow up on pending quotes with objection handling script", time_required: "30 mins" },
        { day: 7, task: "Review weekly metrics and plan the next 30 days", time_required: "30 mins" }
      ],
      expected_result: parsed.expected_result || parsed.expected_outcome || "Realistic 3-8 qualified buyer conversations within 7-14 days.",
      next_one_thing: parsed.next_one_thing || parsed.next_action || parsed.immediate_action || "Send the ready outreach script today.",
      website_data: websiteCrawlData,
      root_cause_diagnosis: parsed.root_cause_diagnosis || {
        primary_problem: parsed.real_problem || "Customer acquisition and conversion friction",
        secondary_problems: ["Weak headline positioning", "Delayed follow-up loop"],
        evidence: [crawledWebsiteSummary ? "Observable website signals analyzed" : "User inquiry description"],
        possible_causes: ["Traffic lacks strong buyer intent", "Offer value unclear"],
        confirmed_facts: [parsed.understood || "Identified core challenge"],
        assumptions: ["Business can fulfill demand immediately once inquiries start"],
        missing_information: ["Exact close rate per 10 conversations"],
        fix_this_first: parsed.immediate_action || "Deploy clear offer headline & direct CTA",
      },
      website_analysis: parsed.website_analysis || {
        what_found: websiteCrawlData?.observableIssues?.join("; ") || "Weak value proposition or missing direct CTA",
        why_it_matters: "Visitors do not understand why they should buy immediately",
        what_to_change: "Rewrite hero headline and replace generic button with WhatsApp CTA",
        exact_replacement: {
          current_headline: websiteCrawlData?.detectedTitle || "Generic Business Tagline",
          recommended_headline: parsed.ready_materials?.headline_or_offer || "High-Converting Headline Offering Clear Value",
          current_cta: "Submit / Contact Us",
          recommended_cta: parsed.ready_materials?.cta || "Chat on WhatsApp & Get Instant Quote",
        },
        homepage_copy: parsed.ready_materials?.headline_or_offer || "Fast, reliable commercial solutions.",
        service_copy: "We solve your core business challenge with guaranteed turnaround.",
        cta: parsed.ready_materials?.cta || "Chat on WhatsApp",
        faq: [
          { question: "How fast do you respond?", answer: "We respond within 15 minutes during business hours." },
          { question: "What are your prices?", answer: "Transparent packages tailored to your exact requirement." }
        ],
        lead_form: ["Full Name", "WhatsApp Number", "Service Needed"],
        whatsapp_cta: "Click here to message us directly on WhatsApp",
        landing_page_structure: ["Hero headline + CTA", "Proof / Reviews", "Services List", "WhatsApp CTA Button"]
      },
      customer_acquisition: parsed.customer_acquisition || {
        summary: "Focus on zero-cost organic outreach and Google Business visibility first.",
        free_organic_channels: [
          { channel: "Google Business Profile & Local Maps", how_to_execute: "Optimize category and post weekly updates with photos", target_reach: "High-intent local searches" },
          { channel: "Direct WhatsApp / Message Outreach", how_to_execute: "Send ready script to 15 warm contacts daily", target_reach: "Immediate prospective buyers" }
        ],
        low_cost_channels: [
          { channel: "Referral Program with Existing Clients", how_to_execute: "Offer reciprocal discount or bonus for introductions", target_reach: "Warm introductions" }
        ],
        paid_channels: [
          { channel: "Local Search Ads (Google) or Meta Lead Ads", how_to_execute: "Target specific city radius with $5/day budget", budget_needed: "$5 - $10/day" }
        ],
        hundred_prospects_plan: {
          target_profile: { industry: "Local or Niche Market", location: "Primary territory", core_need: "Immediate problem solution" },
          channels: [
            { channel: "Google Maps & Directories", activity_target: 50, qualification_criteria: "Verified phone and business need", action_method: "Personalized WhatsApp / Email message" },
            { channel: "Professional Groups & Social", activity_target: 50, qualification_criteria: "Active business presence", action_method: "Direct outreach script" }
          ],
          outreach_script: parsed.ready_materials?.main_script || "Hi, I noticed your business and have a quick suggestion to increase inquiries. Can I share 2 points?"
        }
      },
      sales_strategy: parsed.sales_strategy || {
        sales_pitch: "We help you solve [Problem] with fast turnaround and clear pricing, so you get real results without stress.",
        phone_script: "Hi [Name], thank you for calling. To make sure we give you the exact best option, can I ask 2 quick questions about what you need?",
        whatsapp_sales_script: parsed.ready_materials?.main_script || "Hi [Name], thank you for reaching out! We can certainly help with that. Are you looking to start this week?",
        email_sales_script: parsed.ready_materials?.extra_material || "Hi [Name], following up regarding your inquiry. Here are our exact packages...",
        objection_handling: [
          { objection: "Price is too high / Expensive", response: "I completely understand budget is key. Our clients find this pays for itself because [Clear ROI]. Would our smaller starter package fit your timeline?" },
          { objection: "I need to think about it", response: "Understood! What specific detail can I clarify for you so you have everything you need to decide?" },
          { objection: "Competitor is cheaper", response: "Competitors may charge less, but our package includes [Key Benefit/Guarantee] so you never have to pay twice to fix mistakes." }
        ],
        closing_questions: [
          "Shall we book your slot for this Thursday, or would Friday work better?",
          "Can I send you the confirmation invoice on WhatsApp right now?"
        ],
        follow_up_sequence: [
          { timing: "Day 0", channel: "WhatsApp", subject_or_hook: "Quick summary of our call", message_copy: "Hi [Name], great speaking today! As discussed, here is the package link...", cta: "Let me know if you would like me to lock this in." },
          { timing: "Day 2", channel: "WhatsApp / Email", subject_or_hook: "Quick check-in", message_copy: "Hi [Name], did you have a chance to look over the details? Happy to answer any questions.", cta: "Can we connect for 2 minutes?" },
          { timing: "Day 5", channel: "WhatsApp / Phone", subject_or_hook: "Slot update", message_copy: "Hi [Name], checking in before our schedule fills up for next week.", cta: "Should we keep your spot open?" }
        ]
      },
      ads_strategy: parsed.ads_strategy || {
        recommended_platform: "Google Search Ads or Meta/Instagram",
        campaign_objective: "Lead Generation",
        target_audience: {
          demographics: "Target Age 25-54",
          location: "Target Service City",
          interests_or_keywords: ["High intent search keywords"],
          negative_keywords: ["free", "cheap", "diy", "jobs"]
        },
        budget_plan: { daily_budget: "$5 - $10 / day", bidding_strategy: "Maximize Conversions" },
        ad_copy: {
          headlines: [parsed.ready_materials?.headline_or_offer?.slice(0, 30) || "Top Rated Business Service", "Fast & Reliable Quote", "Book Online Today"],
          descriptions: ["Professional solutions delivered on time with guaranteed quality. Contact us today.", "Trusted by hundreds of local customers. Get your free estimate now."],
          cta: parsed.ready_materials?.cta || "Get Free Quote"
        },
        landing_page_advice: "Keep the page focused on one action with WhatsApp button and customer reviews.",
        creative_direction: {
          image_brief: "Clean photo showing finished work or customer smile with natural lighting.",
          video_script: {
            hook: "Struggling with [Problem]?",
            body: "Here is how our service solves it in 3 easy steps.",
            cta: "Click below to get started."
          }
        },
        tracking_guidance: "Track button clicks on WhatsApp and form submissions."
      },
      organic_local_strategy: parsed.organic_local_strategy || {
        gbp_plan: {
          category_suggestions: ["Primary Category", "Secondary Category"],
          description: "Trusted local service providing high quality solutions.",
          photo_checklist: ["Storefront / Office", "Team photo", "Product close-up", "Customer handover"],
          weekly_post_ideas: ["Weekly Tip for clients", "Special seasonal package announcement"],
          review_request_template: "Hi [Name], thank you for choosing us! Could you take 30 seconds to write a brief review? Here is the link: [Link]",
          review_response_templates: {
            positive: "Thank you so much [Name]! We love working with you.",
            critical: "Thank you for the feedback [Name]. Please call us directly so we can resolve this right away."
          }
        },
        referral_system: {
          offer: "Refer a friend and get 10% discount on your next order.",
          request_script: "Hi [Name], if you have a colleague or friend who needs [Service], please connect us!",
          incentive_model: "Two-way discount"
        },
        content_calendar: [
          { day: 1, format: "Reel", topic: "Behind the scenes", hook: "Watch how we create [Product]", caption: "Detailed caption with hashtags", cta: "Message us for pricing" },
          { day: 2, format: "Carousel", topic: "3 Common Mistakes", hook: "Don't make this mistake when buying [Product]", caption: "Swipe through to see tips", cta: "Save this post" }
        ]
      },
      action_center: parsed.action_center || [
        { timeframe: "TODAY", action: "Deploy new headline and WhatsApp CTA", why: "Immediately fixes conversion leaks", how: "Copy paste ready materials", tool: "Website / Bio", cost_category: "FREE", expected_metric: "First 5 inquiries" },
        { timeframe: "THIS WEEK", action: "Execute 7-Day outreach plan", why: "Generates pipeline of warm conversations", how: "Send main script to 15 prospects daily", tool: "WhatsApp / Phone", cost_category: "FREE", expected_metric: "3-8 qualified conversations" }
      ],
      growth_roadmap: parsed.growth_roadmap || {
        day_30: "Consistent inbound inquiries established (5-10 per week)",
        day_60: "Repeat orders and referral engine active",
        day_90: "Scaling to new geographic regions or product categories",
      },
      tracking_and_metrics: parsed.tracking_and_metrics || [
        { metric: "Qualified Inquiries", target_baseline: "5-10 per week", how_to_measure: "Weekly chat log" },
        { metric: "Inquiry to Close Rate", target_baseline: "20% - 30%", how_to_measure: "Closed sales / Inquiries" }
      ],
      optimization_guidance: parsed.optimization_guidance || {
        keep: ["Direct WhatsApp communication"],
        change: ["Generic slogans without offers"],
        pause: ["Unfocused ads with high bounce rate"],
        test: ["New headline copy against current headline"],
        improve: ["Response time to initial message (aim for under 5 mins)"],
        next_experiment: "Run 7-day action plan and count closed deals"
      }
    };

    // Also build backward-compatible solutionPack
    const solutionPack = {
      diagnosis: {
        main_problem: practicalResult.real_problem,
        root_causes: practicalResult.root_cause_diagnosis?.secondary_problems || [practicalResult.real_problem],
        severity: "High" as const,
        summary: practicalResult.understood + " " + practicalResult.real_problem,
      },
      ready_materials: {
        headline_options: [practicalResult.ready_materials.headline_or_offer],
        whatsapp_scripts: [practicalResult.ready_materials.main_script, practicalResult.sales_strategy.whatsapp_sales_script].filter(Boolean),
        email_or_dm_scripts: [practicalResult.ready_materials.extra_material, practicalResult.sales_strategy.email_sales_script].filter(Boolean),
        offer_or_pricing: practicalResult.ready_materials.headline_or_offer,
        cta_examples: [practicalResult.ready_materials.cta],
        faqs: practicalResult.website_analysis?.faq || [],
      },
      seven_day_plan: practicalResult.action_plan.map((item: any, idx: number) => ({
        day: item.day || idx + 1,
        title: item.task.slice(0, 35),
        tasks: [item.task],
        time_required: item.time_required || "30-45 mins",
      })),
      growth_roadmap: practicalResult.growth_roadmap,
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
${practicalResult.action_plan.map((item: any) => `* **Day ${item.day} (${item.time_required || "30m"}):** ${item.task}`).join("\n")}

### 🎯 Expected Result
${practicalResult.expected_result}

### ⭐ Next One Thing Today
${practicalResult.next_one_thing}

### 🔬 Root-Cause Diagnosis
* **Primary Problem:** ${practicalResult.root_cause_diagnosis?.primary_problem}
* **Fix This First:** ${practicalResult.root_cause_diagnosis?.fix_this_first}

### 🌐 Website & Conversion Fixes
* **Current Headline:** ${practicalResult.website_analysis?.exact_replacement?.current_headline || "N/A"}
* **Recommended Headline:** ${practicalResult.website_analysis?.exact_replacement?.recommended_headline}
* **Current CTA:** ${practicalResult.website_analysis?.exact_replacement?.current_cta || "N/A"}
* **Recommended CTA:** ${practicalResult.website_analysis?.exact_replacement?.recommended_cta}

### 💼 Sales Strategy & Objections
* **Sales Pitch:** ${practicalResult.sales_strategy?.sales_pitch}
* **Closing Questions:** ${practicalResult.sales_strategy?.closing_questions?.join(" | ")}

### 📊 30 / 60 / 90-Day Growth Roadmap
* **Day 30:** ${practicalResult.growth_roadmap?.day_30}
* **Day 60:** ${practicalResult.growth_roadmap?.day_60}
* **Day 90:** ${practicalResult.growth_roadmap?.day_90}`;

    const sourceName = getProviderSourceName(provider);

    res.status(200).json({
      success: true,
      data: {
        practicalResult,
        solutionPack,
        answer: practicalResult.real_problem,
        problemType: "business_growth_os",
        isLowBudgetMode: true,
        diagnosis: {
          summary: practicalResult.real_problem,
          likelyBottlenecks: practicalResult.root_cause_diagnosis?.secondary_problems || [practicalResult.real_problem],
          confirmedFindings: practicalResult.root_cause_diagnosis?.confirmed_facts || [practicalResult.understood],
          assumptions: practicalResult.root_cause_diagnosis?.assumptions || [],
          priorityFix: practicalResult.root_cause_diagnosis?.fix_this_first || practicalResult.next_one_thing,
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
          materialSnippet: d.time_required || "",
          completed: false,
        })),
        actionPlan: {
          today: [practicalResult.next_one_thing],
          next7Days: practicalResult.action_plan.map((d: any) => `Day ${d.day}: ${d.task}`),
          next30Days: [practicalResult.growth_roadmap?.day_30 || "Evaluate conversion results and customer response"],
          next60Days: [practicalResult.growth_roadmap?.day_60 || "Scale customer acquisition"],
          next90Days: [practicalResult.growth_roadmap?.day_90 || "Expand business channels"],
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

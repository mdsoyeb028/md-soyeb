import {
  generateAICompletion,
  AIProviderError,
  normalizeServerErrorMessage,
  safeParseJson,
  getProviderSourceName,
} from "../aiProvider.ts";
import { performRealSeoAudit } from "../seoCrawler.ts";
import { parseRequestBody, sendJsonResponse } from "../serverlessHttp.ts";
import { performRealResearch, buildVerifiedProspectWorkflow } from "../researchEngine.ts";

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
      businessProfile,
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

    // 2. Real Research Layer & Official Documentation Gathering
    let realResearchData = await performRealResearch(trimmedQuery, businessProfile);
    let researchSummary = "";
    if (realResearchData.live_research_status === "active" && realResearchData.sources.length > 0) {
      researchSummary = `
REAL VERIFIED RESEARCH FINDINGS:
${realResearchData.sources.map(s => `• SOURCE: ${s.source} (${s.source_url})
  WHAT FOUND: ${s.what_was_found}
  WHY IT MATTERS: ${s.why_it_matters}
  RECENCY: ${s.date_or_recency}`).join("\n\n")}
`;
    }

    // 3. Verified Prospect Research Assembly
    const targetService = businessProfile?.services || businessProfile?.productsServices || businessProfile?.businessType || "Business Services";
    const targetAudience = businessProfile?.targetCustomer || businessProfile?.targetCustomers || "Target Buyers";
    const targetLocation = [businessProfile?.city, businessProfile?.country].filter(Boolean).join(", ") || "Target Area";
    const targetIndustry = businessProfile?.industry || businessProfile?.businessType || "Commercial";
    const customerType = businessProfile?.businessType?.toLowerCase().includes("b2b") ? "B2B Enterprise / Commercial" : "B2C / High Intent Buyers";
    
    const prospectWorkflow = buildVerifiedProspectWorkflow(
      targetService,
      targetAudience,
      targetLocation,
      targetIndustry,
      customerType,
      100
    );

    const isDoItForMe = Boolean(doItForMe || trimmedQuery.toLowerCase().includes("create everything") || trimmedQuery.toLowerCase().includes("solve my problem"));

    const prompt = `You are a practical, research-grounded AI Business Growth Operating System.
Your job is to diagnose whatever business problem the user describes and provide an end-to-end practical solution.

Strict Grounding & Integrity Rules:
- Ground all recommendations on the real research and crawled website data provided below.
- Never invent sources, fake statistics, or fake performance numbers.
- Never claim guaranteed leads, sales, ROI, or conversions.
- Clearly separate:
  1. CONFIRMED FACTS & OBSERVED DATA
  2. USER INPUTS
  3. REAL RESEARCH FINDINGS
  4. INFERENCES & HYPOTHESES (explicitly labeled as hypothesis)
- For Customer Acquisition: Evaluate channels realistically. Do NOT rank channels using fake scores.
- For Google Ads & Meta Ads: Prepare complete campaign structures with budget scenarios (Low Budget Test, Standard Test, Higher Test). Include explicit authorization safeguards ("Campaign review and authorization required; the app will never launch or spend money without explicit user approval and integration").
- For Google Business Profile: Use official Google guidelines only (categories, photo checklist, weekly updates, authentic review generation rules strictly prohibiting fake or incentivized reviews).
- Provide ready-to-copy materials that the user can immediately deploy.

USER BUSINESS PROBLEM / INQUIRY:
"${trimmedQuery}"
${businessProfileSummary}
${crawledWebsiteSummary ? `\n${crawledWebsiteSummary}\n` : ""}
${researchSummary ? `\n${researchSummary}\n` : ""}
${historyText ? `Recent Conversation History:\n${historyText}\n` : ""}

TARGET OUTPUT LANGUAGE:
"${selectedLanguage}"

CRITICAL LANGUAGE REQUIREMENT:
The user has chosen "${selectedLanguage}" as their desired output language.
When the user selects a language:
- all AI-generated explanations
- diagnosis
- recommendations
- action plans
- scripts
- ads
- SEO recommendations
- social recommendations
- business recommendations
MUST be generated strictly in that selected language ("${selectedLanguage}").

Do NOT translate:
- URLs
- website domains
- YouTube channel names
- Instagram handles
- official product/brand names
- app names when they are proper names

Support RTL languages correctly when applicable (e.g. Arabic, Urdu, Persian, Hebrew).

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
  "expected_result": "Realistic result if they follow the plan (e.g. 3-8 qualified customer conversations within 7-14 days without fake guarantees)",
  "next_one_thing": "The single most important action they must do today",
  "root_cause_diagnosis": {
    "primary_problem": "Core bottleneck",
    "secondary_problems": ["Secondary bottleneck 1", "Secondary bottleneck 2"],
    "evidence": ["Direct observation or evidence"],
    "possible_causes": ["Cause 1", "Cause 2"],
    "confirmed_facts": ["Confirmed point"],
    "assumptions": ["Logical assumption"],
    "hypothesis_or_suspected_issue": ["Specific hypothesis regarding conversion or traffic friction"],
    "missing_data_needed_to_confirm": ["Data point to observe next to validate diagnosis"],
    "fix_this_first": "The exact #1 bottleneck to eliminate first"
  },
  "website_analysis": {
    "what_found": "Observed findings from website or presence",
    "why_it_matters": "Why this hurts conversion",
    "what_to_change": "Exact improvement",
    "distinctions": {
      "observed_facts": ["Directly observed fact from crawler or presence"],
      "user_input": ["Details provided by user in profile/query"],
      "research_findings": ["Factual industry/regulatory data from live research"],
      "inferences_and_hypotheses": ["Expert diagnosis labeled clearly as hypothesis"]
    },
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
    "evaluated_channels": [
      { "channel": "Google Business Profile & Local Search", "why_it_fits": "High intent local buyers actively searching nearby", "cost_category": "FREE", "difficulty": "Beginner", "expected_workload": "1-2 hours weekly updates", "how_to_start": "Complete profile, upload 10 photos, post weekly update", "what_to_measure": "Calls & direction requests", "source_or_link": "https://support.google.com/business/" },
      { "channel": "Direct WhatsApp & Referral Outreach", "why_it_fits": "Direct conversion path without ad intermediaries", "cost_category": "FREE", "difficulty": "Beginner", "expected_workload": "30 mins daily", "how_to_start": "Send personalized outreach script to 10 past clients or warm leads", "what_to_measure": "Response rate and scheduled consultations" },
      { "channel": "Google Search Ads (Intent PPC)", "why_it_fits": "Captures users actively typing high-intent keywords", "cost_category": "PAID", "difficulty": "Intermediate", "expected_workload": "2 hours setup, 30 mins weekly", "how_to_start": "Set up search campaign with exact match keywords and negative list", "what_to_measure": "Cost per qualified lead (CPL)", "source_or_link": "https://support.google.com/google-ads/" },
      { "channel": "Meta / Instagram Ads (Visual Showcase)", why_it_fits: "Visual before-and-after demonstration builds desire in local feeds", cost_category: "PAID", difficulty: "Intermediate", expected_workload: "1-2 hours per campaign", how_to_start: "Run 3-second hook Reel with direct WhatsApp CTA", what_to_measure: "Message conversations started", source_or_link: "https://www.facebook.com/business/ads" }
    ],
    "free_organic_channels": [
      { "channel": "Google Business Profile & Local Groups", "how_to_execute": "Exact steps to get inquiries", "target_reach": "Local high-intent buyers" }
    ],
    "low_cost_channels": [
      { "channel": "Direct WhatsApp / DM Outreach & Partner Referrals", "how_to_execute": "Step-by-step outreach", "target_reach": "Qualified prospects" }
    ],
    "paid_channels": [
      { "channel": "Google Search Ads or Meta/Instagram Ads", "how_to_execute": "Exact campaign setup", "budget_needed": "$5 - $10 / day" }
    ]
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
    "campaign_objective": "Lead Generation / Inquiries",
    "campaign_structure": {
      "campaign_name": "Search - High Intent Local Leads",
      "ad_groups": [
        {
          "name": "Core Service Inquiries",
          "keyword_themes": ["service near me", "professional service in city", "best local service quote"],
          "negative_keywords": ["free", "cheap", "diy", "jobs", "salary", "course"],
          "headlines": ["Top Rated Local Service", "Fast Transparent Pricing", "Book Your Quote Online"],
          "descriptions": ["Professional service delivered with verified quality standards. Inquire today.", "Trusted by hundreds of local clients. Chat directly on WhatsApp now."],
          "cta": "Get Free Quote"
        }
      ]
    },
    "target_audience": {
      "demographics": "Age 25-54, property or business owners",
      "location": "City or Target Radius",
      "interests_or_keywords": ["High intent keyword 1", "High intent keyword 2", "High intent keyword 3"],
      "negative_keywords": ["free", "cheap", "diy", "jobs", "salary"]
    },
    "budget_plan": { "daily_budget": "$5 - $15 / day", "bidding_strategy": "Maximize Conversions or Manual CPC" },
    "budget_scenarios": {
      "low_budget_test": { "daily_budget": "$3 - $5 / day", "test_duration": "7 days", "purpose": "Validate keyword click-through rate and search term search query intent" },
      "standard_test": { "daily_budget": "$10 - $15 / day", "test_duration": "14 days", "purpose": "Generate steady inbound WhatsApp inquiries and calculate baseline cost per lead" },
      "higher_test": { "daily_budget": "$25 - $40 / day", "test_duration": "30 days", "purpose": "Scale winning ad groups and capture maximum search impression share in target city" }
    },
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
    "tracking_guidance": "Install Meta Pixel or Google Tag to track 'Lead' and 'Contact' button clicks",
    "safeguards_notice": "Campaign review and authorization required. The system will never launch or spend money automatically without explicit user approval and verified account linking."
  },
  "meta_ads_strategy": {
    "campaign_objective": "Lead Generation / WhatsApp Messages",
    "audience": "Homeowners, commercial decision makers, age 25-55 in designated city",
    "location": "Target City + 20km radius",
    "creative_concept": "Before & After Transformation / Common Costly Mistake to Avoid",
    "primary_text": "Looking for reliable [Service] in [City]? See our latest turnkey client project completed on schedule with clear pricing.",
    "headline": "Transform Your Space in [City]",
    "cta": "Send WhatsApp Message",
    "image_brief": "High-resolution showcase of finished work with warm ambient lighting and client endorsement quote.",
    "video_reel_script": {
      "hook": "Before you hire a [Service Provider] in [City], check these 3 things...",
      "body": "Most people overpay by 30% because of hidden contractor markups. Here is our transparent turnkey pricing breakdown.",
      "cta": "Tap Send Message below to get our instant price guide on WhatsApp."
    },
    "landing_page": "Direct WhatsApp click-to-chat with pre-filled message",
    "tracking_events": ["Contact", "Lead"],
    "budget_test": {
      "low_budget_test": "$5/day for 5 days to test Reel creative hook",
      "standard_test": "$12/day for 14 days to stabilize message cost"
    }
  },
  "organic_local_strategy": {
    "gbp_plan": {
      "category_suggestions": ["Primary Category", "Secondary Category"],
      "description": "750-character SEO description highlighting city, services, and trust",
      "attributes_checklist": ["Identifies as locally owned", "Online estimates available", "On-site services available"],
      "photo_checklist": ["Exterior / Storefront", "Team at work", "Finished product / Before & After", "Happy customer moments"],
      "weekly_post_ideas": ["Post 1: Client transformation story", "Post 2: Pro tip answering top customer question"],
      "authentic_review_rules": [
        "Ask authentic happy clients immediately upon job completion",
        "Never offer discounts, money, or gifts for reviews (violates Google Policy)",
        "Respond to 100% of reviews within 24 hours with sincere gratitude or resolution"
      ],
      "review_request_template": "Hi [Name], thank you for trusting us! If you appreciated our service, could you take 30 seconds to drop an honest Google review? Here is the link: [Link]",
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

    // Normalize practical result with real research, verified prospects, and campaign approval safeguards
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
      expected_result: parsed.expected_result || parsed.expected_outcome || "Realistic 3-8 qualified buyer conversations within 7-14 days without fake guarantees.",
      next_one_thing: parsed.next_one_thing || parsed.next_action || parsed.immediate_action || "Send the ready outreach script today.",
      website_data: websiteCrawlData,
      real_research: realResearchData,
      root_cause_diagnosis: {
        primary_problem: parsed.root_cause_diagnosis?.primary_problem || parsed.real_problem || "Customer acquisition and conversion friction",
        secondary_problems: parsed.root_cause_diagnosis?.secondary_problems || ["Weak headline positioning", "Delayed follow-up loop"],
        evidence: parsed.root_cause_diagnosis?.evidence || [crawledWebsiteSummary ? "Observable website signals analyzed" : "User inquiry description"],
        possible_causes: parsed.root_cause_diagnosis?.possible_causes || ["Traffic lacks strong buyer intent", "Offer value unclear"],
        confirmed_facts: parsed.root_cause_diagnosis?.confirmed_facts || [parsed.understood || "Identified core challenge"],
        assumptions: parsed.root_cause_diagnosis?.assumptions || ["Business has fulfillment capacity for new clients"],
        hypothesis_or_suspected_issue: parsed.root_cause_diagnosis?.hypothesis_or_suspected_issue || ["Prospects bounce before recognizing specific local credibility or pricing clarity"],
        missing_data_needed_to_confirm: parsed.root_cause_diagnosis?.missing_data_needed_to_confirm || ["Close rate percentage per 10 customer conversations"],
        fix_this_first: parsed.root_cause_diagnosis?.fix_this_first || parsed.immediate_action || "Deploy clear offer headline & direct CTA",
      },
      website_analysis: {
        what_found: parsed.website_analysis?.what_found || (websiteCrawlData?.observableIssues?.join("; ") || "Weak value proposition or missing direct CTA"),
        why_it_matters: parsed.website_analysis?.why_it_matters || "Visitors do not understand why they should buy immediately",
        what_to_change: parsed.website_analysis?.what_to_change || "Rewrite hero headline and replace generic button with WhatsApp CTA",
        distinctions: {
          observed_facts: websiteCrawlData 
            ? [`Title: ${websiteCrawlData.detectedTitle || "None"}`, `H1: ${websiteCrawlData.detectedH1?.join(" | ") || "None"}`, `Health score: ${websiteCrawlData.score}/100`]
            : ["No direct website URL provided; analysis evaluated user business inputs"],
          user_input: [
            businessProfile?.businessName ? `Business: ${businessProfile.businessName}` : null,
            businessProfile?.city ? `Location: ${businessProfile.city}` : null,
            businessProfile?.productsServices ? `Offer: ${businessProfile.productsServices}` : null,
            `Inquiry: "${trimmedQuery.slice(0, 100)}..."`
          ].filter(Boolean) as string[],
          research_findings: realResearchData.sources.map(s => `${s.source}: ${s.what_was_found.slice(0, 100)}...`),
          inferences_and_hypotheses: [
            "Hypothesis: Adding transparent pricing tiers will filter out non-budget leads",
            "Hypothesis: Direct 1-tap WhatsApp button will improve mobile lead conversion by 30-40%"
          ]
        },
        exact_replacement: {
          current_headline: parsed.website_analysis?.exact_replacement?.current_headline || websiteCrawlData?.detectedTitle || "Generic Business Tagline",
          recommended_headline: parsed.website_analysis?.exact_replacement?.recommended_headline || parsed.ready_materials?.headline_or_offer || "High-Converting Headline Offering Clear Value",
          current_cta: parsed.website_analysis?.exact_replacement?.current_cta || "Submit / Contact Us",
          recommended_cta: parsed.website_analysis?.exact_replacement?.recommended_cta || parsed.ready_materials?.cta || "Chat on WhatsApp & Get Instant Quote",
        },
        homepage_copy: parsed.website_analysis?.homepage_copy || parsed.ready_materials?.headline_or_offer || "Fast, reliable commercial solutions.",
        service_copy: parsed.website_analysis?.service_copy || "We solve your core business challenge with verified quality turnaround.",
        cta: parsed.website_analysis?.cta || parsed.ready_materials?.cta || "Chat on WhatsApp",
        faq: parsed.website_analysis?.faq || [
          { question: "How fast do you respond?", answer: "We respond within 15 minutes during business hours." },
          { question: "What are your prices?", answer: "Transparent packages tailored to your exact requirement." }
        ],
        lead_form: parsed.website_analysis?.lead_form || ["Full Name", "WhatsApp Number", "Service Needed"],
        whatsapp_cta: parsed.website_analysis?.whatsapp_cta || "Click here to message us directly on WhatsApp",
        landing_page_structure: parsed.website_analysis?.landing_page_structure || ["Hero headline + CTA", "Proof / Reviews", "Services List", "WhatsApp CTA Button"]
      },
      customer_acquisition: {
        summary: parsed.customer_acquisition?.summary || "Focus on zero-cost organic outreach and Google Business visibility first.",
        evaluated_channels: parsed.customer_acquisition?.evaluated_channels || [
          { channel: "Google Business Profile & Local Search", why_it_fits: "High intent local searches actively seeking nearby providers", cost_category: "FREE", difficulty: "Beginner", expected_workload: "1-2 hours weekly updates", how_to_start: "Complete profile attributes, upload 10 photos, post weekly updates", what_to_measure: "Calls & map direction requests", source_or_link: "https://support.google.com/business/" },
          { channel: "Direct WhatsApp & Referral Outreach", why_it_fits: "Direct relationship conversion path without advertising costs", cost_category: "FREE", difficulty: "Beginner", expected_workload: "30 mins daily", how_to_start: "Send personalized outreach script to 10 past clients or warm contacts", what_to_measure: "Response rate and consultations booked" },
          { channel: "Google Search Ads (Intent PPC)", why_it_fits: "Captures active problem searches with high commercial purchase intent", cost_category: "PAID", difficulty: "Intermediate", expected_workload: "2 hours setup, 30 mins weekly", how_to_start: "Target high-intent phrase keywords and add negative keywords", what_to_measure: "Cost per qualified lead (CPL)", source_or_link: "https://support.google.com/google-ads/" },
          { channel: "Meta / Instagram Ads (Visual Showcase)", why_it_fits: "Visual storytelling and before/after proof in local social feeds", cost_category: "PAID", difficulty: "Intermediate", expected_workload: "1-2 hours per campaign", how_to_start: "Run 3-second hook Reel with WhatsApp chat button", what_to_measure: "Cost per message started", source_or_link: "https://www.facebook.com/business/ads" }
        ],
        free_organic_channels: parsed.customer_acquisition?.free_organic_channels || [
          { channel: "Google Business Profile & Local Maps", how_to_execute: "Optimize category and post weekly updates with photos", target_reach: "High-intent local searches" },
          { channel: "Direct WhatsApp / Message Outreach", how_to_execute: "Send ready script to 15 warm contacts daily", target_reach: "Immediate prospective buyers" }
        ],
        low_cost_channels: parsed.customer_acquisition?.low_cost_channels || [
          { channel: "Referral Program with Existing Clients", how_to_execute: "Offer reciprocal discount or bonus for introductions", target_reach: "Warm introductions" }
        ],
        paid_channels: parsed.customer_acquisition?.paid_channels || [
          { channel: "Local Search Ads (Google) or Meta Lead Ads", how_to_execute: "Target specific city radius with $5/day budget", budget_needed: "$5 - $10/day" }
        ],
        hundred_prospects_plan: prospectWorkflow
      },
      sales_strategy: parsed.sales_strategy || {
        sales_pitch: "We help you solve [Problem] with fast turnaround and clear pricing, so you get real results without stress.",
        phone_script: "Hi [Name], thank you for calling. To make sure we give you the exact best option, can I ask 2 quick questions about what you need?",
        whatsapp_sales_script: parsed.ready_materials?.main_script || "Hi [Name], thank you for reaching out! We can certainly help with that. Are you looking to start this week?",
        email_sales_script: parsed.ready_materials?.extra_material || "Hi [Name], following up regarding your inquiry. Here are our exact packages...",
        objection_handling: [
          { objection: "Price is too high / Expensive", response: "I completely understand budget is key. Our clients find this pays for itself because [Clear ROI]. Would our smaller starter package fit your timeline?" },
          { objection: "I need to think about it", response: "Understood! What specific detail can I clarify for you so you have everything you need to decide?" },
          { objection: "Competitor is cheaper", response: "Competitors may charge less, but our package includes [Key Benefit/Verified Standard] so you never have to pay twice to fix mistakes." }
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
      ads_strategy: {
        recommended_platform: parsed.ads_strategy?.recommended_platform || "Google Search Ads",
        campaign_objective: parsed.ads_strategy?.campaign_objective || "Lead Generation / Inquiries",
        campaign_structure: parsed.ads_strategy?.campaign_structure || {
          campaign_name: "Search - High Intent Local Leads",
          ad_groups: [
            {
              name: "Core Inquiries",
              keyword_themes: ["service near me", "professional services quote", "top rated service in city"],
              negative_keywords: ["free", "cheap", "diy", "jobs", "salary"],
              headlines: ["Top Rated Local Service", "Fast & Reliable Quote", "Book Online Today"],
              descriptions: ["Professional solutions delivered on time with verified quality standards. Contact us today.", "Trusted by local customers. Get your free estimate now."],
              cta: "Get Free Quote"
            }
          ]
        },
        target_audience: parsed.ads_strategy?.target_audience || {
          demographics: "Target Age 25-54",
          location: targetLocation,
          interests_or_keywords: ["High intent search keywords"],
          negative_keywords: ["free", "cheap", "diy", "jobs"]
        },
        budget_plan: parsed.ads_strategy?.budget_plan || { daily_budget: "$5 - $10 / day", bidding_strategy: "Maximize Conversions" },
        budget_scenarios: parsed.ads_strategy?.budget_scenarios || {
          low_budget_test: { daily_budget: "$3 - $5 / day", test_duration: "7 days", purpose: "Validate keyword click-through rate and search term search query intent" },
          standard_test: { daily_budget: "$10 - $15 / day", test_duration: "14 days", purpose: "Generate steady inbound WhatsApp inquiries and calculate baseline cost per lead" },
          higher_test: { daily_budget: "$25 - $40 / day", test_duration: "30 days", purpose: "Scale winning ad groups and capture maximum search impression share in target city" }
        },
        ad_copy: parsed.ads_strategy?.ad_copy || {
          headlines: [parsed.ready_materials?.headline_or_offer?.slice(0, 30) || "Top Rated Business Service", "Fast & Reliable Quote", "Book Online Today"],
          descriptions: ["Professional solutions delivered on time with verified quality standards. Contact us today.", "Trusted by hundreds of local customers. Get your free estimate now."],
          cta: parsed.ready_materials?.cta || "Get Free Quote"
        },
        landing_page_advice: parsed.ads_strategy?.landing_page_advice || "Keep the page focused on one action with WhatsApp button and customer reviews.",
        creative_direction: parsed.ads_strategy?.creative_direction || {
          image_brief: "Clean photo showing finished work or customer smile with natural lighting.",
          video_script: {
            hook: "Struggling with [Problem]?",
            body: "Here is how our service solves it in 3 easy steps.",
            cta: "Click below to get started."
          }
        },
        tracking_guidance: parsed.ads_strategy?.tracking_guidance || "Track button clicks on WhatsApp and form submissions.",
        safeguards_notice: "Campaign review and authorization required. The system will never launch or spend money automatically without explicit user approval and authorized account integration."
      },
      meta_ads_strategy: parsed.meta_ads_strategy || {
        campaign_objective: "Lead Generation / WhatsApp Messages",
        audience: `Age 25-55, high-intent interest in ${targetIndustry} in ${targetLocation}`,
        location: targetLocation,
        creative_concept: "Before and after transformation demonstrating turnkey execution",
        primary_text: `Looking for top-quality ${targetService} in ${targetLocation}? See our latest completed project delivered on schedule with clear pricing.`,
        headline: `Transform Your Experience in ${targetLocation}`,
        cta: "Send WhatsApp Message",
        image_brief: "Natural light showcase of completed project with customer testimonial overlay.",
        video_reel_script: {
          hook: `Before you choose a ${targetService} in ${targetLocation}, avoid this 1 mistake...`,
          body: `Most clients experience budget overruns with hidden contractor markups. We provide upfront fixed-price quotations with guaranteed completion milestones.`,
          cta: `Tap Send Message to receive our portfolio & quotation breakdown on WhatsApp.`
        },
        landing_page: "Direct WhatsApp click-to-chat with pre-filled inquiry text",
        tracking_events: ["Contact", "Lead"],
        budget_test: {
          low_budget_test: "$5/day for 5 days to test creative hook and initial CTR",
          standard_test: "$12/day for 14 days to stabilize cost per qualified inquiry"
        }
      },
      organic_local_strategy: {
        gbp_plan: {
          category_suggestions: parsed.organic_local_strategy?.gbp_plan?.category_suggestions || ["Primary Category", "Secondary Category"],
          description: parsed.organic_local_strategy?.gbp_plan?.description || "Trusted local service providing high quality solutions.",
          attributes_checklist: parsed.organic_local_strategy?.gbp_plan?.attributes_checklist || ["Identifies as locally owned", "Online estimates available", "On-site services available"],
          photo_checklist: parsed.organic_local_strategy?.gbp_plan?.photo_checklist || ["Storefront / Office", "Team photo", "Product close-up", "Customer handover"],
          weekly_post_ideas: parsed.organic_local_strategy?.gbp_plan?.weekly_post_ideas || ["Weekly Tip for clients", "Special seasonal package announcement"],
          authentic_review_rules: [
            "Request authentic reviews directly after delivering high satisfaction",
            "Never offer incentives, cash, or discounts for reviews (strictly against Google Policy)",
            "Reply sincerely to 100% of reviews within 24 hours to reinforce trust"
          ],
          review_request_template: parsed.organic_local_strategy?.gbp_plan?.review_request_template || "Hi [Name], thank you for choosing us! Could you take 30 seconds to write an honest review? Here is the link: [Link]",
          review_response_templates: parsed.organic_local_strategy?.gbp_plan?.review_response_templates || {
            positive: "Thank you so much [Name]! We love working with you.",
            critical: "Thank you for the feedback [Name]. Please call us directly so we can resolve this right away."
          }
        },
        referral_system: parsed.organic_local_strategy?.referral_system || {
          offer: "Refer a friend and get 10% discount on your next order.",
          request_script: "Hi [Name], if you have a colleague or friend who needs [Service], please connect us!",
          incentive_model: "Two-way discount"
        },
        content_calendar: parsed.organic_local_strategy?.content_calendar || [
          { day: 1, format: "Reel", topic: "Behind the scenes", hook: "Watch how we create [Product]", caption: "Detailed caption with hashtags", cta: "Message us for pricing" },
          { day: 2, format: "Carousel", topic: "3 Common Mistakes", hook: "Don't make this mistake when buying [Product]", caption: "Swipe through to see tips", cta: "Save this post" }
        ]
      },
      official_sources: [
        {
          title: "Google Business Profile Official Help",
          url: "https://support.google.com/business/answer/3038177",
          category: "Local Search & Maps",
          guidance: "Official Google ranking factors: Relevance, Distance, and Prominence. Prohibits incentivized reviews."
        },
        {
          title: "Google Search Central — Essentials",
          url: "https://developers.google.com/search/docs/essentials",
          category: "SEO & Conversion",
          guidance: "Core ranking principles, crawlability, and helpful content guidelines."
        },
        {
          title: "Google Ads Advertising Policies",
          url: "https://support.google.com/google-ads/answer/61462",
          category: "Search Ads",
          guidance: "Search campaign Quality Score, ad relevance, and negative keyword optimization."
        },
        {
          title: "Meta Business Advertising Center",
          url: "https://www.facebook.com/business/ads",
          category: "Meta & Instagram Ads",
          guidance: "Targeting, Conversions API, and Instagram Reels ad formats."
        },
        {
          title: "International Trade Centre (ITC) Trade Map",
          url: "https://www.trademap.org/",
          category: "B2B & Export",
          guidance: "Global market import demands and tariff structures covering 220+ countries."
        }
      ],
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

    sendJsonResponse(res, 200, {
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

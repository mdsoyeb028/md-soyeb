import { generateAICompletion } from "./aiProvider";

export interface ChannelAcquisitionComparison {
  channel: string;
  whyUseIt: string;
  costCategory: "Free / Organic" | "Low-Cost" | "Paid Advertising";
  difficulty: "Beginner" | "Moderate" | "Advanced";
  setup: string;
  whatToDo: string;
  whatToMeasure: string;
}

export interface CustomerAcquisitionPlan {
  inquiry: string;
  interpretationNotice: string; // e.g. "Interpreted as: Find/build a plan to reach up to 100 relevant prospects. Sales and conversions are not guaranteed."
  channels: ChannelAcquisitionComparison[];
  immediateSteps: string[];
  suggestedTimeline: string;
  readyOutreachScript: string;
  disclaimer: string;
}

export interface AdsPlanResult {
  platform: "Google Ads" | "Meta Ads" | "Instagram Ads" | "YouTube Ads";
  campaignObjective: string;
  targetAudience: string;
  location: string;
  offer: string;
  adHeadline: string;
  adCopy: string;
  cta: string;
  creativeIdea: string;
  landingPageRequirements: string;
  trackingRequirements: string;
  testPlan: string;
  budgetCategories: {
    minimumTestingBudget: string;
    recommendedDailyBudget: string;
    expectedCostMetric: string;
  };
  approvalSafeguardNotice: string;
  disclaimer: string;
}

export interface FixProblemActionPlan {
  problemTitle: string;
  observedMetric: string;
  steps: Array<{
    stepNumber: number;
    title: string;
    exactAction: string;
    howToDoIt: string;
    toolsNeeded: string;
    freeOption: string;
    lowCostOption: string;
    timeDifficulty: string;
    metricToMonitor: string;
    relevantOfficialSource: {
      name: string;
      url: string;
    };
  }>;
  readyMaterial: {
    type: string;
    title: string;
    content: string;
    whereToPaste: string;
  };
}

/**
 * Generates an honest Customer Acquisition Plan (strictly no fake guarantees)
 */
export async function generateCustomerAcquisitionPlan(
  userQuery: string,
  businessContext?: string,
  language = "English"
): Promise<CustomerAcquisitionPlan> {
  const prompt = `You are a realistic commercial business growth strategist.
User inquiry: "${userQuery}"
Business Context: ${businessContext || "General B2B / Local Service / Export business"}
Language: ${language}

INTEGRITY RULES:
- Never guarantee customers, leads, or revenue.
- If the user asks for "100 customers", interpret it strictly as: "Find and build a structured plan to reach up to 100 relevant commercial prospects."
- Compare relevant acquisition channels honestly across: Google Search, Google Business Profile, SEO, YouTube, Instagram, Facebook, LinkedIn, Email, WhatsApp, Referral, Partnerships, Local outreach, Industry directories, Paid ads.

Respond with STRICT JSON only:
{
  "inquiry": "${userQuery}",
  "interpretationNotice": "Interpreted as: Find/build a plan to reach up to 100 relevant prospects. Conversions depend on market demand, competitive pricing, and sales follow-up; sales cannot be guaranteed.",
  "channels": [
    {
      "channel": "Channel Name (e.g. Google Business Profile)",
      "whyUseIt": "Why this channel is suitable for this business",
      "costCategory": "Free / Organic", // "Free / Organic" | "Low-Cost" | "Paid Advertising"
      "difficulty": "Beginner", // "Beginner" | "Moderate" | "Advanced"
      "setup": "What needs to be set up first",
      "whatToDo": "Concrete daily/weekly action",
      "whatToMeasure": "Specific metric to monitor (e.g. Search calls, directions, clicks)"
    }
  ],
  "immediateSteps": ["Step 1", "Step 2", "Step 3"],
  "suggestedTimeline": "2-4 weeks implementation roadmap",
  "readyOutreachScript": "Ready-to-copy WhatsApp or email message to reach first prospects",
  "disclaimer": "This plan provides customer acquisition methodology based on official marketing best practices. No outcome is guaranteed."
}`;

  const res = await generateAICompletion(prompt, { jsonMode: true });
  try {
    return JSON.parse(res.text) as CustomerAcquisitionPlan;
  } catch {
    return {
      inquiry: userQuery,
      interpretationNotice: "Interpreted as: Plan to reach up to 100 relevant prospects.",
      channels: [
        {
          channel: "Google Business Profile & Local Search",
          whyUseIt: "Captures buyers who are actively searching in your city right now.",
          costCategory: "Free / Organic",
          difficulty: "Beginner",
          setup: "Claim profile on business.google.com with verified address and phone number.",
          whatToDo: "Upload 10 photos of your work, list exact services, and collect 5 client reviews.",
          whatToMeasure: "Direct calls and website clicks in Performance report.",
        },
        {
          channel: "WhatsApp Business Outreach & Referrals",
          whyUseIt: "Direct connection with past contacts and warm referrals with highest open rates.",
          costCategory: "Free / Organic",
          difficulty: "Beginner",
          setup: "Set up WhatsApp Business profile with product catalog and quick replies.",
          whatToDo: "Reach out to 20 past contacts weekly with a helpful service update.",
          whatToMeasure: "Replies and scheduled consultation calls.",
        },
      ],
      immediateSteps: [
        "Define your single best-selling service and exact pricing range.",
        "List 20 potential customers or businesses in your target market.",
        "Send verified introductory message offering a free audit or quote.",
      ],
      suggestedTimeline: "14-day prospect engagement cycle",
      readyOutreachScript: "Hello [Name], we noticed your business is looking for [Service]. We help companies achieve [Result] without [Friction]. Would you be open to a quick 5-minute review?",
      disclaimer: "Real acquisition requires consistent follow-up and qualified market demand.",
    };
  }
}

/**
 * Generates an Ads Plan with strict user approval safeguard and budget discipline
 */
export async function generateAdsPlan(options: {
  platform: "Google Ads" | "Meta Ads" | "Instagram Ads" | "YouTube Ads";
  productService: string;
  targetLocation: string;
  monthlyBudget?: string;
  language?: string;
}): Promise<AdsPlanResult> {
  const { platform, productService, targetLocation, monthlyBudget, language = "English" } = options;

  const prompt = `You are a certified digital ads planner.
Create a production-ready Ads Plan for:
Platform: ${platform}
Product/Service: ${productService}
Location: ${targetLocation}
Budget: ${monthlyBudget || "Small testing budget"}
Language: ${language}

MANDATORY INTEGRITY RULES:
- Never promise ROI, sales, or cost per acquisition.
- Do not spend money or publish ads automatically.
- Explicitly state: "User approval and manual ad account confirmation required before any external campaign launch."
- Provide exact headline, ad copy, CTA, creative idea, landing page requirements, and test plan.

Respond with STRICT JSON only:
{
  "platform": "${platform}",
  "campaignObjective": "Recommended objective (e.g. Leads / Traffic / Sales)",
  "targetAudience": "Specific demographics, interests, and intent keywords",
  "location": "${targetLocation}",
  "offer": "Compelling value proposition for this ad",
  "adHeadline": "Ad headline (under 30 characters for Google, punchy hook for Meta)",
  "adCopy": "Full ad primary text",
  "cta": "Recommended CTA button (e.g. Learn More, Get Quote)",
  "creativeIdea": "Exact visual or video script recommendation",
  "landingPageRequirements": "What the landing page must display to convert ad clicks",
  "trackingRequirements": "Conversion pixel/tag setup needed (e.g. Meta Pixel Lead event or Google Ads Conversion tag)",
  "testPlan": "7-day testing protocol with budget allocation",
  "budgetCategories": {
    "minimumTestingBudget": "Estimated minimum testing budget",
    "recommendedDailyBudget": "Suggested daily spend limit",
    "expectedCostMetric": "Cost per Click (CPC) or Cost per 1,000 Impressions (CPM) benchmark to monitor"
  },
  "approvalSafeguardNotice": "CRITICAL: No ads will be launched automatically. You must manually copy this plan into your verified Ad Manager and review all targeting before spending any budget.",
  "disclaimer": "Ad performance varies by competition, seasonal demand, and landing page quality. Never spend unbudgeted capital."
}`;

  const res = await generateAICompletion(prompt, { jsonMode: true });
  try {
    return JSON.parse(res.text) as AdsPlanResult;
  } catch {
    return {
      platform,
      campaignObjective: "Lead Generation / Website Clicks",
      targetAudience: `Users in ${targetLocation} searching for or interested in ${productService}`,
      location: targetLocation,
      offer: `Quality ${productService} with verified customer support.`,
      adHeadline: `${productService.slice(0, 25)} in ${targetLocation.slice(0, 15)}`,
      adCopy: `Looking for reliable ${productService}? Get transparent pricing, proven experience, and direct support. Contact us today.`,
      cta: "Contact Us",
      creativeIdea: "High-contrast image showcasing the finished product or direct behind-the-scenes service delivery.",
      landingPageRequirements: "Fast-loading mobile page with visible WhatsApp button, clear pricing guide, and customer testimonials.",
      trackingRequirements: "Install Conversion tracking tag on the Thank You / confirmation page.",
      testPlan: "Run for 5-7 days at minimum daily budget to measure Click-Through Rate before scaling.",
      budgetCategories: {
        minimumTestingBudget: "$50 - $100 (or local currency equivalent)",
        recommendedDailyBudget: "$5 - $10/day",
        expectedCostMetric: "Monitor CPC (Cost per Click) and CTR (aim for >1.5%)",
      },
      approvalSafeguardNotice: "CRITICAL: No ads will be launched automatically. You must review and approve all settings in your official Ad account.",
      disclaimer: "Ad spend does not guarantee conversions. Always test with small budgets first.",
    };
  }
}

/**
 * Generates an end-to-end 7-step fix plan for any identified problem
 */
export async function generateProblemFixPlan(
  problemTitle: string,
  observedData: string,
  businessContext?: string,
  language = "English"
): Promise<FixProblemActionPlan> {
  const prompt = `You are a master diagnostic engineer.
Problem: "${problemTitle}"
Observed Data: "${observedData}"
Business Context: ${businessContext || "Commercial Business"}
Language: ${language}

Generate a comprehensive step-by-step action plan to solve this problem.
Include exact instructions, free tools, low-cost options, time difficulty, metric to monitor, and an official documentation source.
Also create a ready-to-copy piece of material (e.g. title tag, meta description, email, or script) that the user can immediately use.

Respond with STRICT JSON only:
{
  "problemTitle": "${problemTitle}",
  "observedMetric": "${observedData}",
  "steps": [
    {
      "stepNumber": 1,
      "title": "Clear step title",
      "exactAction": "What to do precisely",
      "howToDoIt": "Step by step procedure",
      "toolsNeeded": "Required software or platform",
      "freeOption": "How to do this for free",
      "lowCostOption": "Low-cost tool recommendation",
      "timeDifficulty": "e.g. 15 minutes • Easy",
      "metricToMonitor": "What metric will show improvement",
      "relevantOfficialSource": {
        "name": "Official Source (e.g. Google Search Central)",
        "url": "https://developers.google.com/search"
      }
    }
  ],
  "readyMaterial": {
    "type": "e.g. SEO Meta Title & Description / Email Template / WhatsApp Script",
    "title": "Title of ready material",
    "content": "Exact ready-to-copy content",
    "whereToPaste": "Where to paste or publish this content"
  }
}`;

  const res = await generateAICompletion(prompt, { jsonMode: true });
  try {
    return JSON.parse(res.text) as FixProblemActionPlan;
  } catch {
    return {
      problemTitle,
      observedMetric: observedData,
      steps: [
        {
          stepNumber: 1,
          title: "Identify Affected Pages or Assets",
          exactAction: "Audit the specific URL, title, or post causing the performance bottleneck.",
          howToDoIt: "Open Search Console or Analytics and sort by lowest CTR or highest drop-off.",
          toolsNeeded: "Google Search Console or Browser DevTools",
          freeOption: "Search Console Performance tab (100% Free)",
          lowCostOption: "Screaming Frog SEO Spider (Free up to 500 URLs)",
          timeDifficulty: "10 mins • Easy",
          metricToMonitor: "Total impressions and clicks",
          relevantOfficialSource: {
            name: "Google Search Central: Search Console Overview",
            url: "https://developers.google.com/search/docs/monitor/search-console",
          },
        },
        {
          stepNumber: 2,
          title: "Implement the Solution",
          exactAction: "Update the title, meta tags, or call-to-action according to user search intent.",
          howToDoIt: "Edit your CMS or HTML <head> section to replace the old text with the ready material below.",
          toolsNeeded: "Website CMS (WordPress, Shopify, Next.js, or HTML editor)",
          freeOption: "Direct CMS editor (Free)",
          lowCostOption: "Yoast SEO or RankMath",
          timeDifficulty: "15 mins • Easy",
          metricToMonitor: "Click-Through Rate (CTR)",
          relevantOfficialSource: {
            name: "Google Search Central: Title Links Guidance",
            url: "https://developers.google.com/search/docs/appearance/title-link",
          },
        },
        {
          stepNumber: 3,
          title: "Verify and Monitor",
          exactAction: "Request re-indexing or re-crawl in Google Search Console.",
          howToDoIt: "Paste the updated URL in Search Console URL Inspection and click 'Request Indexing'.",
          toolsNeeded: "Google Search Console",
          freeOption: "URL Inspection Tool (Free)",
          lowCostOption: "N/A",
          timeDifficulty: "5 mins • Easy",
          metricToMonitor: "Updated CTR over next 14 days",
          relevantOfficialSource: {
            name: "Google Search Central: Ask Google to Recrawl",
            url: "https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl",
          },
        },
      ],
      readyMaterial: {
        type: "Optimized Search Title & Meta Description",
        title: "High-CTR Snippet Template",
        content: `Title: [Your Core Service] in [Location] — Get Fast Quotes & Verified Support\nMeta Description: Looking for reliable [Your Service]? We provide certified solutions, clear pricing, and 24/7 client support. Call or message today for a free consultation.`,
        whereToPaste: "In your page <title> and <meta name='description'> tags.",
      },
    };
  }
}

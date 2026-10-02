import {
  generateAICompletion,
  normalizeServerErrorMessage,
  safeParseJson,
} from "../aiProvider.ts";
import { parseRequestBody, sendJsonResponse } from "../serverlessHttp.ts";

export default async function handler(req: any, res: any) {
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
      platform = "Instagram", 
      businessType, 
      productOrService, 
      targetAudience, 
      goal, 
      language = "English" 
    } = body || {};

    const prompt = `You are an expert commercial social media strategist.
Create a high-performing 7-day social media plan for:
Platform: ${platform}
Business: ${businessType || "Commercial Enterprise"}
Product/Service: ${productOrService || "General Offerings"}
Target Audience: ${targetAudience || "High-Intent Buyers"}
Primary Goal: ${goal || "Inbound inquiries and customer acquisition"}
Language: ${language}

Return valid JSON with:
{
  "platformStrategy": "Key strategic positioning for this platform",
  "contentPillars": ["Pillar 1", "Pillar 2", "Pillar 3"],
  "weeklyPlan": [
    {
      "day": 1,
      "format": "Reel / Carousel / Post",
      "hook": "Compelling 3-second hook",
      "caption": "Complete ready-to-copy caption with hashtags",
      "cta": "Exact call to action"
    }
  ],
  "leadGenTips": ["Tip 1", "Tip 2"]
}`;

    const { text } = await generateAICompletion(prompt, { jsonMode: true });
    const parsed = safeParseJson<any>(text);

    sendJsonResponse(res, 200, {
      success: true,
      strategy: parsed,
    });
  } catch (err: unknown) {
    sendJsonResponse(res, 500, {
      success: false,
      error: normalizeServerErrorMessage(err),
    });
  }
}

import { performRealSeoAudit } from "../seoCrawler.ts";
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
    const { url, language = "English" } = body || {};

    if (!url || typeof url !== "string" || !url.trim()) {
      sendJsonResponse(res, 400, {
        success: false,
        error: "URL is required and must not be empty.",
      });
      return;
    }

    const audit = await performRealSeoAudit(url.trim());

    const prompt = `Analyze this real website crawl data and provide actionable SEO recommendations.
Website: ${audit.normalizedUrl}
Title: "${audit.detectedData.title || ""}"
Meta Description: "${audit.detectedData.metaDescription || ""}"
H1: ${audit.detectedData.h1Samples.join(", ")}
H2: ${audit.detectedData.h2Samples.join(", ")}
Score: ${audit.score}/100

Target Language: ${language}

Return valid JSON with:
{
  "summary": "Short 2-line summary of SEO standing",
  "priorityFixes": ["Fix 1", "Fix 2", "Fix 3"],
  "metaOptimizations": {
    "recommendedTitle": "Optimized Title (under 60 chars)",
    "recommendedDescription": "Optimized Description (150-160 chars)"
  },
  "contentStrategy": ["Idea 1", "Idea 2"],
  "technicalNotes": "Short technical assessment"
}`;

    const { text } = await generateAICompletion(prompt, { jsonMode: true });
    const parsedAI = safeParseJson<any>(text);

    sendJsonResponse(res, 200, {
      success: true,
      audit,
      recommendations: parsedAI,
    });
  } catch (err: unknown) {
    sendJsonResponse(res, 500, {
      success: false,
      error: normalizeServerErrorMessage(err),
    });
  }
}

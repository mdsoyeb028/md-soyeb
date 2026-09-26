import { performRealSeoAudit } from "../_lib/seoCrawler.ts";
import {
  generateAICompletion,
  normalizeServerErrorMessage,
  safeParseJson,
} from "../_lib/aiProvider.ts";
import { parseRequestBody, sendJsonResponse } from "../_lib/serverlessHttp.ts";

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
    const { url, keyword, language, languageName } = body || {};

    if (!url || typeof url !== "string" || !url.trim()) {
      sendJsonResponse(res, 400, {
        success: false,
        error: "A valid website URL is required (e.g., https://example.com).",
      });
      return;
    }

    if (url.length > 500) {
      sendJsonResponse(res, 400, {
        success: false,
        error: "URL length exceeds 500 characters.",
      });
      return;
    }

    const selectedLanguage = languageName || language || "English";

    // Perform live webpage audit with SSRF protection (NEVER replaced by AI)
    const auditResult = await performRealSeoAudit(url, keyword);
    let aiProvider: "gemini" | "groq" | "openrouter" | "none" = "none";

    // Enrich with tailored AI semantic recommendations using provider fallback
    const enrichmentPrompt = `You are a technical SEO expert. Here is real crawled data from the website "${auditResult.normalizedUrl}":
Target keyword: "${keyword || "General"}"
Detected Page Title: "${auditResult.detectedData.title}" (${auditResult.detectedData.titleLength} chars)
Detected Meta Description: "${auditResult.detectedData.metaDescription}" (${auditResult.detectedData.descriptionLength} chars)
Detected H1: "${auditResult.detectedData.h1Samples.join(" | ")}"
Detected H2s: "${auditResult.detectedData.h2Samples.join(" | ")}"
Mathematical SEO Health Score: ${auditResult.score}/100
Target Output Language: "${selectedLanguage}"

CRITICAL INSTRUCTION:
Provide recommendations (improved description and additional insight) in "${selectedLanguage}". Preserve technical keywords, brand names, and URLs.

Generate optimized meta title and meta description recommendations for this exact page. Return strictly JSON:
{
  "improvedTitle": "string between 45 and 60 chars",
  "improvedDescription": "string between 120 and 155 chars with call to action in ${selectedLanguage}",
  "additionalInsight": "string summarizing one high-impact technical or on-page win in ${selectedLanguage}"
}`;

    try {
      const { text, provider } = await generateAICompletion(enrichmentPrompt, {
        jsonMode: true,
        timeoutMs: 12000,
      });
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

    sendJsonResponse(res, 200, {
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
    sendJsonResponse(res, status, {
      success: false,
      error: message,
      code: "AI_PROVIDER_ERROR",
    });
  }
}

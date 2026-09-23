import type { Request, Response } from "express";
import { performRealSeoAudit } from "../../src/server/seoCrawler";
import { GoogleGenAI } from "@google/genai";

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: { "User-Agent": "aistudio-build" },
    },
  });
};

const CANDIDATE_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-3.8-flash",
  "gemini-flash-latest",
];

export default async function handler(req: Request, res: Response) {
  // Always enforce application/json
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed. Please use POST.`,
    });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const { url, keyword } = body;

    if (!url || typeof url !== "string" || !url.trim()) {
      return res.status(400).json({
        success: false,
        error: "A valid website URL is required (e.g., https://example.com).",
      });
    }

    if (url.length > 500) {
      return res.status(400).json({
        success: false,
        error: "URL length exceeds 500 characters.",
      });
    }

    // Perform live webpage audit with SSRF protection
    const auditResult = await performRealSeoAudit(url, keyword);

    // If Gemini is available, enrich with meta recommendations
    const ai = getGeminiClient();
    if (ai) {
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

        for (const model of CANDIDATE_MODELS) {
          try {
            const resp = await ai.models.generateContent({
              model,
              contents: enrichmentPrompt,
              config: { responseMimeType: "application/json" },
            });
            if (resp && resp.text) {
              const parsed = JSON.parse(resp.text);
              if (parsed.improvedTitle) auditResult.metaTitle = parsed.improvedTitle;
              if (parsed.improvedDescription) auditResult.metaDescription = parsed.improvedDescription;
              if (parsed.additionalInsight) {
                auditResult.suggestions.unshift({
                  priority: "High",
                  title: "AI Semantic Recommendation",
                  action: parsed.additionalInsight,
                });
              }
              break;
            }
          } catch {
            continue;
          }
        }
      } catch {
        // Non-fatal enrichment fallback
      }
    }

    return res.status(200).json({
      success: true,
      audit: auditResult,
      ...auditResult,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "SEO audit could not be completed.";
    console.error("Vercel Serverless SEO Audit Error:", message);
    const status = message.includes("SSRF") || message.includes("Invalid URL") || message.includes("empty") ? 400 : 502;
    return res.status(status).json({
      success: false,
      error: message,
    });
  }
}

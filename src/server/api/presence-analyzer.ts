import type { Request, Response } from "express";
import { performMultiLinkPresenceAnalysis } from "../presenceAnalyzer.ts";
import { normalizeServerErrorMessage } from "../aiProvider.ts";

export default async function handler(req: Request, res: Response) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  res.setHeader("Content-Type", "application/json; charset=utf-8");

  try {
    const { links, language, languageName, businessContext } = req.body || {};

    if (!Array.isArray(links) || links.length === 0) {
      return res.status(400).json({
        success: false,
        error: "At least one public business link is required.",
      });
    }

    const validLinks = links
      .filter((item: any) => item && typeof item.url === "string" && item.url.trim().length > 0)
      .slice(0, 10);

    if (validLinks.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No valid URLs provided in request.",
      });
    }

    const result = await performMultiLinkPresenceAnalysis(validLinks, {
      language: typeof language === "string" ? language : undefined,
      languageName: typeof languageName === "string" ? languageName : undefined,
      businessContext: typeof businessContext === "string" ? businessContext : undefined,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    console.error("Serverless Presence Analyzer error:", err);
    return res.status(500).json({
      success: false,
      error: normalizeServerErrorMessage(err, "Unable to analyze presence links."),
    });
  }
}

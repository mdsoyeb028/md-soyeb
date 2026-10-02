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
      product, 
      sourceCountry, 
      targetCountry, 
      complianceCheck = true, 
      language = "English" 
    } = body || {};

    const prompt = `You are an International Trade and Global Export Strategy Consultant.
Provide a realistic, practical cross-border export market readiness briefing:
Product: ${product || "Manufactured Goods"}
Source Origin: ${sourceCountry || "Domestic"}
Target Market: ${targetCountry || "International"}
Language: ${language}

Return valid JSON with:
{
  "marketDemandSummary": "Analysis of real demand signals and competitive landscape",
  "recommendedEntryStrategy": "Direct B2B distribution, marketplace, or importer partnerships",
  "keyRegulatoryChecklist": [
    "Requirement 1 (HS Codes, Certificates of Origin, Quality standards)",
    "Requirement 2 (Packaging & Labeling)",
    "Requirement 3 (Tariffs & Duties considerations)"
  ],
  "buyerOutreachScript": "Cold international buyer inquiry email script",
  "logisticsTips": ["Tip 1", "Tip 2"]
}`;

    const { text } = await generateAICompletion(prompt, { jsonMode: true });
    const parsed = safeParseJson<any>(text);

    sendJsonResponse(res, 200, {
      success: true,
      exportStrategy: parsed,
    });
  } catch (err: unknown) {
    sendJsonResponse(res, 500, {
      success: false,
      error: normalizeServerErrorMessage(err),
    });
  }
}

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
      businessName, 
      industry, 
      challenge, 
      goals, 
      language = "English" 
    } = body || {};

    const prompt = `You are a practical Business Growth Consultant.
Diagnose this specific business challenge:
Business Name: ${businessName || "Enterprise"}
Industry: ${industry || "General"}
Reported Bottleneck / Challenge: "${challenge || "Need more qualified customers"}"
Goals: "${goals || "Predictable revenue scaling"}"
Language: ${language}

Return valid JSON with:
{
  "coreDiagnosis": "Clear 2-sentence breakdown of what is bottlenecking growth",
  "immediateFix": "What to do within 24 hours",
  "sevenDayActionItems": [
    { "day": 1, "action": "Task for Day 1" },
    { "day": 2, "action": "Task for Day 2" },
    { "day": 3, "action": "Task for Day 3" },
    { "day": 4, "action": "Task for Day 4" },
    { "day": 5, "action": "Task for Day 5" },
    { "day": 6, "action": "Task for Day 6" },
    { "day": 7, "action": "Task for Day 7" }
  ],
  "copyableOutreachScript": "Direct client acquisition message"
}`;

    const { text } = await generateAICompletion(prompt, { jsonMode: true });
    const parsed = safeParseJson<any>(text);

    sendJsonResponse(res, 200, {
      success: true,
      diagnosis: parsed,
    });
  } catch (err: unknown) {
    sendJsonResponse(res, 500, {
      success: false,
      error: normalizeServerErrorMessage(err),
    });
  }
}

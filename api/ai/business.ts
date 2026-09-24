import {
  generateAICompletion,
  AIProviderError,
  normalizeServerErrorMessage,
  getProviderSourceName,
} from "../../src/server/aiProvider";
import { parseRequestBody, sendJsonResponse } from "../../src/server/serverlessHttp";

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
    const { toolType, inputData } = body || {};

    if (!toolType || typeof toolType !== "string") {
      sendJsonResponse(res, 400, {
        success: false,
        error: "toolType is required.",
      });
      return;
    }

    const prompt = `You are a senior commercial strategist and business growth advisor.
Tool Requested: ${toolType}
Input Data: ${JSON.stringify(inputData || {})}

Provide a structured, highly actionable business deliverable in clear markdown format.
Be rigorous, realistic, and commercially sound. Do not invent fake statistics or guaranteed financial outcomes.`;

    const { text, provider } = await generateAICompletion(prompt);
    const sourceName = getProviderSourceName(provider);

    sendJsonResponse(res, 200, {
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

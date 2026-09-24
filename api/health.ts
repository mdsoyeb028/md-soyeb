import { sendJsonResponse } from "../src/server/serverlessHttp";

export default function handler(req: any, res: any) {
  sendJsonResponse(res, 200, {
    status: "ok",
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    hasGroqKey: Boolean(process.env.GROQ_API_KEY),
    hasOpenRouterKey: Boolean(process.env.OPENROUTER_API_KEY),
    timestamp: new Date().toISOString(),
  });
}

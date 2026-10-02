import { sendJsonResponse } from "../serverlessHttp.ts";

export default function handler(req: any, res: any) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (typeof res.status === "function") res.status(204).end();
    else {
      res.statusCode = 204;
      res.end();
    }
    return;
  }

  sendJsonResponse(res, 200, {
    status: "ok",
    service: "Business Growth & AI Business Agent API",
    endpoints: [
      "/api/ai/agent-create",
      "/api/ai/agent-chat",
      "/api/ai/agent-voice",
      "/api/ai/agent-url-analyze",
      "/api/ai/agent-report-generate",
      "/api/ai/agent-action-execute",
      "/api/ai/agent-document-parse",
      "/api/ai/agent-tool",
      "/api/ai/assistant",
      "/api/ai/seo",
      "/api/ai/social",
      "/api/ai/export",
      "/api/ai/business",
      "/api/ai/presence-analyzer",
      "/api/health",
      "/api/plans",
    ],
    timestamp: new Date().toISOString(),
  });
}

import { sendJsonResponse } from "./_lib/serverlessHttp.ts";

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
    service: "Business Growth & Export Hub API",
    endpoints: [
      "/api/ai/assistant",
      "/api/ai/seo",
      "/api/ai/social",
      "/api/ai/export",
      "/api/ai/business",
      "/api/health",
    ],
    timestamp: new Date().toISOString(),
  });
}

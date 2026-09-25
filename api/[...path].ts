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

  sendJsonResponse(res, 404, {
    success: false,
    error: `API route ${req.method} ${req.url || ""} not found.`,
    code: "SERVERLESS_ERROR",
  });
}

import { sendJsonResponse } from "./_lib/serverlessHttp.ts";
import agentCreateHandler from "./ai/agent-create.ts";
import agentChatHandler from "./ai/agent-chat.ts";
import agentVoiceHandler from "./ai/agent-voice.ts";
import agentUrlAnalyzeHandler from "./ai/agent-url-analyze.ts";
import agentReportGenerateHandler from "./ai/agent-report-generate.ts";
import agentActionExecuteHandler from "./ai/agent-action-execute.ts";
import agentDocumentParseHandler from "./ai/agent-document-parse.ts";
import agentToolHandler from "./ai/agent-tool.ts";
import seoHandler from "./ai/seo.ts";
import socialHandler from "./ai/social.ts";
import exportHandler from "./ai/export.ts";
import businessHandler from "./ai/business.ts";
import assistantHandler from "./ai/assistant.ts";
import healthHandler from "./health.ts";
import plansHandler from "./plans.ts";
import indexHandler from "./index.ts";

function extractCleanPath(req: any): string {
  // Check req.query.path if Vercel populated catch-all query parameter
  if (req.query?.path) {
    if (Array.isArray(req.query.path)) {
      return "/" + req.query.path.join("/");
    }
    if (typeof req.query.path === "string") {
      const p = req.query.path.startsWith("/") ? req.query.path : "/" + req.query.path;
      return p;
    }
  }

  // Parse path from req.url
  const rawUrl = req.url || "/";
  let pathname = rawUrl.split("?")[0] || "/";

  // Strip leading /api if present
  if (pathname.startsWith("/api/")) {
    pathname = pathname.substring(4);
  } else if (pathname === "/api") {
    pathname = "/";
  }

  return pathname.startsWith("/") ? pathname : "/" + pathname;
}

export default async function handler(req: any, res: any) {
  // Global CORS Handling
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

  const cleanPath = extractCleanPath(req);

  try {
    switch (cleanPath) {
      // AI Business Agent Endpoints
      case "/ai/agent-create":
        return await agentCreateHandler(req, res);

      case "/ai/agent-chat":
        return await agentChatHandler(req, res);

      case "/ai/agent-voice":
        return await agentVoiceHandler(req, res);

      case "/ai/agent-url-analyze":
        return await agentUrlAnalyzeHandler(req, res);

      case "/ai/agent-report-generate":
        return await agentReportGenerateHandler(req, res);

      case "/ai/agent-action-execute":
        return await agentActionExecuteHandler(req, res);

      case "/ai/agent-document-parse":
        return await agentDocumentParseHandler(req, res);

      case "/ai/agent-tool":
        return await agentToolHandler(req, res);

      // Core Strategic Tools Endpoints
      case "/ai/seo":
        return await seoHandler(req, res);

      case "/ai/social":
        return await socialHandler(req, res);

      case "/ai/export":
        return await exportHandler(req, res);

      case "/ai/business":
        return await businessHandler(req, res);

      case "/ai/assistant":
        return await assistantHandler(req, res);

      // System & Pricing Endpoints
      case "/health":
        return await healthHandler(req, res);

      case "/plans":
      case "/plans/config":
        return await plansHandler(req, res);

      case "/":
        return await indexHandler(req, res);

      default:
        sendJsonResponse(res, 404, {
          success: false,
          error: "not_found",
          message: `API route ${req.method} ${cleanPath} not found.`,
          code: "SERVERLESS_ROUTE_NOT_FOUND",
        });
        return;
    }
  } catch (err: unknown) {
    sendJsonResponse(res, 500, {
      success: false,
      error: "serverless_internal_error",
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

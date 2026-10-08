import { sendJsonResponse } from "../src/server/serverlessHttp.ts";
import agentCreateHandler from "../src/server/api/agent-create.ts";
import agentChatHandler from "../src/server/api/agent-chat.ts";
import agentVoiceHandler from "../src/server/api/agent-voice.ts";
import agentUrlAnalyzeHandler from "../src/server/api/agent-url-analyze.ts";
import agentReportGenerateHandler from "../src/server/api/agent-report-generate.ts";
import agentActionExecuteHandler from "../src/server/api/agent-action-execute.ts";
import agentDocumentParseHandler from "../src/server/api/agent-document-parse.ts";
import agentToolHandler from "../src/server/api/agent-tool.ts";
import seoHandler from "../src/server/api/seo.ts";
import socialHandler from "../src/server/api/social.ts";
import exportHandler from "../src/server/api/export.ts";
import businessHandler from "../src/server/api/business.ts";
import assistantHandler from "../src/server/api/assistant.ts";
import presenceAnalyzerHandler from "../src/server/api/presence-analyzer.ts";
import healthHandler from "../src/server/api/health.ts";
import plansHandler from "../src/server/api/plans.ts";
import indexHandler from "../src/server/api/index.ts";
import customerAgentChatHandler from "../src/server/api/customer-agent-chat.ts";
import customerAgentVoiceHandler from "../src/server/api/customer-agent-voice.ts";
import customerAgentLeadHandler from "../src/server/api/customer-agent-lead.ts";
import customerAgentAppointmentHandler from "../src/server/api/customer-agent-appointment.ts";
import paymentsCreateOrderHandler from "../src/server/api/payments-create-order.ts";
import paymentsVerifyHandler from "../src/server/api/payments-verify.ts";
import paymentsWebhookHandler from "../src/server/api/payments-webhook.ts";
import emailTestHandler from "../src/server/api/email-test.ts";

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

      // AI Customer Agent Endpoints
      case "/ai/customer-agent-chat":
        return await customerAgentChatHandler(req, res);

      case "/ai/customer-agent-voice":
        return await customerAgentVoiceHandler(req, res);

      case "/ai/customer-agent-lead":
        return await customerAgentLeadHandler(req, res);

      case "/ai/customer-agent-appointment":
        return await customerAgentAppointmentHandler(req, res);

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

      case "/ai/presence-analyzer":
        return await presenceAnalyzerHandler(req, res);

      // System & Pricing Endpoints
      case "/health":
        return await healthHandler(req, res);

      case "/plans":
      case "/plans/config":
        return await plansHandler(req, res);

      // Razorpay Payment Endpoints
      case "/payments/create-order":
        return await paymentsCreateOrderHandler(req, res);

      case "/payments/verify":
        return await paymentsVerifyHandler(req, res);

      case "/payments/webhook":
        return await paymentsWebhookHandler(req, res);

      // Email Test Endpoints
      case "/email/test":
      case "/ai/email-test":
        return await emailTestHandler(req, res);

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

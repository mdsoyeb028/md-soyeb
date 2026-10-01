import { parseRequestBody, sendJsonResponse } from "../_lib/serverlessHttp.ts";
import { normalizeServerErrorMessage } from "../../src/server/aiProvider.ts";

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
    const { taskId, targetPlatform, content } = body || {};

    if (!taskId) {
      sendJsonResponse(res, 400, { success: false, error: "Task ID is required." });
      return;
    }

    const executedAt = new Date().toISOString();
    let externalExecutionLink: string | null = null;
    let dispatchStatus: "COMPLETED" | "FAILED" = "COMPLETED";
    let executionNote = "Approved by user and recorded.";

    const platformLower = (targetPlatform || "").toLowerCase();
    const contentEncoded = encodeURIComponent(content || "");

    if (platformLower.includes("whatsapp")) {
      externalExecutionLink = `https://api.whatsapp.com/send?text=${contentEncoded}`;
      executionNote = "WhatsApp intent link prepared. Tap to send in WhatsApp.";
    } else if (platformLower.includes("email")) {
      externalExecutionLink = `mailto:?subject=${encodeURIComponent("Business Proposal")}&body=${contentEncoded}`;
      executionNote = "Mailto draft prepared for email client.";
    } else {
      executionNote = "Prepared by AI — external execution is not connected. Deliverable copied to clipboard and saved in task history.";
    }

    sendJsonResponse(res, 200, {
      success: true,
      taskId,
      status: dispatchStatus,
      lifecycle: "COMPLETED",
      executedAt,
      externalExecutionLink,
      executionNote,
    });
  } catch (err: unknown) {
    sendJsonResponse(res, 500, { success: false, error: normalizeServerErrorMessage(err) });
  }
}

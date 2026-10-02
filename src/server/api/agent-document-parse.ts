import { parseRequestBody, sendJsonResponse } from "../serverlessHttp.ts";
import { parseBusinessDocument } from "../documentParser.ts";
import { normalizeServerErrorMessage } from "../aiProvider.ts";

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
    const { name, mimeType, base64Data, rawText } = body || {};

    if (!name || (!base64Data && !rawText)) {
      sendJsonResponse(res, 400, { success: false, error: "Document name and file data are required." });
      return;
    }

    const parsed = await parseBusinessDocument({
      name,
      mimeType: mimeType || "application/octet-stream",
      base64Data,
      rawText,
    });

    sendJsonResponse(res, 200, { success: true, document: parsed });
  } catch (err: unknown) {
    sendJsonResponse(res, 500, { success: false, error: normalizeServerErrorMessage(err) });
  }
}

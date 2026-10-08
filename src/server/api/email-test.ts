import { parseRequestBody, sendJsonResponse } from "../serverlessHttp.ts";
import { verifyAuthToken } from "../auth.ts";
import { sendEmail, isResendConfigured } from "../integrations/email.ts";
import { SendTestEmailSchema } from "../schemas.ts";
import { enforceEmailSendLimit } from "../planEnforcement.ts";

export default async function handler(req: any, res: any) {
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

  if (req.method === "GET") {
    const configured = isResendConfigured();
    const fromEmail = configured ? (process.env.RESEND_FROM_EMAIL || "").trim() : null;
    sendJsonResponse(res, 200, {
      success: true,
      isConfigured: configured,
      status: configured ? "Connected" : "Not configured",
      fromEmail,
    });
    return;
  }

  if (req.method !== "POST") {
    sendJsonResponse(res, 405, { success: false, error: `Method ${req.method} Not Allowed. Expected GET or POST.` });
    return;
  }

  try {
    const authUser = await verifyAuthToken(req);
    if (!authUser.uid || authUser.isGuest) {
      sendJsonResponse(res, 401, {
        success: false,
        error: "Authentication required to send a test email. Please sign in first.",
      });
      return;
    }

    const rawBody = await parseRequestBody(req);
    const parsed = SendTestEmailSchema.safeParse(rawBody);
    const targetEmail = (parsed.success && parsed.data?.targetEmail) ? parsed.data.targetEmail : authUser.email;

    if (!targetEmail) {
      sendJsonResponse(res, 400, {
        success: false,
        error: "No destination email available. Please provide a target email address.",
      });
      return;
    }

    // Check daily send limit per user plan in Redis
    const limitCheck = await enforceEmailSendLimit(authUser.uid, authUser.plan);
    if (!limitCheck.allowed) {
      sendJsonResponse(res, 429, {
        success: false,
        error: limitCheck.message,
      });
      return;
    }

    const result = await sendEmail({
      to: targetEmail,
      subject: "Test Email from your AI Business Platform",
      text: "This is a verified test email sent from your AI Business Platform via Resend. Your email integration is functioning properly!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #7c3aed; margin-top: 0;">Email Integration Active!</h2>
          <p style="color: #334155; line-height: 1.6;">
            Hello! This is a verified test email confirming that your email integration is functioning properly.
          </p>
          <div style="background-color: #f8fafc; padding: 12px 16px; border-radius: 6px; margin: 16px 0; font-size: 13px; color: #475569;">
            <strong>Recipient:</strong> ${targetEmail}<br/>
            <strong>Provider:</strong> Resend<br/>
            <strong>Plan Quota:</strong> Verified Active
          </div>
          <p style="color: #64748b; font-size: 12px; margin-bottom: 0;">
            Sent securely from your AI Business Employee Suite.
          </p>
        </div>
      `,
    });

    sendJsonResponse(res, 200, {
      success: result.success,
      isConfigured: isResendConfigured(),
      messageId: result.messageId,
      error: result.error,
      mailtoUrl: result.mailtoUrl,
      recipient: targetEmail,
      note: !isResendConfigured()
        ? "RESEND_API_KEY or RESEND_FROM_EMAIL not configured. Email was NOT sent automatically."
        : undefined,
    });
  } catch (err: unknown) {
    console.error("Test email error:", err);
    sendJsonResponse(res, 500, {
      success: false,
      error: err instanceof Error ? err.message : "Failed to dispatch test email.",
    });
  }
}

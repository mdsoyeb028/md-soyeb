import { parseRequestBody, sendJsonResponse } from "../serverlessHttp.ts";
import { verifyAuthToken, getAdminFirestore } from "../auth.ts";
import { ActionExecutionSchema } from "../schemas.ts";
import { sendEmail, isResendConfigured } from "../integrations/email.ts";
import { enforceEmailSendLimit } from "../planEnforcement.ts";
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
    // 1. Require a verified non-guest Firebase user
    const authUser = await verifyAuthToken(req);
    if (!authUser.uid || authUser.isGuest) {
      sendJsonResponse(res, 401, {
        success: false,
        error: "Authentication required. Please sign in with Google to approve and execute agent tasks.",
      });
      return;
    }

    const rawBody = await parseRequestBody(req);
    const parsed = ActionExecutionSchema.safeParse(rawBody);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || "Invalid action execution payload.";
      sendJsonResponse(res, 400, { success: false, error: errorMsg });
      return;
    }

    const { taskId, agentId, targetPlatform, content, recipientEmail, subject } = parsed.data;

    const db = getAdminFirestore();
    if (!db) {
      sendJsonResponse(res, 503, { success: false, error: "Database service temporarily unavailable." });
      return;
    }

    // 2. Fetch task from Firestore to verify ownership and lifecycle state
    // Look in agent-scoped subcollection and top-level user tasks collection
    const targetRefs: FirebaseFirestore.DocumentReference[] = [];
    let taskData: any = null;

    if (agentId) {
      const scopedRef = db
        .collection("users")
        .doc(authUser.uid)
        .collection("agents")
        .doc(agentId)
        .collection("tasks")
        .doc(taskId);
      const scopedSnap = await scopedRef.get();
      if (scopedSnap.exists) {
        targetRefs.push(scopedRef);
        taskData = scopedSnap.data();
      }
    }

    const topLevelRef = db
      .collection("users")
      .doc(authUser.uid)
      .collection("tasks")
      .doc(taskId);
    const topLevelSnap = await topLevelRef.get();
    if (topLevelSnap.exists) {
      targetRefs.push(topLevelRef);
      if (!taskData) {
        taskData = topLevelSnap.data();
      }
    }

    if (targetRefs.length === 0 || !taskData) {
      sendJsonResponse(res, 404, {
        success: false,
        error: "Task not found or does not belong to your account.",
      });
      return;
    }

    // Double-check ownership
    if (taskData.userId && taskData.userId !== authUser.uid) {
      sendJsonResponse(res, 403, {
        success: false,
        error: "Permission denied. This task does not belong to your account.",
      });
      return;
    }

    // 3. Reject if task has already been executed (prevent double sending)
    if (taskData.status === "EXECUTED" || taskData.status === "COMPLETED") {
      sendJsonResponse(res, 409, {
        success: false,
        error: "This task has already been executed. Cannot execute an action twice.",
        status: taskData.status,
      });
      return;
    }

    const nowIso = new Date().toISOString();
    const platformLower = (targetPlatform || taskData.targetPlatform || "email").toLowerCase();

    // 4. Handle Action Dispatch based on platform
    // Strict requirement: ONLY mark EXECUTED if the provider actually returned success.
    // Never show EXECUTED/COMPLETED without a real send.
    if (platformLower.includes("email") || platformLower === "direct" || !taskData.targetPlatform) {
      const toEmail = (recipientEmail || taskData.recipientEmail || authUser.email || "").trim();
      if (!toEmail) {
        sendJsonResponse(res, 400, {
          success: false,
          error: "Recipient email is required to execute email action.",
        });
        return;
      }

      // Check max recipients limit (max 20 per action)
      const recipientList = toEmail.split(/[,;\s]+/).filter(Boolean);
      if (recipientList.length > 20) {
        sendJsonResponse(res, 400, {
          success: false,
          error: "Maximum 20 recipients allowed per email action.",
        });
        return;
      }

      // Enforce daily email dispatch quota per user plan in Redis (Free 5, Starter 50, Business 250, Pro 1000)
      const limitCheck = await enforceEmailSendLimit(authUser.uid, authUser.plan);
      if (!limitCheck.allowed) {
        sendJsonResponse(res, 429, {
          success: false,
          error: limitCheck.message,
          code: "EMAIL_DAILY_LIMIT_REACHED",
        });
        return;
      }

      const emailSubject = subject || taskData.title || "Business Update from AI Agent";
      const emailBody = content || taskData.previewContent || taskData.details || taskData.content || "";

      // Real Resend dispatch
      const emailResult = await sendEmail({
        to: recipientList.length === 1 ? recipientList[0] : recipientList,
        subject: emailSubject,
        text: emailBody,
        html: `<div style="font-family:sans-serif;line-height:1.6;color:#1e293b;">
          ${emailBody.replace(/\n/g, "<br/>")}
        </div>`,
        replyTo: authUser.email || undefined,
      });

      if (emailResult.success) {
        // Honest success: Status is EXECUTED only because Resend returned real success
        const updatePayload = {
          status: "EXECUTED",
          lifecycle: "EXECUTED",
          executedAt: nowIso,
          messageId: emailResult.messageId,
          executionNotes: `Email successfully sent to ${toEmail} via Resend. Message ID: ${emailResult.messageId}`,
          executionResult: {
            success: true,
            messageId: emailResult.messageId,
            sentVia: "resend",
            recipient: toEmail,
            subject: emailSubject,
          },
          failureReason: null,
          mailtoFallback: null,
          updatedAt: nowIso,
        };

        await Promise.all(targetRefs.map((ref) => ref.set(updatePayload, { merge: true })));

        sendJsonResponse(res, 200, {
          success: true,
          taskId,
          status: "EXECUTED",
          messageId: emailResult.messageId,
          executionNote: `Email successfully sent to ${toEmail} via Resend. Message ID: ${emailResult.messageId}`,
        });
        return;
      } else {
        // Real failure: Mark task as FAILED with reason and provide retry option
        const errorReason = emailResult.error || "Email delivery failed via provider.";
        const updatePayload = {
          status: "FAILED",
          lifecycle: "FAILED",
          failedAt: nowIso,
          failureReason: errorReason,
          executionNotes: errorReason,
          mailtoFallback: emailResult.mailtoUrl || null,
          updatedAt: nowIso,
        };

        await Promise.all(targetRefs.map((ref) => ref.set(updatePayload, { merge: true })));

        sendJsonResponse(res, 200, {
          success: false,
          taskId,
          status: "FAILED",
          error: errorReason,
          mailtoUrl: emailResult.mailtoUrl,
          executionNote: errorReason,
        });
        return;
      }
    } else {
      // Non-email actions (e.g. WhatsApp, LinkedIn, Twitter, etc.)
      // Without real API integrations for these channels, DO NOT mark as EXECUTED.
      // Mark as FAILED with clear reason so the user is never misled.
      const unsupportedReason = `Automated dispatch is not configured for platform "${platformLower}". Real sending requires the Email (Resend) integration.`;
      
      const updatePayload = {
        status: "FAILED",
        lifecycle: "FAILED",
        failedAt: nowIso,
        failureReason: unsupportedReason,
        executionNotes: unsupportedReason,
        updatedAt: nowIso,
      };

      await Promise.all(targetRefs.map((ref) => ref.set(updatePayload, { merge: true })));

      sendJsonResponse(res, 400, {
        success: false,
        taskId,
        status: "FAILED",
        error: unsupportedReason,
        executionNote: unsupportedReason,
      });
      return;
    }
  } catch (err: unknown) {
    console.error("Action execution error:", err);
    sendJsonResponse(res, 500, {
      success: false,
      error: normalizeServerErrorMessage(err, "Failed to execute agent action."),
    });
  }
}

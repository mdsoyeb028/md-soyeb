import { Resend } from "resend";
import { z } from "zod";

// Strict Zod schema for Email dispatch
export const SendEmailSchema = z.object({
  to: z.union([
    z.string().email("Invalid recipient email address").max(100),
    z.array(z.string().email("Invalid recipient email address").max(100)).min(1, "At least one recipient is required").max(20, "Maximum 20 recipients allowed per email action"),
  ]),
  subject: z.string().min(1, "Email subject is required").max(200, "Subject cannot exceed 200 characters"),
  html: z.string().max(20000, "HTML content cannot exceed 20,000 characters").optional(),
  text: z.string().max(20000, "Text content cannot exceed 20,000 characters").optional(),
  replyTo: z.string().email("Invalid reply-to email address").max(100).optional(),
}).refine(data => Boolean(data.html || data.text), {
  message: "Either HTML or text content must be provided",
});

export type SendEmailInput = z.infer<typeof SendEmailSchema>;

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  sentVia: "resend" | "mailto_fallback";
  mailtoUrl?: string;
}

/**
 * Checks if Resend credentials are configured in the environment.
 */
export function isResendConfigured(): boolean {
  const apiKey = (process.env.RESEND_API_KEY || "").trim();
  const fromEmail = (process.env.RESEND_FROM_EMAIL || "").trim();
  return Boolean(apiKey && fromEmail);
}

/**
 * Sends an email via Resend API or generates an honest mailto: fallback if not configured.
 * Validates inputs with Zod and never logs API keys or credentials.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const validated = SendEmailSchema.parse(input);

  const apiKey = (process.env.RESEND_API_KEY || "").trim();
  const fromEmail = (process.env.RESEND_FROM_EMAIL || "").trim();

  const recipients = Array.isArray(validated.to) ? validated.to : [validated.to];

  // If Resend is NOT configured, return honest fallback instructions without faking execution
  if (!apiKey || !fromEmail) {
    const primaryTo = recipients[0] || "";
    const mailtoBody = encodeURIComponent(validated.text || (validated.html ? validated.html.replace(/<[^>]*>/g, "") : ""));
    const mailtoSubject = encodeURIComponent(validated.subject);
    const mailtoUrl = `mailto:${encodeURIComponent(primaryTo)}?subject=${mailtoSubject}&body=${mailtoBody}`;

    return {
      success: false,
      error: "RESEND_API_KEY or RESEND_FROM_EMAIL not configured. Email was NOT sent automatically.",
      sentVia: "mailto_fallback",
      mailtoUrl,
    };
  }

  try {
    const resend = new Resend(apiKey);

    const payload: any = {
      from: fromEmail,
      to: recipients,
      subject: validated.subject,
    };

    if (validated.html) payload.html = validated.html;
    if (validated.text) payload.text = validated.text;
    if (validated.replyTo) payload.reply_to = validated.replyTo;

    const res = await resend.emails.send(payload);

    if (res.error) {
      return {
        success: false,
        error: res.error.message || "Resend API returned an error.",
        sentVia: "resend",
      };
    }

    return {
      success: true,
      messageId: res.data?.id,
      sentVia: "resend",
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unexpected email transmission error.";
    return {
      success: false,
      error: errorMessage,
      sentVia: "resend",
    };
  }
}

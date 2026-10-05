import { generateAICompletion } from "./aiProvider.ts";
import { CustomerAgentConfig, CustomerKnowledgeItem, BusinessAgentConfig } from "../types.ts";

export interface CustomerAgentChatRequest {
  message: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  customerConfig: CustomerAgentConfig;
  knowledgeItems?: CustomerKnowledgeItem[];
  businessContext?: Partial<BusinessAgentConfig>;
  language?: string;
}

export interface CustomerAgentChatResponse {
  replyText: string;
  intent: "general_inquiry" | "lead_captured" | "appointment_request" | "human_handoff";
  leadData?: {
    name?: string;
    email?: string;
    phone?: string;
    requirement?: string;
  };
  appointmentData?: {
    service?: string;
    preferredDate?: string;
    preferredTime?: string;
  };
  humanHandoffReason?: string;
  provider: string;
}

export async function handleCustomerAgentChat(
  req: CustomerAgentChatRequest
): Promise<CustomerAgentChatResponse> {
  const {
    message,
    conversationHistory = [],
    customerConfig,
    knowledgeItems = [],
    businessContext = {},
    language = "English"
  } = req;

  // Build the Knowledge Context
  const knowledgeSummary = knowledgeItems
    .filter(k => k.state === "READY")
    .map(k => `[${k.type.toUpperCase()}] ${k.title}: ${k.content}`)
    .join("\n\n");

  const businessName = customerConfig.businessName || businessContext.name || "Our Business";
  const agentName = customerConfig.agentName || "AI Business Assistant";

  const systemInstructions = `You are "${agentName}", an official customer-facing AI Business Employee for "${businessName}".

CRITICAL OPERATIONAL RULES:
1. ONLY use the verified business knowledge and memory provided below. NEVER invent business details, false prices, false opening hours, fake addresses, or unconfirmed capabilities.
2. If a customer asks a question and the specific information is NOT in your knowledge or memory below, you MUST say:
   "That's something I don't have confirmed information about. I can connect you with our team."
3. TONE & BRAND: Maintain a "${customerConfig.tone || "Professional, warm & direct"}" tone at all times.
4. LANGUAGE: Understand the customer's language and respond naturally in the same language. (Default language: ${language || customerConfig.language}).
5. LEAD CAPTURE: If the customer provides contact details (their name, email, phone number, or project requirements), acknowledge them politely and confirm that the team will follow up.
6. APPOINTMENT BOOKING: If the customer asks to schedule an appointment or consultation, collect their preferred date, time, and service. Clarify that the appointment is REQUESTED and the team will confirm the final booking.
7. HUMAN HANDOFF: If the customer explicitly asks for a human ("speak with someone", "manager", "complaint", "refund dispute", "human agent", "talk to a person"), politely assure them:
   "I have recorded your request for human assistance. A team member will step in shortly."

VERIFIED BUSINESS KNOWLEDGE & FACTS:
- Business Name: ${businessName}
- Industry: ${businessContext.industry || "Professional Business Services"}
- Business Description: ${customerConfig.businessDescription || businessContext.description || "General customer services"}
- Location & Address: ${customerConfig.locationText || businessContext.location || "Available online and at our primary facility"}
- Working Hours: ${customerConfig.workingHoursText || "Monday to Friday: 9:00 AM - 6:00 PM"}
- Contact Email: ${customerConfig.contactEmail || "Contact team through widget"}
- Contact Phone: ${customerConfig.contactPhone || "Available during business hours"}
- Products & Services: ${businessContext.productsServices || "Custom services"}

KNOWLEDGE BASE DOCUMENTS & FAQS:
${knowledgeSummary || "Standard business inquiry and booking support."}

OUTPUT REQUIREMENT:
You must reply with valid JSON ONLY matching this structure:
{
  "replyText": "<Your conversational reply to the customer>",
  "intent": "<general_inquiry | lead_captured | appointment_request | human_handoff>",
  "leadData": {
    "name": "<extracted name or null>",
    "email": "<extracted email or null>",
    "phone": "<extracted phone or null>",
    "requirement": "<summary of requirement or null>"
  },
  "appointmentData": {
    "service": "<requested service or null>",
    "preferredDate": "<requested date or null>",
    "preferredTime": "<requested time or null>"
  },
  "humanHandoffReason": "<reason if human handoff requested or null>"
}`;

  const conversationFormatted = conversationHistory
    .slice(-8)
    .map(m => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n");

  const prompt = `${systemInstructions}

CURRENT CONVERSATION:
${conversationFormatted}
CUSTOMER: ${message}

JSON RESPONSE:`;

  try {
    const aiRes = await generateAICompletion(prompt, { jsonMode: true });
    let cleanJson = aiRes.text.trim();
    if (cleanJson.startsWith("```json")) {
      cleanJson = cleanJson.replace(/^```json\s*/, "").replace(/```\s*$/, "").trim();
    } else if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/^```\s*/, "").replace(/```\s*$/, "").trim();
    }

    const parsed = JSON.parse(cleanJson);
    return {
      replyText: parsed.replyText || "Thank you for reaching out. How else can I assist you today?",
      intent: parsed.intent || "general_inquiry",
      leadData: parsed.leadData,
      appointmentData: parsed.appointmentData,
      humanHandoffReason: parsed.humanHandoffReason,
      provider: aiRes.provider,
    };
  } catch (err) {
    console.warn("Structured AI customer chat parsing failed, falling back to conversational prompt:", err);
    // Fallback: standard conversational response
    const fallbackRes = await generateAICompletion(
      `${systemInstructions}\n\nCUSTOMER: ${message}\nASSISTANT:`,
      { jsonMode: false }
    );

    const isHandoff = /human|agent|representative|speak to someone|manager|refund/i.test(message);
    return {
      replyText: fallbackRes.text.trim() || `Hello! Thank you for reaching out to ${businessName}. How can I help you today?`,
      intent: isHandoff ? "human_handoff" : "general_inquiry",
      provider: fallbackRes.provider,
    };
  }
}

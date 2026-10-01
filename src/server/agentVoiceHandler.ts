import { generateAICompletion } from "./aiProvider";
import { BusinessAgentConfig } from "../types";

export interface AgentVoiceRequest {
  speechText: string;
  agentConfig?: Partial<BusinessAgentConfig>;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  language?: string;
}

export interface AgentVoiceResponse {
  spokenReply: string;
  displayTranscript: string;
  detectedIntent: string;
  suggestedAction?: {
    title: string;
    actionType: string;
    preview: string;
  };
  provider: string;
}

/**
 * Voice-optimized response handler for AI Business Agent.
 * Generates natural, spoken-friendly responses without bulky markdown tables or bulleted lists.
 */
export async function handleAgentVoiceInteraction(
  params: AgentVoiceRequest
): Promise<AgentVoiceResponse> {
  const { speechText, agentConfig, conversationHistory = [], language = "English" } = params;

  const agentName = agentConfig?.name || "Business Growth Agent";
  const industry = agentConfig?.industry || "Commercial Business";
  const location = agentConfig?.location || "Global";
  const tone = agentConfig?.brandTone || "Professional, helpful, and direct";
  const customInstructions = agentConfig?.customInstructions || "";
  const products = agentConfig?.productsServices || "Products & Services";
  const targetCustomers = agentConfig?.targetCustomers || "Prospective Clients";

  const systemPrompt = `You are ${agentName}, an AI Business Agent for a ${industry} business located in ${location}.
Your brand tone is: ${tone}.
Products/Services offered: ${products}.
Target customers: ${targetCustomers}.
${customInstructions ? `Special Business Instructions: ${customInstructions}` : ""}

CRITICAL SPOKEN VOICE GUIDELINES:
1. You are speaking through real-time VOICE audio.
2. Keep your answer conversational, punchy, and under 3-4 sentences.
3. NEVER use markdown tables, asterisks, bullet lists, or code blocks in voice mode.
4. Speak naturally in ${language} matching the user's language and tone.
5. If the user asks about business growth, leads, customer support, or operations, give a direct, practical spoken answer.
6. If the user needs an external action (like sending a message or running an ad), state that you have drafted it and are waiting for their approval in the dashboard.
7. Be warm, confident, and direct.`;

  const historyPrompt = conversationHistory
    .slice(-4)
    .map((m) => `${m.role === "user" ? "User" : agentName}: ${m.content}`)
    .join("\n");

  const prompt = `${systemPrompt}

${historyPrompt ? `Recent Conversation History:\n${historyPrompt}\n` : ""}
User Spoke: "${speechText}"

Respond concisely for audio voice playback:`;

  const aiResult = await generateAICompletion(prompt, {
    systemPrompt: "You are an AI Business Voice Agent speaking out loud in conversational dialogue.",
  });

  const spokenClean = aiResult.text
    .replace(/[*#`_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  // Detect if an external action should be prepared for approval
  let suggestedAction: AgentVoiceResponse["suggestedAction"];
  const lower = speechText.toLowerCase();
  if (lower.includes("send") || lower.includes("email") || lower.includes("message") || lower.includes("whatsapp")) {
    suggestedAction = {
      title: `Draft message for ${industry} client`,
      actionType: "outreach_message",
      preview: `Prepared outreach message based on spoken request: "${speechText}"`,
    };
  } else if (lower.includes("ad") || lower.includes("campaign") || lower.includes("facebook") || lower.includes("google")) {
    suggestedAction = {
      title: `Draft advertising plan for ${products}`,
      actionType: "ad_campaign",
      preview: `Ad campaign setup prepared for ${targetCustomers}`,
    };
  }

  return {
    spokenReply: spokenClean,
    displayTranscript: spokenClean,
    detectedIntent: "VOICE_INTERACTION",
    suggestedAction,
    provider: aiResult.provider,
  };
}

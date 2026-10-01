import { generateAICompletion } from "./aiProvider";
import { BusinessAgentConfig, BusinessDocument, AgentActionTask } from "../types";
import { detectLanguage, resolveTargetLanguage, detectIntent } from "./intentAndLanguageDetector";
import { handleConversationalResponse } from "./conversationalHandler";

export interface AgentChatRequest {
  message: string;
  agentConfig: BusinessAgentConfig;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  attachedDocuments?: BusinessDocument[];
  analyzedUrlContext?: string;
  language?: string;
}

export interface AgentChatResponse {
  replyText: string;
  mode: "conversational" | "business_work";
  language: string;
  preparedTask?: {
    title: string;
    category: AgentActionTask["category"];
    actionType: string;
    previewContent: string;
    details: string;
    estimatedCostOrBudget: string;
    targetPlatform: string;
    status: "PREPARED BY AI" | "WAITING FOR APPROVAL";
  };
  suggestedQuickReplies?: string[];
  provider: string;
}

export async function handleAgentChat(params: AgentChatRequest): Promise<AgentChatResponse> {
  const { 
    message, 
    agentConfig, 
    conversationHistory = [], 
    attachedDocuments = [], 
    analyzedUrlContext = "",
    language: explicitLanguage 
  } = params;

  const trimmedQuery = message.trim();
  const detectedLang = detectLanguage(trimmedQuery, explicitLanguage);
  const selectedLanguage = resolveTargetLanguage(detectedLang, explicitLanguage || agentConfig.preferredLanguage);
  const detectedIntent = detectIntent(trimmedQuery, conversationHistory);

  // 1. Casual conversational fast-path
  if (detectedIntent === "CASUAL_CONVERSATION") {
    const conv = await handleConversationalResponse({
      query: trimmedQuery,
      intent: detectedIntent,
      languageDetection: detectedLang,
      targetLanguage: selectedLanguage,
      conversationHistory,
    });
    return {
      replyText: conv.replyText,
      mode: "conversational",
      language: selectedLanguage,
      suggestedQuickReplies: conv.suggestedQuickReplies || [
        "How can we get more customers?",
        "Analyze my website",
        "Create this week's marketing plan",
      ],
      provider: "fast-path",
    };
  }

  // 2. Business Work & Problem Solving Mode with full Agent Context
  const docsSummary = attachedDocuments.length > 0
    ? `\nUPLOADED BUSINESS DOCUMENTS & VERIFIED FACTS:\n${attachedDocuments
        .map((d) => `Document: "${d.name}" (${d.fileType})\nExtracted Text / Facts:\n${d.extractedText.slice(0, 1500)}`)
        .join("\n---\n")}\n`
    : "";

  const systemPrompt = `You are ${agentConfig.name}, the dedicated AI Business Agent for a ${agentConfig.industry} business located in ${agentConfig.location}.
Your primary role is to REDUCE MANUAL WORK for this business owner.
Instead of only giving abstract advice, understand, analyze, prepare, draft, and format practical deliverables ready for approval.

BUSINESS CONTEXT:
- Business Name: ${agentConfig.name}
- Industry: ${agentConfig.industry}
- Location: ${agentConfig.location}
- Website: ${agentConfig.website || "None"}
- Products / Services: ${agentConfig.productsServices || "Not specified"}
- Target Customers: ${agentConfig.targetCustomers || "Target buyers"}
- Description: ${agentConfig.description || "Commercial business"}
- Brand Tone: ${agentConfig.brandTone || "Professional, direct, and growth-oriented"}
- Business Goals: ${agentConfig.businessGoals || "Increase sales and streamline operations"}
${agentConfig.customInstructions ? `- Custom Owner Instructions: ${agentConfig.customInstructions}` : ""}
${docsSummary}
${analyzedUrlContext ? `\nLIVE URL / SOCIAL AUDIT FINDINGS:\n${analyzedUrlContext}\n` : ""}

STRICT OPERATING PRINCIPLES:
1. Speak in ${selectedLanguage} (matching the user's natural language and script).
2. Ground all answers specifically in the business industry (${agentConfig.industry}) and target customers (${agentConfig.targetCustomers}).
3. Never invent fake metrics, guaranteed sales, or fake followers.
4. ACTION APPROVAL MANDATE: You prepare work, but NEVER claim you sent messages, spent money, or published posts.
   Always present drafts with: "PREPARED BY AI → WAITING FOR APPROVAL".
5. If the request calls for an outreach message, customer reply, social media content, ad copy, or operational plan, structure the output cleanly so the user can review and approve it immediately.`;

  const historyFormatted = conversationHistory
    .slice(-6)
    .map((m) => `${m.role === "user" ? "Business Owner" : agentConfig.name}: ${m.content}`)
    .join("\n");

  const prompt = `${systemPrompt}

${historyFormatted ? `Recent Conversation History:\n${historyFormatted}\n` : ""}
Business Owner: "${trimmedQuery}"

Provide a comprehensive, practical, time-saving response in ${selectedLanguage}.
If a draft deliverable or external action was requested (or is needed to solve this problem), include a clearly formatted block with:
[PREPARED ACTION FOR APPROVAL]
Title: ...
Platform: WhatsApp / Email / Google / Meta / Website
Target: ...
Drafted Content: ...
[/PREPARED ACTION FOR APPROVAL]`;

  const aiResult = await generateAICompletion(prompt, {
    systemPrompt,
  });

  // Check if an action was prepared for approval
  let preparedTask: AgentChatResponse["preparedTask"];
  const actionMatch = aiResult.text.match(
    /\[PREPARED ACTION FOR APPROVAL\]([\s\S]*?)\[\/PREPARED ACTION FOR APPROVAL\]/i
  );

  if (actionMatch) {
    const rawAction = actionMatch[1];
    const titleMatch = rawAction.match(/Title:\s*(.+)/i);
    const platformMatch = rawAction.match(/Platform:\s*(.+)/i);
    const draftedContentMatch = rawAction.match(/Drafted Content:\s*([\s\S]*)/i);

    const title = titleMatch ? titleMatch[1].trim() : `Action: ${trimmedQuery.slice(0, 50)}`;
    const platform = platformMatch ? platformMatch[1].trim() : "Direct / Communication";
    const preview = draftedContentMatch ? draftedContentMatch[1].trim() : rawAction.trim();

    preparedTask = {
      title,
      category: "marketing",
      actionType: "ai_prepared_action",
      previewContent: preview,
      details: rawAction.trim(),
      estimatedCostOrBudget: "$0 (Organic) or specified budget",
      targetPlatform: platform,
      status: "WAITING FOR APPROVAL",
    };
  } else {
    // If user explicitly asked to draft something (customer reply, email, ad, post)
    const lower = trimmedQuery.toLowerCase();
    if (
      lower.includes("reply") ||
      lower.includes("write") ||
      lower.includes("draft") ||
      lower.includes("post") ||
      lower.includes("message") ||
      lower.includes("email") ||
      lower.includes("ad")
    ) {
      preparedTask = {
        title: `Draft for: ${trimmedQuery.slice(0, 45)}`,
        category: lower.includes("ad") ? "ads" : lower.includes("reply") ? "support" : "marketing",
        actionType: "deliverable_draft",
        previewContent: aiResult.text.slice(0, 500),
        details: aiResult.text,
        estimatedCostOrBudget: "$0",
        targetPlatform: lower.includes("whatsapp") ? "WhatsApp" : lower.includes("email") ? "Email" : "Website/Direct",
        status: "WAITING FOR APPROVAL",
      };
    }
  }

  return {
    replyText: aiResult.text,
    mode: "business_work",
    language: selectedLanguage,
    preparedTask,
    suggestedQuickReplies: [
      "Approve this draft",
      "Can we adjust the tone?",
      "Create 3 alternate versions",
      "What is our next step today?",
    ],
    provider: aiResult.provider,
  };
}

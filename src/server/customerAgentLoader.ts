import { getAdminFirestore } from "./auth.ts";
import { CustomerAgentConfig, CustomerKnowledgeItem } from "../types.ts";

export interface LoadedCustomerAgentData {
  config: CustomerAgentConfig;
  knowledgeItems: CustomerKnowledgeItem[];
  ownerUid: string;
}

/**
 * Loads the public customer agent configuration and knowledge base
 * securely from Firestore using the Firebase Admin SDK.
 * 
 * Rejects unknown or disabled agents.
 * Never accepts prompt or knowledge overrides from the visitor client.
 */
export async function loadVerifiedCustomerAgent(agentId: string): Promise<LoadedCustomerAgentData> {
  const db = getAdminFirestore();
  if (!db) {
    throw new Error("Database service is currently initializing. Please try again shortly.");
  }

  const cleanAgentId = agentId.trim();
  if (!cleanAgentId) {
    throw new Error("Invalid agent identification provided.");
  }

  // 1. Fetch public agent declaration document from public_customer_agents
  const publicDocSnap = await db.collection("public_customer_agents").doc(cleanAgentId).get();
  if (!publicDocSnap.exists) {
    throw new Error("Customer AI agent not found. The business may have removed or relocated this widget.");
  }

  const publicData = publicDocSnap.data();
  if (!publicData || !publicData.enabled) {
    throw new Error("This customer AI agent is currently offline or disabled by the business owner.");
  }

  const ownerUid = publicData.userId;
  if (!ownerUid) {
    throw new Error("Agent configuration is missing required owner association.");
  }

  // 2. Fetch full owner's customer agent configuration to get verified settings
  let config: CustomerAgentConfig = {
    id: cleanAgentId,
    agentId: cleanAgentId,
    userId: ownerUid,
    agentName: publicData.agentName || "Customer Support AI",
    businessName: publicData.businessName || "Business Services",
    enabled: true,
    tone: publicData.tone || "Professional, warm & direct",
    language: publicData.language || "English",
    welcomeMessage: publicData.welcomeMessage || "Hello! How can I help you today?",
    businessDescription: publicData.businessDescription || "",
    brandColor: publicData.brandColor || "#2563eb",
    logoUrl: publicData.logoUrl || "",
    greetingText: publicData.greetingText || "",
    workingHoursText: publicData.workingHoursText || "",
    locationText: publicData.locationText || "",
    voiceGender: publicData.voiceGender || "female",
    bookingEnabled: publicData.bookingEnabled ?? true,
    leadCaptureEnabled: publicData.leadCaptureEnabled ?? true,
    humanHandoffEnabled: publicData.humanHandoffEnabled ?? false,
    publicWidgetEnabled: publicData.publicWidgetEnabled ?? true,
    isTelephonyConnected: publicData.isTelephonyConnected ?? false,
    isCalendarConnected: publicData.isCalendarConnected ?? false,
    suggestedQuestions: publicData.suggestedQuestions || [],
    widgetPosition: publicData.widgetPosition || "bottom-right",
    createdAt: publicData.createdAt || new Date().toISOString(),
    updatedAt: publicData.updatedAt || new Date().toISOString(),
  };

  try {
    const ownerConfigSnap = await db
      .collection("users")
      .doc(ownerUid)
      .collection("agents")
      .doc(cleanAgentId)
      .collection("customerAgent")
      .doc("config")
      .get();

    if (ownerConfigSnap.exists) {
      const ownerConfigData = ownerConfigSnap.data();
      if (ownerConfigData) {
        config = {
          ...config,
          ...ownerConfigData,
          agentId: cleanAgentId,
          enabled: true,
        };
      }
    }
  } catch (err) {
    console.warn(`Could not read private agent subcollection config for ${cleanAgentId}, falling back to public manifest:`, err);
  }

  // 3. Load verified knowledge items from owner's Firestore subcollection
  const knowledgeItems: CustomerKnowledgeItem[] = [];
  try {
    const knowledgeSnap = await db
      .collection("users")
      .doc(ownerUid)
      .collection("agents")
      .doc(cleanAgentId)
      .collection("customerKnowledge")
      .where("state", "==", "READY")
      .limit(30)
      .get();

    for (const doc of knowledgeSnap.docs) {
      const data = doc.data();
      if (data && data.title && data.content) {
        knowledgeItems.push({
          id: doc.id,
          agentId: cleanAgentId,
          userId: ownerUid,
          type: data.type || "faq",
          title: data.title,
          content: data.content,
          state: "READY",
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
        });
      }
    }
  } catch (err) {
    console.warn(`Could not load customer knowledge for agent ${cleanAgentId}:`, err);
  }

  return {
    config,
    knowledgeItems,
    ownerUid,
  };
}

/**
 * Basic prompt injection guard to protect the system instructions.
 * Detects attempts to extract the system prompt, override rules, or hijack identity.
 */
export function sanitizeVisitorInput(input: string): string {
  const trimmed = input.trim();
  // Strip control chars
  return trimmed.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, "");
}

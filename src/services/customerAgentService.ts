import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy 
} from "firebase/firestore";
import { User } from "firebase/auth";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { 
  CustomerAgentConfig, 
  CustomerLead, 
  CustomerAppointment, 
  CustomerKnowledgeItem, 
  CustomerConversation, 
  CustomerAutomationRule, 
  CustomerIntegrationConfig 
} from "../types";

const LOCAL_STORAGE_PREFIX = "bge_customer_agent_";

function getLocalKey(sub: string, agentId: string): string {
  return `${LOCAL_STORAGE_PREFIX}${sub}_${agentId}`;
}

export function getDefaultCustomerAgentConfig(agentId: string, businessName = "Our Business"): CustomerAgentConfig {
  const now = new Date().toISOString();
  return {
    id: `cust_cfg_${agentId}`,
    agentId,
    userId: "guest",
    enabled: true,
    agentName: "AI Assistant",
    businessName: businessName || "Our Business",
    welcomeMessage: `Hi! I am the AI Customer Agent for ${businessName}. How can I help you with our services, pricing, or booking today?`,
    businessDescription: "Official business customer support and inquiry assistant.",
    brandColor: "#06b6d4",
    tone: "Professional, warm & direct",
    language: "Auto / Same as visitor",
    voiceGender: "female",
    voiceSpeed: 1.0,
    greetingText: `Thank you for contacting ${businessName}. I'm here to assist you with services, questions, or appointments.`,
    workingHoursText: "Monday - Friday: 9:00 AM - 6:00 PM",
    locationText: "Available online & at our headquarters",
    contactEmail: "",
    contactPhone: "",
    bookingEnabled: true,
    leadCaptureEnabled: true,
    humanHandoffEnabled: true,
    handoffKeywords: ["human", "agent", "representative", "manager", "complaint", "refund", "speak with someone"],
    publicWidgetEnabled: true,
    widgetPosition: "bottom-right",
    suggestedQuestions: [
      "What services do you offer?",
      "How much does it cost?",
      "Can I schedule an appointment?",
      "Where are you located?"
    ],
    isTelephonyConnected: false,
    isCalendarConnected: false,
    updatedAt: now,
    createdAt: now,
  };
}

// 1. Customer Agent Configuration
export async function saveCustomerAgentConfig(
  config: CustomerAgentConfig,
  user: User | null
): Promise<{ config: CustomerAgentConfig; isCloud: boolean }> {
  const now = new Date().toISOString();
  const configToSave: CustomerAgentConfig = {
    ...config,
    userId: user ? user.uid : "guest",
    updatedAt: now,
  };

  if (user && user.uid && !user.isAnonymous) {
    const docRef = doc(db, "users", user.uid, "agents", config.agentId, "customerAgent", "config");
    try {
      await setDoc(docRef, configToSave, { merge: true });

      // Synchronize public customer-facing presentation
      const publicDocRef = doc(db, "public_customer_agents", config.agentId);
      if (configToSave.publicWidgetEnabled && configToSave.enabled) {
        const publicSafeData = {
          id: config.agentId,
          agentId: config.agentId,
          userId: user.uid,
          enabled: true,
          agentName: configToSave.agentName,
          businessName: configToSave.businessName,
          welcomeMessage: configToSave.welcomeMessage,
          businessDescription: configToSave.businessDescription,
          brandColor: configToSave.brandColor,
          logoUrl: configToSave.logoUrl || "",
          tone: configToSave.tone,
          language: configToSave.language,
          greetingText: configToSave.greetingText || "",
          workingHoursText: configToSave.workingHoursText || "",
          locationText: configToSave.locationText || "",
          bookingEnabled: configToSave.bookingEnabled,
          leadCaptureEnabled: configToSave.leadCaptureEnabled,
          suggestedQuestions: configToSave.suggestedQuestions,
          widgetPosition: configToSave.widgetPosition,
          updatedAt: now,
        };
        await setDoc(publicDocRef, publicSafeData, { merge: true });
      } else {
        try {
          await deleteDoc(publicDocRef);
        } catch {
          // ignore
        }
      }

      return { config: configToSave, isCloud: true };
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/agents/${config.agentId}/customerAgent/config`);
      throw err;
    }
  } else {
    try {
      localStorage.setItem(getLocalKey("config", config.agentId), JSON.stringify(configToSave));
    } catch (err) {
      console.warn("Local storage write failed:", err);
    }
    return { config: configToSave, isCloud: false };
  }
}

export async function loadCustomerAgentConfig(
  agentId: string,
  user: User | null,
  fallbackBusinessName?: string
): Promise<CustomerAgentConfig> {
  if (user && user.uid && !user.isAnonymous) {
    try {
      const docRef = doc(db, "users", user.uid, "agents", agentId, "customerAgent", "config");
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as CustomerAgentConfig;
      }
    } catch (err) {
      console.warn("Could not load customer agent config from cloud:", err);
    }
  }

  // Fallback to local storage
  try {
    const raw = localStorage.getItem(getLocalKey("config", agentId));
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }

  return getDefaultCustomerAgentConfig(agentId, fallbackBusinessName);
}

// 2. Leads Management
export function subscribeToCustomerLeads(
  userId: string,
  agentId: string,
  onUpdate: (leads: CustomerLead[]) => void
): () => void {
  const colRef = collection(db, "users", userId, "agents", agentId, "customerLeads");
  const q = query(colRef, orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => {
      const items: CustomerLead[] = snap.docs.map((d) => d.data() as CustomerLead);
      onUpdate(items);
    },
    (err) => console.warn("Leads subscription error:", err)
  );
}

export function loadGuestCustomerLeads(agentId: string): CustomerLead[] {
  try {
    const raw = localStorage.getItem(getLocalKey("leads", agentId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveCustomerLead(
  lead: CustomerLead,
  user: User | null
): Promise<{ lead: CustomerLead; isCloud: boolean }> {
  const now = new Date().toISOString();
  const leadId = lead.id || `lead_${Date.now()}`;
  const leadToSave: CustomerLead = {
    ...lead,
    id: leadId,
    userId: user ? user.uid : "guest",
    createdAt: lead.createdAt || now,
    lastContactAt: now,
  };

  if (user && user.uid && !user.isAnonymous) {
    const docRef = doc(db, "users", user.uid, "agents", lead.agentId, "customerLeads", leadId);
    try {
      await setDoc(docRef, leadToSave, { merge: true });
      return { lead: leadToSave, isCloud: true };
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `customerLeads/${leadId}`);
      throw err;
    }
  } else {
    const local = loadGuestCustomerLeads(lead.agentId);
    const updated = [leadToSave, ...local.filter((l) => l.id !== leadId)];
    localStorage.setItem(getLocalKey("leads", lead.agentId), JSON.stringify(updated));
    return { lead: leadToSave, isCloud: false };
  }
}

export async function deleteCustomerLead(leadId: string, agentId: string, user: User | null): Promise<boolean> {
  if (user && user.uid && !user.isAnonymous) {
    const docRef = doc(db, "users", user.uid, "agents", agentId, "customerLeads", leadId);
    try {
      await deleteDoc(docRef);
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `customerLeads/${leadId}`);
      throw err;
    }
  } else {
    const local = loadGuestCustomerLeads(agentId);
    localStorage.setItem(getLocalKey("leads", agentId), JSON.stringify(local.filter((l) => l.id !== leadId)));
    return true;
  }
}

// 3. Appointments Management
export function subscribeToCustomerAppointments(
  userId: string,
  agentId: string,
  onUpdate: (appts: CustomerAppointment[]) => void
): () => void {
  const colRef = collection(db, "users", userId, "agents", agentId, "customerAppointments");
  const q = query(colRef, orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => {
      const items: CustomerAppointment[] = snap.docs.map((d) => d.data() as CustomerAppointment);
      onUpdate(items);
    },
    (err) => console.warn("Appointments subscription error:", err)
  );
}

export function loadGuestCustomerAppointments(agentId: string): CustomerAppointment[] {
  try {
    const raw = localStorage.getItem(getLocalKey("appts", agentId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveCustomerAppointment(
  appt: CustomerAppointment,
  user: User | null
): Promise<{ appointment: CustomerAppointment; isCloud: boolean }> {
  const now = new Date().toISOString();
  const apptId = appt.id || `appt_${Date.now()}`;
  const apptToSave: CustomerAppointment = {
    ...appt,
    id: apptId,
    userId: user ? user.uid : "guest",
    createdAt: appt.createdAt || now,
    updatedAt: now,
  };

  if (user && user.uid && !user.isAnonymous) {
    const docRef = doc(db, "users", user.uid, "agents", appt.agentId, "customerAppointments", apptId);
    try {
      await setDoc(docRef, apptToSave, { merge: true });
      return { appointment: apptToSave, isCloud: true };
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `customerAppointments/${apptId}`);
      throw err;
    }
  } else {
    const local = loadGuestCustomerAppointments(appt.agentId);
    const updated = [apptToSave, ...local.filter((a) => a.id !== apptId)];
    localStorage.setItem(getLocalKey("appts", appt.agentId), JSON.stringify(updated));
    return { appointment: apptToSave, isCloud: false };
  }
}

export async function deleteCustomerAppointment(apptId: string, agentId: string, user: User | null): Promise<boolean> {
  if (user && user.uid && !user.isAnonymous) {
    const docRef = doc(db, "users", user.uid, "agents", agentId, "customerAppointments", apptId);
    try {
      await deleteDoc(docRef);
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `customerAppointments/${apptId}`);
      throw err;
    }
  } else {
    const local = loadGuestCustomerAppointments(agentId);
    localStorage.setItem(getLocalKey("appts", agentId), JSON.stringify(local.filter((a) => a.id !== apptId)));
    return true;
  }
}

// 4. Knowledge Base Management
export function subscribeToCustomerKnowledge(
  userId: string,
  agentId: string,
  onUpdate: (items: CustomerKnowledgeItem[]) => void
): () => void {
  const colRef = collection(db, "users", userId, "agents", agentId, "customerKnowledge");
  const q = query(colRef, orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => {
      const items: CustomerKnowledgeItem[] = snap.docs.map((d) => d.data() as CustomerKnowledgeItem);
      onUpdate(items);
    },
    (err) => console.warn("Knowledge subscription error:", err)
  );
}

export function loadGuestCustomerKnowledge(agentId: string): CustomerKnowledgeItem[] {
  try {
    const raw = localStorage.getItem(getLocalKey("knowledge", agentId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveCustomerKnowledgeItem(
  item: CustomerKnowledgeItem,
  user: User | null
): Promise<{ item: CustomerKnowledgeItem; isCloud: boolean }> {
  const now = new Date().toISOString();
  const itemId = item.id || `know_${Date.now()}`;
  const itemToSave: CustomerKnowledgeItem = {
    ...item,
    id: itemId,
    userId: user ? user.uid : "guest",
    createdAt: item.createdAt || now,
    updatedAt: now,
  };

  if (user && user.uid && !user.isAnonymous) {
    const docRef = doc(db, "users", user.uid, "agents", item.agentId, "customerKnowledge", itemId);
    try {
      await setDoc(docRef, itemToSave, { merge: true });
      return { item: itemToSave, isCloud: true };
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `customerKnowledge/${itemId}`);
      throw err;
    }
  } else {
    const local = loadGuestCustomerKnowledge(item.agentId);
    const updated = [itemToSave, ...local.filter((k) => k.id !== itemId)];
    localStorage.setItem(getLocalKey("knowledge", item.agentId), JSON.stringify(updated));
    return { item: itemToSave, isCloud: false };
  }
}

export async function deleteCustomerKnowledgeItem(itemId: string, agentId: string, user: User | null): Promise<boolean> {
  if (user && user.uid && !user.isAnonymous) {
    const docRef = doc(db, "users", user.uid, "agents", agentId, "customerKnowledge", itemId);
    try {
      await deleteDoc(docRef);
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `customerKnowledge/${itemId}`);
      throw err;
    }
  } else {
    const local = loadGuestCustomerKnowledge(agentId);
    localStorage.setItem(getLocalKey("knowledge", agentId), JSON.stringify(local.filter((k) => k.id !== itemId)));
    return true;
  }
}

// 5. Conversations Management
export function subscribeToCustomerConversations(
  userId: string,
  agentId: string,
  onUpdate: (convs: CustomerConversation[]) => void
): () => void {
  const colRef = collection(db, "users", userId, "agents", agentId, "customerConversations");
  const q = query(colRef, orderBy("updatedAt", "desc"));
  return onSnapshot(
    q,
    (snap) => {
      const items: CustomerConversation[] = snap.docs.map((d) => d.data() as CustomerConversation);
      onUpdate(items);
    },
    (err) => console.warn("Customer conversations subscription error:", err)
  );
}

export function loadGuestCustomerConversations(agentId: string): CustomerConversation[] {
  try {
    const raw = localStorage.getItem(getLocalKey("convs", agentId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveCustomerConversation(
  conv: CustomerConversation,
  user: User | null
): Promise<{ conversation: CustomerConversation; isCloud: boolean }> {
  const now = new Date().toISOString();
  const convId = conv.id || `conv_${Date.now()}`;
  const convToSave: CustomerConversation = {
    ...conv,
    id: convId,
    userId: user ? user.uid : "guest",
    createdAt: conv.createdAt || now,
    updatedAt: now,
  };

  if (user && user.uid && !user.isAnonymous) {
    const docRef = doc(db, "users", user.uid, "agents", conv.agentId, "customerConversations", convId);
    try {
      await setDoc(docRef, convToSave, { merge: true });
      return { conversation: convToSave, isCloud: true };
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `customerConversations/${convId}`);
      throw err;
    }
  } else {
    const local = loadGuestCustomerConversations(conv.agentId);
    const updated = [convToSave, ...local.filter((c) => c.id !== convId)];
    localStorage.setItem(getLocalKey("convs", conv.agentId), JSON.stringify(updated));
    return { conversation: convToSave, isCloud: false };
  }
}

export async function deleteCustomerConversation(
  convId: string,
  agentId: string,
  user: User | null
): Promise<boolean> {
  if (user && user.uid && !user.isAnonymous) {
    const docRef = doc(db, "users", user.uid, "agents", agentId, "customerConversations", convId);
    try {
      await deleteDoc(docRef);
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `customerConversations/${convId}`);
      throw err;
    }
  } else {
    const local = loadGuestCustomerConversations(agentId);
    localStorage.setItem(getLocalKey("convs", agentId), JSON.stringify(local.filter((c) => c.id !== convId)));
    return true;
  }
}

// 6. Automations Management
export function subscribeToCustomerAutomations(
  userId: string,
  agentId: string,
  onUpdate: (rules: CustomerAutomationRule[]) => void
): () => void {
  const colRef = collection(db, "users", userId, "agents", agentId, "customerAutomations");
  return onSnapshot(
    colRef,
    (snap) => {
      const items: CustomerAutomationRule[] = snap.docs.map((d) => d.data() as CustomerAutomationRule);
      onUpdate(items);
    },
    (err) => console.warn("Automations subscription error:", err)
  );
}

export function loadGuestCustomerAutomations(agentId: string): CustomerAutomationRule[] {
  try {
    const raw = localStorage.getItem(getLocalKey("automations", agentId));
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return [
    {
      id: "auto-1",
      agentId,
      userId: "guest",
      name: "When new lead created -> Notify business owner",
      trigger: "new_lead",
      action: "notify_owner",
      enabled: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: "auto-2",
      agentId,
      userId: "guest",
      name: "When customer requests human -> Create escalation",
      trigger: "human_requested",
      action: "create_escalation",
      enabled: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: "auto-3",
      agentId,
      userId: "guest",
      name: "When appointment requested -> Create appointment request",
      trigger: "appointment_requested",
      action: "create_appointment_request",
      enabled: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: "auto-4",
      agentId,
      userId: "guest",
      name: "When question cannot be answered -> Create review task",
      trigger: "unknown_question",
      action: "create_review_task",
      enabled: true,
      createdAt: new Date().toISOString(),
    },
  ];
}

export async function saveCustomerAutomation(
  rule: CustomerAutomationRule,
  user: User | null
): Promise<{ rule: CustomerAutomationRule; isCloud: boolean }> {
  const ruleId = rule.id || `auto_${Date.now()}`;
  const ruleToSave: CustomerAutomationRule = {
    ...rule,
    id: ruleId,
    userId: user ? user.uid : "guest",
  };

  if (user && user.uid && !user.isAnonymous) {
    const docRef = doc(db, "users", user.uid, "agents", rule.agentId, "customerAutomations", ruleId);
    try {
      await setDoc(docRef, ruleToSave, { merge: true });
      return { rule: ruleToSave, isCloud: true };
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `customerAutomations/${ruleId}`);
      throw err;
    }
  } else {
    const local = loadGuestCustomerAutomations(rule.agentId);
    const updated = [ruleToSave, ...local.filter((r) => r.id !== ruleId)];
    localStorage.setItem(getLocalKey("automations", rule.agentId), JSON.stringify(updated));
    return { rule: ruleToSave, isCloud: false };
  }
}

// 7. Integrations Management
export function loadCustomerIntegrations(agentId: string): CustomerIntegrationConfig[] {
  return [
    {
      id: "int-website",
      agentId,
      channel: "website",
      status: "CONNECTED",
      label: "Website AI Widget",
      details: "Embed snippet active & public endpoint operational",
      updatedAt: new Date().toISOString(),
    },
    {
      id: "int-telephony",
      agentId,
      channel: "telephony",
      status: "NOT CONNECTED",
      label: "Phone / Telephony",
      details: "Twilio voice trunk required for incoming voice calls",
      updatedAt: new Date().toISOString(),
    },
    {
      id: "int-whatsapp",
      agentId,
      channel: "whatsapp",
      status: "REQUIRES SETUP",
      label: "WhatsApp Business API",
      details: "Meta Business Cloud webhook setup required",
      updatedAt: new Date().toISOString(),
    },
    {
      id: "int-calendar",
      agentId,
      channel: "google_calendar",
      status: "REQUIRES SETUP",
      label: "Google Calendar",
      details: "OAuth calendar sync required to auto-confirm bookings",
      updatedAt: new Date().toISOString(),
    },
    {
      id: "int-email",
      agentId,
      channel: "email",
      status: "NOT CONNECTED",
      label: "Inbound Email Agent",
      details: "Forward customer support emails to agent address",
      updatedAt: new Date().toISOString(),
    },
    {
      id: "int-crm",
      agentId,
      channel: "crm",
      status: "COMING SOON",
      label: "HubSpot / Salesforce CRM",
      details: "Automatic 2-way lead sync",
      updatedAt: new Date().toISOString(),
    },
    {
      id: "int-instagram",
      agentId,
      channel: "instagram",
      status: "REQUIRES SETUP",
      label: "Instagram Direct Messages",
      details: "Meta Graph API authorization required",
      updatedAt: new Date().toISOString(),
    },
    {
      id: "int-messenger",
      agentId,
      channel: "messenger",
      status: "NOT CONNECTED",
      label: "Facebook Messenger",
      details: "Page messenger webhook setup required",
      updatedAt: new Date().toISOString(),
    },
  ];
}

// 8. Public Widget Configuration Retrieval
export async function getPublicCustomerAgentConfig(agentId: string): Promise<Partial<CustomerAgentConfig> | null> {
  if (!agentId) return null;

  // 1. Check guest local storage (for owner testing link locally)
  try {
    const raw = localStorage.getItem(getLocalKey("config", agentId));
    if (raw) {
      const cfg: CustomerAgentConfig = JSON.parse(raw);
      if (cfg.enabled && cfg.publicWidgetEnabled) {
        return cfg;
      }
    }
  } catch {
    // ignore
  }

  // 2. Fetch from Firestore public_customer_agents collection
  try {
    const docRef = doc(db, "public_customer_agents", agentId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data && data.enabled) {
        return data as Partial<CustomerAgentConfig>;
      }
    }
  } catch (err) {
    console.warn("Failed to fetch public customer agent from Firestore:", err);
  }

  return null;
}

// Aliases for convenience
export const getCustomerAgentConfig = loadCustomerAgentConfig;
export const getDefaultCustomerIntegrations = loadCustomerIntegrations;
export const loadGuestCustomerIntegrations = loadCustomerIntegrations;
export function subscribeToCustomerIntegrations(
  _userId: string,
  agentId: string,
  onUpdate: (items: CustomerIntegrationConfig[]) => void
): () => void {
  onUpdate(loadCustomerIntegrations(agentId));
  return () => {};
}
export async function saveCustomerIntegration(
  integration: CustomerIntegrationConfig,
  _user: User | null
): Promise<CustomerIntegrationConfig> {
  return integration;
}

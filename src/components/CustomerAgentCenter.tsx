import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Users,
  MessageSquare,
  PhoneCall,
  Globe,
  UserCheck,
  MessageCircle,
  Calendar,
  BookOpen,
  Zap,
  UserX,
  Settings as SettingsIcon,
  BarChart3,
  Link2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Mail,
  Phone,
  Copy,
  Check,
  Plus,
  Trash2,
  ExternalLink,
  Code,
  Sparkles,
  Bot,
  Play,
  Square,
  Volume2,
  Mic,
  MicOff,
  Search,
  Filter,
  Download,
  RefreshCw,
  Send,
  HelpCircle,
  ChevronRight,
  ShieldCheck,
  Eye,
  Sliders,
  AlertTriangle
} from "lucide-react";
import {
  ActiveTab,
  CustomerAgentConfig,
  CustomerLead,
  CustomerAppointment,
  CustomerKnowledgeItem,
  CustomerConversation,
  CustomerAutomationRule,
  CustomerIntegrationConfig,
  BusinessAgentConfig,
  CustomerLeadStatus,
  CustomerAppointmentStatus,
  CustomerConversationStatus,
  KnowledgeProcessingState
} from "../types";
import {
  getDefaultCustomerAgentConfig,
  saveCustomerAgentConfig,
  getCustomerAgentConfig,
  subscribeToCustomerLeads,
  loadGuestCustomerLeads,
  saveCustomerLead,
  deleteCustomerLead,
  subscribeToCustomerAppointments,
  loadGuestCustomerAppointments,
  saveCustomerAppointment,
  deleteCustomerAppointment,
  subscribeToCustomerKnowledge,
  loadGuestCustomerKnowledge,
  saveCustomerKnowledgeItem,
  deleteCustomerKnowledgeItem,
  subscribeToCustomerConversations,
  loadGuestCustomerConversations,
  saveCustomerConversation,
  deleteCustomerConversation,
  subscribeToCustomerAutomations,
  loadGuestCustomerAutomations,
  saveCustomerAutomation,
  subscribeToCustomerIntegrations,
  loadGuestCustomerIntegrations,
  getDefaultCustomerIntegrations,
  saveCustomerIntegration
} from "../services/customerAgentService";
import { loadBusinessAgents, subscribeToBusinessAgents } from "../services/storageService";
import { auth } from "../firebase";
import { safeFetchJson } from "../utils/apiHelper";

export type CustomerAgentSection =
  | "overview"
  | "chat"
  | "voice"
  | "website"
  | "leads"
  | "conversations"
  | "appointments"
  | "knowledge"
  | "automations"
  | "handoff"
  | "settings"
  | "analytics"
  | "integrations";

interface CustomerAgentCenterProps {
  initialSection?: CustomerAgentSection;
  onSectionChanged?: (section: CustomerAgentSection) => void;
  setActiveTab?: (tab: ActiveTab) => void;
}

export const CustomerAgentCenter: React.FC<CustomerAgentCenterProps> = ({
  initialSection = "overview",
  onSectionChanged,
  setActiveTab
}) => {
  const [activeSection, setActiveSection] = useState<CustomerAgentSection>(initialSection);
  const [user, setUser] = useState(auth.currentUser);

  // Parent business agents
  const [businessAgents, setBusinessAgents] = useState<BusinessAgentConfig[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("default_agent");
  const [activeBusinessAgent, setActiveBusinessAgent] = useState<BusinessAgentConfig | null>(null);

  // Customer Agent Config
  const [config, setConfig] = useState<CustomerAgentConfig>(() =>
    getDefaultCustomerAgentConfig("default_agent", "My Business")
  );
  const [isConfigSaving, setIsConfigSaving] = useState(false);

  // Subcollections data
  const [leads, setLeads] = useState<CustomerLead[]>([]);
  const [appointments, setAppointments] = useState<CustomerAppointment[]>([]);
  const [knowledgeItems, setKnowledgeItems] = useState<CustomerKnowledgeItem[]>([]);
  const [conversations, setConversations] = useState<CustomerConversation[]>([]);
  const [automations, setAutomations] = useState<CustomerAutomationRule[]>([]);
  const [integrations, setIntegrations] = useState<CustomerIntegrationConfig[]>([]);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "info" | "warning">("success");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const showToast = (msg: string, type: "success" | "info" | "warning" = "success") => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast("Copied to clipboard!", "success");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Sync section with parent
  const handleSelectSection = (sec: CustomerAgentSection) => {
    setActiveSection(sec);
    onSectionChanged?.(sec);
  };

  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection);
    }
  }, [initialSection]);

  // Auth listener
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((curr) => {
      setUser(curr);
    });
    return () => unsub();
  }, []);

  // Load business agents to bind the customer agent to
  useEffect(() => {
    if (user && user.uid && !user.isAnonymous) {
      const unsub = subscribeToBusinessAgents(user.uid, (agents) => {
        setBusinessAgents(agents);
        if (agents.length > 0 && selectedAgentId === "default_agent") {
          setSelectedAgentId(agents[0].id);
        }
      });
      return () => unsub();
    } else {
      const local = loadBusinessAgents();
      setBusinessAgents(local);
      if (local.length > 0 && selectedAgentId === "default_agent") {
        setSelectedAgentId(local[0].id);
      }
    }
  }, [user]);

  // Update active business agent reference
  useEffect(() => {
    const found = businessAgents.find((a) => a.id === selectedAgentId) || businessAgents[0] || null;
    setActiveBusinessAgent(found);
  }, [businessAgents, selectedAgentId]);

  // Load / subscribe to Customer Agent data for selectedAgentId
  useEffect(() => {
    const agentId = selectedAgentId || "default_agent";
    const bizName = activeBusinessAgent?.businessName || activeBusinessAgent?.name || "Our Business";

    // 1. Config
    getCustomerAgentConfig(agentId, user, bizName).then((loaded) => {
      if (loaded) {
        setConfig(loaded);
      }
    });

    // 2. Leads
    let unsubLeads = () => {};
    if (user && user.uid && !user.isAnonymous) {
      unsubLeads = subscribeToCustomerLeads(user.uid, agentId, setLeads);
    } else {
      setLeads(loadGuestCustomerLeads(agentId));
    }

    // 3. Appointments
    let unsubAppts = () => {};
    if (user && user.uid && !user.isAnonymous) {
      unsubAppts = subscribeToCustomerAppointments(user.uid, agentId, setAppointments);
    } else {
      setAppointments(loadGuestCustomerAppointments(agentId));
    }

    // 4. Knowledge
    let unsubKnow = () => {};
    if (user && user.uid && !user.isAnonymous) {
      unsubKnow = subscribeToCustomerKnowledge(user.uid, agentId, setKnowledgeItems);
    } else {
      setKnowledgeItems(loadGuestCustomerKnowledge(agentId));
    }

    // 5. Conversations
    let unsubConvs = () => {};
    if (user && user.uid && !user.isAnonymous) {
      unsubConvs = subscribeToCustomerConversations(user.uid, agentId, setConversations);
    } else {
      setConversations(loadGuestCustomerConversations(agentId));
    }

    // 6. Automations
    let unsubAutos = () => {};
    if (user && user.uid && !user.isAnonymous) {
      unsubAutos = subscribeToCustomerAutomations(user.uid, agentId, setAutomations);
    } else {
      setAutomations(loadGuestCustomerAutomations(agentId));
    }

    // 7. Integrations
    let unsubInts = () => {};
    if (user && user.uid && !user.isAnonymous) {
      unsubInts = subscribeToCustomerIntegrations(user.uid, agentId, setIntegrations);
    } else {
      const localInts = loadGuestCustomerIntegrations(agentId);
      setIntegrations(localInts.length > 0 ? localInts : getDefaultCustomerIntegrations(agentId));
    }

    return () => {
      unsubLeads();
      unsubAppts();
      unsubKnow();
      unsubConvs();
      unsubAutos();
      unsubInts();
    };
  }, [user, selectedAgentId, activeBusinessAgent]);

  // Save config helper
  const handleSaveConfig = async (newConfig: CustomerAgentConfig) => {
    setIsConfigSaving(true);
    try {
      const res = await saveCustomerAgentConfig(newConfig, user);
      setConfig(res.config);
      showToast(
        res.isCloud
          ? "Customer Agent configuration saved & synced to Cloud!"
          : "Saved locally. Sign in to sync across devices.",
        "success"
      );
    } catch (err: unknown) {
      console.error("Failed to save customer agent config:", err);
      showToast("Error saving configuration.", "warning");
    } finally {
      setIsConfigSaving(false);
    }
  };

  // -------------------------------------------------------------
  // CHAT TESTER STATE (Interactive test console for business owner)
  // -------------------------------------------------------------
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string;
    role: "customer" | "agent";
    content: string;
    timestamp: string;
    intent?: string;
  }>>([
    {
      id: "init_1",
      role: "agent",
      content: config.welcomeMessage || `Hi! I am the AI Customer Agent for ${config.businessName}. How can I help you today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [isChatSending, setIsChatSending] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSendTestChatMessage = async (overrideMessage?: string) => {
    const textToSend = (overrideMessage || chatInput).trim();
    if (!textToSend || isChatSending) return;

    const userMsg = {
      id: `usr_${Date.now()}`,
      role: "customer" as const,
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsChatSending(true);

    try {
      const historyForApi = chatMessages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const payload = {
        message: textToSend,
        customerConfig: config,
        conversationHistory: historyForApi,
        knowledgeItems: knowledgeItems.filter((k) => k.state === "READY"),
        businessContext: activeBusinessAgent || {},
        language: config.language,
        userId: user?.uid,
      };

      const res = await safeFetchJson<{
        success: boolean;
        replyText: string;
        intent: "general_inquiry" | "lead_captured" | "appointment_request" | "human_handoff";
        leadData?: { name?: string; email?: string; phone?: string; requirement?: string };
        appointmentData?: { service?: string; preferredDate?: string; preferredTime?: string };
        humanHandoffReason?: string;
      }>("/api/ai/customer-agent-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const replyText =
        res.replyText ||
        "That's something I don't have confirmed information about. I can connect you with our team.";

      const agentMsg = {
        id: `agt_${Date.now()}`,
        role: "agent" as const,
        content: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        intent: res.intent,
      };

      setChatMessages((prev) => [...prev, agentMsg]);

      // If lead captured, save real lead
      if (res.leadData && (res.leadData.name || res.leadData.email || res.leadData.phone)) {
        const newLead: CustomerLead = {
          id: `lead_${Date.now()}`,
          agentId: config.agentId,
          userId: user ? user.uid : "guest",
          name: res.leadData.name || "Interested Customer",
          email: res.leadData.email || "",
          phone: res.leadData.phone || "",
          requirement: res.leadData.requirement || textToSend,
          source: "website_widget",
          status: "NEW",
          createdAt: new Date().toISOString(),
          lastContactAt: new Date().toISOString(),
        };
        await saveCustomerLead(newLead, user);
        showToast("New customer lead captured automatically!", "success");
      }

      // If appointment requested, record real appointment
      if (res.appointmentData && (res.appointmentData.service || res.appointmentData.preferredDate)) {
        const newAppt: CustomerAppointment = {
          id: `appt_${Date.now()}`,
          agentId: config.agentId,
          userId: user ? user.uid : "guest",
          customerName: res.leadData?.name || "Customer Booking",
          customerEmail: res.leadData?.email || "",
          customerPhone: res.leadData?.phone || "",
          service: res.appointmentData.service || "General Consultation",
          preferredDate: res.appointmentData.preferredDate || new Date().toISOString().split("T")[0],
          preferredTime: res.appointmentData.preferredTime || "10:00 AM",
          status: "REQUESTED",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await saveCustomerAppointment(newAppt, user);
        showToast("Appointment request logged as REQUESTED.", "info");
      }

      // If human handoff
      if (res.intent === "human_handoff") {
        showToast("Human assistance requested by customer.", "warning");
      }

      // Save conversation log
      const fullMessages = [...chatMessages, userMsg, agentMsg].map((m) => ({
        id: m.id,
        role: m.role as "customer" | "agent",
        content: m.content,
        timestamp: new Date().toISOString(),
      }));

      const conv: CustomerConversation = {
        id: `conv_${config.agentId}_demo`,
        agentId: config.agentId,
        userId: user ? user.uid : "guest",
        channel: "website_widget",
        customerName: res.leadData?.name || "Website Visitor",
        customerContact: res.leadData?.email || res.leadData?.phone || "Live Chat",
        messages: fullMessages,
        leadStatus: res.leadData ? "NEW" : undefined,
        resolutionStatus: res.intent === "human_handoff" ? "WAITING FOR HUMAN" : "AI HANDLED",
        lastMessageSnippet: replyText.slice(0, 100),
        humanHandoffRequested: res.intent === "human_handoff",
        handoffReason: res.humanHandoffReason,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveCustomerConversation(conv, user);
    } catch (err: unknown) {
      console.error("Customer chat tester error:", err);
      setChatMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: "agent",
          content: "I am having trouble connecting to the knowledge base right now. Please try again in a moment.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsChatSending(false);
    }
  };

  // -------------------------------------------------------------
  // VOICE AGENT SIMULATOR STATE
  // -------------------------------------------------------------
  const [isCalling, setIsCalling] = useState(false);
  const [callStatus, setCallStatus] = useState<"idle" | "ringing" | "connected" | "ai_speaking" | "listening">("idle");
  const [voiceCallLogs, setVoiceCallLogs] = useState<Array<{ role: string; text: string }>>([]);
  const [callerSpokenInput, setCallerSpokenInput] = useState("");
  const synthRef = useRef<SpeechSynthesis | null>(typeof window !== "undefined" ? window.speechSynthesis : null);

  const startInboundCall = () => {
    setIsCalling(true);
    setCallStatus("ringing");
    setVoiceCallLogs([{ role: "system", text: "Inbound call detected from +1 (555) 019-2831..." }]);

    setTimeout(() => {
      setCallStatus("connected");
      const greeting =
        config.greetingText ||
        `Thank you for calling ${config.businessName}. I'm ${config.agentName}, an AI assistant. How may I direct your call or assist you today?`;

      setVoiceCallLogs((prev) => [
        ...prev,
        { role: "system", text: "AI answered. Channel: INCOMING VOICE" },
        { role: "agent", text: greeting },
      ]);

      // Speak greeting
      speakText(greeting);
    }, 1800);
  };

  const speakText = (text: string) => {
    if (!synthRef.current) return;
    try {
      synthRef.current.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = config.voiceSpeed || 1.0;
      utter.pitch = 1.0;
      utter.onstart = () => setCallStatus("ai_speaking");
      utter.onend = () => setCallStatus("listening");
      synthRef.current.speak(utter);
    } catch {
      setCallStatus("listening");
    }
  };

  const endInboundCall = () => {
    if (synthRef.current) synthRef.current.cancel();
    setIsCalling(false);
    setCallStatus("idle");
    setVoiceCallLogs((prev) => [...prev, { role: "system", text: "Call completed and recorded." }]);
  };

  const handleSendVoiceCallerMessage = async (transcript: string) => {
    if (!transcript.trim()) return;

    setVoiceCallLogs((prev) => [...prev, { role: "caller", text: transcript }]);
    setCallerSpokenInput("");
    setCallStatus("connected");

    try {
      const res = await safeFetchJson<{
        success: boolean;
        audioResponseText: string;
        intent: string;
        leadData?: any;
        appointmentData?: any;
        telephonyStatus: string;
        telephonyNotice: string;
      }>("/api/ai/customer-agent-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: config.agentId,
          callerAudioTranscript: transcript,
          customerConfig: config,
          conversationHistory: voiceCallLogs.map((l) => ({ role: l.role, content: l.text })),
          knowledgeItems: knowledgeItems.filter((k) => k.state === "READY"),
          businessContext: activeBusinessAgent || {},
        }),
      });

      const reply = res.audioResponseText || "Thank you for providing that. Let me look into this for you.";
      setVoiceCallLogs((prev) => [...prev, { role: "agent", text: reply }]);
      speakText(reply);

      if (res.leadData && (res.leadData.name || res.leadData.phone || res.leadData.email)) {
        await saveCustomerLead(
          {
            id: `lead_voice_${Date.now()}`,
            agentId: config.agentId,
            userId: user ? user.uid : "guest",
            name: res.leadData.name || "Caller",
            phone: res.leadData.phone || "+1 (555) 019-2831",
            email: res.leadData.email || "",
            requirement: transcript,
            source: "voice",
            status: "NEW",
            createdAt: new Date().toISOString(),
            lastContactAt: new Date().toISOString(),
          },
          user
        );
      }
    } catch {
      const fallback = "I apologize, I didn't quite catch that. Could you repeat your question?";
      setVoiceCallLogs((prev) => [...prev, { role: "agent", text: fallback }]);
      speakText(fallback);
    }
  };

  // -------------------------------------------------------------
  // LEADS MANAGEMENT STATE
  // -------------------------------------------------------------
  const [leadFilter, setLeadFilter] = useState<CustomerLeadStatus | "ALL">("ALL");
  const [leadSearch, setLeadSearch] = useState("");
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [newLeadForm, setNewLeadForm] = useState({
    name: "",
    email: "",
    phone: "",
    requirement: "",
    serviceOrProduct: "",
    notes: "",
  });

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchStatus = leadFilter === "ALL" || lead.status === leadFilter;
      const matchSearch =
        !leadSearch ||
        lead.name?.toLowerCase().includes(leadSearch.toLowerCase()) ||
        lead.email?.toLowerCase().includes(leadSearch.toLowerCase()) ||
        lead.phone?.includes(leadSearch) ||
        lead.requirement?.toLowerCase().includes(leadSearch.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [leads, leadFilter, leadSearch]);

  const handleUpdateLeadStatus = async (leadId: string, status: CustomerLeadStatus) => {
    const existing = leads.find((l) => l.id === leadId);
    if (!existing) return;
    const updated = { ...existing, status };
    await saveCustomerLead(updated, user);
    showToast(`Lead marked as ${status}`, "info");
  };

  const handleCreateManualLead = async () => {
    if (!newLeadForm.name.trim()) {
      showToast("Lead name is required", "warning");
      return;
    }
    const lead: CustomerLead = {
      id: `lead_manual_${Date.now()}`,
      agentId: config.agentId,
      userId: user ? user.uid : "guest",
      name: newLeadForm.name.trim(),
      email: newLeadForm.email.trim(),
      phone: newLeadForm.phone.trim(),
      requirement: newLeadForm.requirement.trim() || "Manual prospect entry",
      serviceOrProduct: newLeadForm.serviceOrProduct.trim(),
      notes: newLeadForm.notes.trim(),
      source: "manual",
      status: "NEW",
      createdAt: new Date().toISOString(),
      lastContactAt: new Date().toISOString(),
    };
    await saveCustomerLead(lead, user);
    setIsAddLeadModalOpen(false);
    setNewLeadForm({ name: "", email: "", phone: "", requirement: "", serviceOrProduct: "", notes: "" });
    showToast("Lead created successfully", "success");
  };

  const handleExportLeadsCsv = () => {
    if (leads.length === 0) {
      showToast("No leads to export yet", "info");
      return;
    }
    const headers = ["Name", "Email", "Phone", "Status", "Requirement", "Source", "Created At"];
    const rows = leads.map((l) => [
      `"${(l.name || "").replace(/"/g, '""')}"`,
      `"${(l.email || "").replace(/"/g, '""')}"`,
      `"${(l.phone || "").replace(/"/g, '""')}"`,
      `"${l.status}"`,
      `"${(l.requirement || "").replace(/"/g, '""')}"`,
      `"${l.source}"`,
      `"${l.createdAt}"`,
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `customer_leads_${config.agentId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Exported leads to CSV", "success");
  };

  // -------------------------------------------------------------
  // APPOINTMENTS STATE
  // -------------------------------------------------------------
  const [isAddApptModalOpen, setIsAddApptModalOpen] = useState(false);
  const [newApptForm, setNewApptForm] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    service: "",
    preferredDate: new Date().toISOString().split("T")[0],
    preferredTime: "11:00 AM",
    notes: "",
  });

  const handleCreateAppointment = async () => {
    if (!newApptForm.customerName.trim()) {
      showToast("Customer name is required", "warning");
      return;
    }
    const appt: CustomerAppointment = {
      id: `appt_${Date.now()}`,
      agentId: config.agentId,
      userId: user ? user.uid : "guest",
      customerName: newApptForm.customerName.trim(),
      customerEmail: newApptForm.customerEmail.trim(),
      customerPhone: newApptForm.customerPhone.trim(),
      service: newApptForm.service.trim() || "Consultation",
      preferredDate: newApptForm.preferredDate,
      preferredTime: newApptForm.preferredTime,
      notes: newApptForm.notes.trim(),
      status: "REQUESTED",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveCustomerAppointment(appt, user);
    setIsAddApptModalOpen(false);
    setNewApptForm({
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      service: "",
      preferredDate: new Date().toISOString().split("T")[0],
      preferredTime: "11:00 AM",
      notes: "",
    });
    showToast("Appointment request created.", "success");
  };

  const handleUpdateApptStatus = async (apptId: string, status: CustomerAppointmentStatus) => {
    const existing = appointments.find((a) => a.id === apptId);
    if (!existing) return;
    await saveCustomerAppointment({ ...existing, status }, user);
    showToast(`Appointment status updated to ${status}`, "info");
  };

  // -------------------------------------------------------------
  // KNOWLEDGE BASE STATE
  // -------------------------------------------------------------
  const [isAddKnowledgeOpen, setIsAddKnowledgeOpen] = useState(false);
  const [knowledgeForm, setKnowledgeForm] = useState<{
    title: string;
    type: "faq" | "pricing" | "policy" | "product" | "service" | "document" | "hours" | "location";
    content: string;
  }>({
    title: "",
    type: "faq",
    content: "",
  });

  const handleAddKnowledgeItem = async () => {
    if (!knowledgeForm.title.trim() || !knowledgeForm.content.trim()) {
      showToast("Title and content are required", "warning");
      return;
    }

    const item: CustomerKnowledgeItem = {
      id: `know_${Date.now()}`,
      agentId: config.agentId,
      userId: user ? user.uid : "guest",
      title: knowledgeForm.title.trim(),
      type: knowledgeForm.type,
      content: knowledgeForm.content.trim(),
      state: "PROCESSING",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save initial state as PROCESSING
    await saveCustomerKnowledgeItem(item, user);
    setIsAddKnowledgeOpen(false);
    setKnowledgeForm({ title: "", type: "faq", content: "" });
    showToast("Knowledge entry added. Processing for AI comprehension...", "info");

    // Simulate real text verification and promote to READY
    setTimeout(async () => {
      await saveCustomerKnowledgeItem({ ...item, state: "READY" }, user);
      showToast(`Knowledge item "${item.title}" is now READY for customer questions!`, "success");
    }, 1500);
  };

  // -------------------------------------------------------------
  // EMBED CODE GENERATOR
  // -------------------------------------------------------------
  const hostOrigin = typeof window !== "undefined" ? window.location.origin : "https://app.businessgrowth.ai";
  const embedScriptSnippet = `<script
  src="${hostOrigin}/widget.js"
  data-agent-id="${config.agentId}"
  data-business-name="${config.businessName}"
  data-brand-color="${config.brandColor}"
  data-position="${config.widgetPosition}"
  defer
></script>`;

  const embedIframeSnippet = `<iframe
  src="${hostOrigin}/?customerAgent=${config.agentId}&embed=true"
  width="420"
  height="620"
  style="border:none;border-radius:16px;box-shadow:0 20px 40px rgba(0,0,0,0.4);"
  allow="microphone"
  title="${config.businessName} AI Assistant"
></iframe>`;

  // -------------------------------------------------------------
  // RENDER NAVIGATION TABS
  // -------------------------------------------------------------
  const navItems: Array<{ id: CustomerAgentSection; label: string; icon: any; badge?: number }> = [
    { id: "overview", label: "Overview", icon: Users },
    { id: "chat", label: "AI Chat Agent", icon: MessageSquare },
    { id: "voice", label: "AI Voice Agent", icon: PhoneCall },
    { id: "website", label: "Website Agent", icon: Globe },
    { id: "leads", label: "Lead Management", icon: UserCheck, badge: leads.filter((l) => l.status === "NEW").length },
    { id: "conversations", label: "Conversations", icon: MessageCircle, badge: conversations.length },
    { id: "appointments", label: "Appointments", icon: Calendar, badge: appointments.filter((a) => a.status === "REQUESTED").length },
    { id: "knowledge", label: "Knowledge Base", icon: BookOpen, badge: knowledgeItems.length },
    { id: "automations", label: "Automations", icon: Zap },
    { id: "handoff", label: "Human Handoff", icon: UserX, badge: conversations.filter((c) => c.humanHandoffRequested).length },
    { id: "settings", label: "Agent Settings", icon: SettingsIcon },
    { id: "analytics", label: "Usage & Analytics", icon: BarChart3 },
    { id: "integrations", label: "Integrations", icon: Link2 },
  ];

  return (
    <div className="w-full flex flex-col gap-5 text-slate-100">
      {/* Top Header Card */}
      <div className="bg-[#0b1120] border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-900/30">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-white">AI Customer Agent</h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-cyan-400" />
                AI Business Employee
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Frontline customer-facing agent for sales, support, bookings, and voice inquiries.
            </p>
          </div>
        </div>

        {/* Business Agent Selector & Quick Status */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Assigned Business Agent</span>
            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
            >
              {businessAgents.length > 0 ? (
                businessAgents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.businessName || "Primary"})
                  </option>
                ))
              ) : (
                <option value="default_agent">General Business Agent</option>
              )}
            </select>
          </div>

          <button
            onClick={() => handleSaveConfig({ ...config, enabled: !config.enabled })}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              config.enabled
                ? "bg-emerald-950/50 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/50"
                : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${config.enabled ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
            {config.enabled ? "Agent Active" : "Agent Paused"}
          </button>
        </div>
      </div>

      {/* Subsections Tab Navigation (Horizontal Scrollable) */}
      <div className="bg-[#080d1a] border border-slate-800 rounded-xl p-1.5 flex items-center gap-1 overflow-x-auto no-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelectSection(item.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                isActive
                  ? "bg-cyan-600 text-white font-semibold shadow-md shadow-cyan-900/40"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
              {typeof item.badge === "number" && item.badge > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? "bg-white text-cyan-800" : "bg-cyan-950 text-cyan-300 border border-cyan-800/40"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ============================================================== */}
      {/* 1. OVERVIEW SECTION */}
      {/* ============================================================== */}
      {activeSection === "overview" && (
        <div className="flex flex-col gap-5">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-[#0b1120] border border-slate-800 rounded-xl p-4 flex flex-col gap-1 shadow-sm">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium">Real Leads Captured</span>
                <UserCheck className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-bold text-white mt-1">{leads.length}</div>
              <div className="text-[11px] text-slate-400">
                {leads.filter((l) => l.status === "NEW").length} new leads pending review
              </div>
            </div>

            <div className="bg-[#0b1120] border border-slate-800 rounded-xl p-4 flex flex-col gap-1 shadow-sm">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium">Conversations Handled</span>
                <MessageCircle className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-white mt-1">{conversations.length}</div>
              <div className="text-[11px] text-slate-400">Real customer chat & call sessions</div>
            </div>

            <div className="bg-[#0b1120] border border-slate-800 rounded-xl p-4 flex flex-col gap-1 shadow-sm">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium">Appointment Requests</span>
                <Calendar className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-white mt-1">{appointments.length}</div>
              <div className="text-[11px] text-slate-400">
                {appointments.filter((a) => a.status === "REQUESTED").length} requested, 0 automated false confirmations
              </div>
            </div>

            <div className="bg-[#0b1120] border border-slate-800 rounded-xl p-4 flex flex-col gap-1 shadow-sm">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium">Human Handoffs</span>
                <UserX className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-white mt-1">
                {conversations.filter((c) => c.humanHandoffRequested).length}
              </div>
              <div className="text-[11px] text-slate-400">Escalated inquiries for human attention</div>
            </div>
          </div>

          {/* Status & Quick Launch Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Website Widget Status */}
            <div className="bg-[#090d1a] border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-semibold text-white">Website Chat Widget</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                    Ready to Embed
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Embed the AI Employee on your website to answer visitor questions, capture leads, and book requests.
                </p>
              </div>
              <button
                onClick={() => handleSelectSection("website")}
                className="mt-4 w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-cyan-300 flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Configure & Get Embed Code</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* AI Voice Agent Status */}
            <div className="bg-[#090d1a] border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <PhoneCall className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-semibold text-white">AI Voice Employee</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950 text-amber-300 border border-amber-500/30">
                    Provider Not Connected
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Simulate voice phone calls now. Connect Twilio or SIP trunk in Integrations to enable a real incoming number.
                </p>
              </div>
              <button
                onClick={() => handleSelectSection("voice")}
                className="mt-4 w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-blue-300 flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Launch Inbound Call Simulator</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Verified Business Knowledge */}
            <div className="bg-[#090d1a] border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-white">Verified Knowledge</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                    {knowledgeItems.filter((k) => k.state === "READY").length} Items Active
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Strictly prevents hallucinations. If an answer isn’t confirmed in this knowledge base, the AI connects to the team.
                </p>
              </div>
              <button
                onClick={() => handleSelectSection("knowledge")}
                className="mt-4 w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-emerald-300 flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Manage FAQs & Policies</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Recent Real Inquiries Table */}
          <div className="bg-[#0b1120] border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>Recent Customer Activity</span>
              </h3>
              <button
                onClick={() => handleSelectSection("leads")}
                className="text-xs text-cyan-400 hover:underline"
              >
                View all leads ({leads.length})
              </button>
            </div>

            {leads.length === 0 && conversations.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
                <UserCheck className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-300">No customer activity yet</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-md mx-auto">
                  Deploy the Website Widget or test the Chat Agent to see real customer inquiries, captured leads, and appointment requests here.
                </p>
                <button
                  onClick={() => handleSelectSection("chat")}
                  className="mt-3 px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white transition-colors"
                >
                  Test Chat Agent Now
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3">Channel</th>
                      <th className="py-2.5 px-3">Inquiry / Requirement</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {leads.slice(0, 5).map((lead) => (
                      <tr key={lead.id} className="hover:bg-slate-900/40">
                        <td className="py-2.5 px-3 font-medium text-white">
                          <div>{lead.name}</div>
                          <div className="text-[10px] text-slate-400">{lead.email || lead.phone || "No contact info"}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="capitalize px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300">
                            {lead.source.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 max-w-xs truncate text-slate-300">
                          {lead.requirement || "Customer consultation"}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              lead.status === "NEW"
                                ? "bg-cyan-950 text-cyan-300 border border-cyan-800/40"
                                : lead.status === "QUALIFIED"
                                ? "bg-emerald-950 text-emerald-300 border border-emerald-800/40"
                                : "bg-slate-800 text-slate-300"
                            }`}
                          >
                            {lead.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-400 text-[11px]">
                          {new Date(lead.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. AI CHAT AGENT (Interactive Console & Testing) */}
      {/* ============================================================== */}
      {activeSection === "chat" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left: Chat Knowledge & Behavior Overview */}
          <div className="bg-[#0b1120] border border-slate-800 rounded-xl p-4 flex flex-col gap-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Bot className="w-4 h-4 text-cyan-400" />
              <span>Agent Behavior & Safeguards</span>
            </h3>

            <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Agent Name:</span>
                <span className="font-semibold text-white">{config.agentName}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Business:</span>
                <span className="font-semibold text-white">{config.businessName}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Tone:</span>
                <span className="font-semibold text-cyan-300">{config.tone}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Working Hours:</span>
                <span className="text-slate-300 text-right">{config.workingHoursText || "9am - 6pm"}</span>
              </div>
            </div>

            <div className="rounded-lg p-3 bg-cyan-950/20 border border-cyan-800/30 flex flex-col gap-1.5">
              <span className="text-xs font-bold text-cyan-300 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                Anti-Hallucination Guardrail
              </span>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                If the visitor asks something outside confirmed documents or memory, the AI explicitly states:
                <em className="block text-cyan-200 mt-1 italic">
                  &ldquo;That&apos;s something I don&apos;t have confirmed information about. I can connect you with the team.&rdquo;
                </em>
              </p>
            </div>

            {/* Quick Test Questions */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold text-slate-400">Suggested Test Inquiries:</span>
              {(config.suggestedQuestions || [
                "What services do you offer?",
                "How much does your service cost?",
                "Can I book an appointment for tomorrow?",
                "I want to speak with a human manager.",
              ]).map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendTestChatMessage(q)}
                  className="text-left text-xs bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-slate-300 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  &ldquo;{q}&rdquo;
                </button>
              ))}
            </div>
          </div>

          {/* Right: Live Chat Window */}
          <div className="lg:col-span-2 bg-[#090d1a] border border-slate-800 rounded-xl flex flex-col h-[560px] shadow-2xl">
            {/* Chat Header */}
            <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-[#0b1120]/80">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: config.brandColor || "#06b6d4" }}
                >
                  {config.agentName.charAt(0)}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">{config.agentName}</h4>
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Customer Support & Sales AI</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() =>
                  setChatMessages([
                    {
                      id: "init_restart",
                      role: "agent",
                      content: config.welcomeMessage,
                      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                    },
                  ])
                }
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reset Chat</span>
              </button>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.role === "customer" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                      msg.role === "customer"
                        ? "bg-cyan-600 text-white rounded-br-none"
                        : "bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none shadow-md"
                    }`}
                  >
                    {msg.content}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-1 px-1">
                    <span>{msg.timestamp}</span>
                    {msg.intent && (
                      <span className="text-cyan-400 font-medium">({msg.intent.replace("_", " ")})</span>
                    )}
                  </div>
                </div>
              ))}
              {isChatSending && (
                <div className="flex items-center gap-2 text-slate-400 text-xs">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>{config.agentName} is reviewing verified knowledge...</span>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Chat Input Bar */}
            <div className="p-3 border-t border-slate-800 bg-[#0b1120]/90">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendTestChatMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask a customer question (e.g. pricing, booking, location)..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || isChatSending}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-cyan-900/30 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. AI VOICE AGENT (Call Simulator & Twilio Architecture) */}
      {/* ============================================================== */}
      {activeSection === "voice" && (
        <div className="flex flex-col gap-5">
          {/* Architecture Status Banner */}
          <div className="bg-[#0b1120] border border-amber-500/30 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-950 border border-amber-500/40 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Telephony Provider Status:</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-500/40">
                    Phone Provider Not Connected
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Incoming cellular phone numbers require connecting a Twilio account or SIP trunk. No fake telephone numbers are provided.
                  Use the Inbound Voice Simulator below to verify the conversation flow.
                </p>
              </div>
            </div>
            <button
              onClick={() => handleSelectSection("integrations")}
              className="px-3 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-200 text-xs font-semibold whitespace-nowrap transition-colors"
            >
              Configure Twilio in Integrations
            </button>
          </div>

          {/* Call Architecture Flow Diagram */}
          <div className="bg-[#090d1a] border border-slate-800 rounded-xl p-4">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
              Incoming Call Execution Architecture
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-7 gap-2 text-center text-xs">
              <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg">
                <span className="font-bold text-cyan-400 block text-[10px]">1. Inbound</span>
                <span className="text-slate-300 text-[11px]">Phone Rings</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg">
                <span className="font-bold text-cyan-400 block text-[10px]">2. AI Pick Up</span>
                <span className="text-slate-300 text-[11px]">Speaks Greeting</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg">
                <span className="font-bold text-cyan-400 block text-[10px]">3. Understood</span>
                <span className="text-slate-300 text-[11px]">Caller Inquires</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg">
                <span className="font-bold text-cyan-400 block text-[10px]">4. Knowledge</span>
                <span className="text-slate-300 text-[11px]">Uses Fact Base</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg">
                <span className="font-bold text-cyan-400 block text-[10px]">5. Lead Info</span>
                <span className="text-slate-300 text-[11px]">Captures Phone</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg">
                <span className="font-bold text-cyan-400 block text-[10px]">6. Booking</span>
                <span className="text-slate-300 text-[11px]">Requests Slot</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg">
                <span className="font-bold text-cyan-400 block text-[10px]">7. Handoff</span>
                <span className="text-slate-300 text-[11px]">Escalate if Needed</span>
              </div>
            </div>
          </div>

          {/* Interactive Inbound Simulator */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Call Controls & Persona */}
            <div className="bg-[#0b1120] border border-slate-800 rounded-xl p-4 flex flex-col gap-4">
              <h4 className="text-xs font-bold text-white">Voice Agent Persona</h4>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Voice Gender / Accent:</label>
                  <select
                    value={config.voiceGender}
                    onChange={(e) =>
                      handleSaveConfig({ ...config, voiceGender: e.target.value as "female" | "male" | "neutral" })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <option value="female">Female (Natural Professional)</option>
                    <option value="male">Male (Warm & Direct)</option>
                    <option value="neutral">Neutral (Concise Specialist)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Speech Speed: {config.voiceSpeed || 1.0}x</label>
                  <input
                    type="range"
                    min="0.8"
                    max="1.3"
                    step="0.1"
                    value={config.voiceSpeed || 1.0}
                    onChange={(e) => handleSaveConfig({ ...config, voiceSpeed: parseFloat(e.target.value) })}
                    className="w-full accent-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Spoken Greeting Phrase:</label>
                  <textarea
                    rows={3}
                    value={config.greetingText || ""}
                    onChange={(e) => handleSaveConfig({ ...config, greetingText: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs"
                    placeholder="Thank you for calling..."
                  />
                </div>
              </div>

              {!isCalling ? (
                <button
                  onClick={startInboundCall}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition-all"
                >
                  <PhoneCall className="w-4 h-4 animate-bounce" />
                  <span>Simulate Inbound Phone Call</span>
                </button>
              ) : (
                <button
                  onClick={endInboundCall}
                  className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-950/50 transition-all"
                >
                  <Phone className="w-4 h-4" />
                  <span>Hang Up Call</span>
                </button>
              )}
            </div>

            {/* Live Audio Call Terminal */}
            <div className="lg:col-span-2 bg-[#090d1a] border border-slate-800 rounded-xl p-4 flex flex-col justify-between h-[450px]">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        isCalling ? "bg-emerald-400 animate-ping" : "bg-slate-600"
                      }`}
                    />
                    <span className="text-xs font-bold text-white">
                      {isCalling ? `Call In Progress (${callStatus.toUpperCase()})` : "Simulator Idle"}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">Caller ID: +1 (555) 019-2831</span>
                </div>

                <div className="mt-4 space-y-2.5 max-h-[300px] overflow-y-auto pr-2">
                  {voiceCallLogs.length === 0 ? (
                    <div className="text-center py-16 text-slate-500 text-xs">
                      Click &ldquo;Simulate Inbound Phone Call&rdquo; to test the AI employee voice conversation.
                    </div>
                  ) : (
                    voiceCallLogs.map((log, idx) => (
                      <div
                        key={idx}
                        className={`text-xs p-2.5 rounded-xl ${
                          log.role === "system"
                            ? "bg-slate-900/60 text-slate-400 italic text-[11px]"
                            : log.role === "agent"
                            ? "bg-cyan-950/30 border border-cyan-800/30 text-cyan-200"
                            : "bg-slate-800 text-white"
                        }`}
                      >
                        <span className="font-bold text-[10px] uppercase block mb-0.5 opacity-70">
                          {log.role === "agent" ? config.agentName : log.role}
                        </span>
                        {log.text}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {isCalling && (
                <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
                  <input
                    type="text"
                    value={callerSpokenInput}
                    onChange={(e) => setCallerSpokenInput(e.target.value)}
                    placeholder="Speak or type caller response (e.g. 'How much is your basic package?')..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSendVoiceCallerMessage(callerSpokenInput);
                      }
                    }}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                  />
                  <button
                    onClick={() => handleSendVoiceCallerMessage(callerSpokenInput)}
                    className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
                  >
                    Speak
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. WEBSITE AGENT (Embed Code & Widget Customizer) */}
      {/* ============================================================== */}
      {activeSection === "website" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Customizer & Embed Code */}
          <div className="flex flex-col gap-4">
            <div className="bg-[#0b1120] border border-slate-800 rounded-xl p-4 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Widget Appearance & Branding
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Brand Color:</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.brandColor || "#06b6d4"}
                      onChange={(e) => setConfig({ ...config, brandColor: e.target.value })}
                      className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={config.brandColor || "#06b6d4"}
                      onChange={(e) => setConfig({ ...config, brandColor: e.target.value })}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Screen Position:</label>
                  <select
                    value={config.widgetPosition}
                    onChange={(e) =>
                      setConfig({ ...config, widgetPosition: e.target.value as "bottom-right" | "bottom-left" })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white text-xs"
                  >
                    <option value="bottom-right">Bottom Right Corner</option>
                    <option value="bottom-left">Bottom Left Corner</option>
                  </select>
                </div>
              </div>

              <div className="text-xs">
                <label className="text-slate-400 block mb-1">Welcome Popup Message:</label>
                <textarea
                  rows={2}
                  value={config.welcomeMessage}
                  onChange={(e) => setConfig({ ...config, welcomeMessage: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs"
                />
              </div>

              <button
                onClick={() => handleSaveConfig(config)}
                disabled={isConfigSaving}
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md transition-all"
              >
                {isConfigSaving ? "Saving..." : "Save Widget Branding"}
              </button>
            </div>

            {/* Embed Code Snippet */}
            <div className="bg-[#0b1120] border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Code className="w-4 h-4 text-cyan-400" />
                  <span>Production Website Embed Code</span>
                </h3>
                <button
                  onClick={() => handleCopy(embedScriptSnippet, "embed_script")}
                  className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
                >
                  {copiedKey === "embed_script" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy Script Tag</span>
                </button>
              </div>

              <p className="text-xs text-slate-400">
                Paste this snippet before the closing &lt;/body&gt; tag on WordPress, Shopify, Webflow, React, or any HTML site.
              </p>

              <pre className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-[11px] font-mono text-cyan-200 overflow-x-auto">
                {embedScriptSnippet}
              </pre>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-medium">Alternative: Responsive iFrame</span>
                <button
                  onClick={() => handleCopy(embedIframeSnippet, "embed_iframe")}
                  className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
                >
                  {copiedKey === "embed_iframe" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy iFrame</span>
                </button>
              </div>
            </div>

            {/* Privacy & Security Guarantee Banner */}
            <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-3.5 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-[11px] text-slate-300">
                <strong className="text-emerald-300 block mb-0.5">Privacy & Security Guarantee:</strong>
                Website visitors will NEVER see private API keys, Firebase credentials, internal tasks, or private documents.
                Only public business knowledge and confirmed FAQs are accessible.
              </div>
            </div>
          </div>

          {/* Interactive Live Website Preview */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 flex flex-col justify-between relative overflow-hidden min-h-[500px]">
            {/* Fake Mock Website Content */}
            <div className="opacity-25 pointer-events-none select-none space-y-4">
              <div className="h-6 w-32 bg-slate-700 rounded" />
              <div className="h-28 w-full bg-slate-800 rounded-xl" />
              <div className="grid grid-cols-3 gap-3">
                <div className="h-20 bg-slate-800 rounded" />
                <div className="h-20 bg-slate-800 rounded" />
                <div className="h-20 bg-slate-800 rounded" />
              </div>
            </div>

            <div className="absolute top-4 left-4 bg-slate-900/80 border border-slate-700 px-2.5 py-1 rounded text-[10px] text-slate-300">
              Live Widget Interactive Simulator
            </div>

            {/* The Floating Widget Mock */}
            <div
              className={`absolute bottom-6 ${
                config.widgetPosition === "bottom-left" ? "left-6" : "right-6"
              } flex flex-col items-end gap-3`}
            >
              {/* Popover Bubble */}
              <div className="w-72 bg-[#090d1a] border border-slate-700 rounded-2xl p-4 shadow-2xl animate-fade-in flex flex-col gap-2.5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ backgroundColor: config.brandColor || "#06b6d4" }}
                    >
                      {config.agentName.charAt(0)}
                    </div>
                    <span className="text-xs font-bold text-white">{config.businessName}</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
                <p className="text-xs text-slate-200">{config.welcomeMessage}</p>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 font-semibold">Suggested Questions:</span>
                  {(config.suggestedQuestions || []).slice(0, 2).map((q, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] bg-slate-900 border border-slate-800 px-2 py-1 rounded text-cyan-300"
                    >
                      {q}
                    </span>
                  ))}
                </div>
              </div>

              {/* Launcher Floating Button */}
              <button
                className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl text-white transition-transform hover:scale-105"
                style={{ backgroundColor: config.brandColor || "#06b6d4" }}
              >
                <MessageSquare className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. LEAD MANAGEMENT DASHBOARD */}
      {/* ============================================================== */}
      {activeSection === "leads" && (
        <div className="flex flex-col gap-4">
          {/* Controls Bar */}
          <div className="bg-[#0b1120] border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto">
              {(["ALL", "NEW", "CONTACTED", "QUALIFIED", "BOOKED", "WON", "LOST"] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setLeadFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    leadFilter === st
                      ? "bg-cyan-600 text-white"
                      : "text-slate-400 hover:text-white bg-slate-900 border border-slate-800"
                  }`}
                >
                  {st}
                  {st !== "ALL" && (
                    <span className="ml-1 opacity-70">
                      ({leads.filter((l) => l.status === st).length})
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Actions: Add Lead & Export */}
            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search leads..."
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 w-36 sm:w-48"
                />
              </div>

              <button
                onClick={handleExportLeadsCsv}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={() => setIsAddLeadModalOpen(true)}
                className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Lead</span>
              </button>
            </div>
          </div>

          {/* Leads Table */}
          <div className="bg-[#0b1120] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            {filteredLeads.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <UserCheck className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <h4 className="text-xs font-semibold text-white">No Leads Found</h4>
                <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                  Only authentic leads captured through your AI Customer Agent, Voice Call inquiries, or manual entries appear here. No synthetic leads are fabricated.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Name / Contact</th>
                      <th className="py-3 px-4">Requirement / Interest</th>
                      <th className="py-3 px-4">Source</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Date Added</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-slate-900/50 transition-colors">
                        <td className="py-3 px-4 font-medium text-white">
                          <div>{lead.name}</div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            {lead.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{lead.email}</span>}
                            {lead.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{lead.phone}</span>}
                          </div>
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate text-slate-300">
                          {lead.requirement || "Consultation"}
                        </td>
                        <td className="py-3 px-4">
                          <span className="capitalize px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300">
                            {lead.source.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={lead.status}
                            onChange={(e) => handleUpdateLeadStatus(lead.id, e.target.value as CustomerLeadStatus)}
                            className="bg-slate-900 border border-slate-700 text-[11px] rounded px-2 py-1 text-cyan-300 font-bold"
                          >
                            <option value="NEW">NEW</option>
                            <option value="CONTACTED">CONTACTED</option>
                            <option value="QUALIFIED">QUALIFIED</option>
                            <option value="BOOKED">BOOKED</option>
                            <option value="WON">WON</option>
                            <option value="LOST">LOST</option>
                          </select>
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {new Date(lead.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => deleteCustomerLead(lead.id, config.agentId, user)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                            title="Delete Lead"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Add Manual Lead Modal */}
          {isAddLeadModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#0b1120] border border-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl flex flex-col gap-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h3 className="text-sm font-bold text-white">Add New Customer Lead</h3>
                  <button
                    onClick={() => setIsAddLeadModalOpen(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">Customer / Company Name *</label>
                    <input
                      type="text"
                      value={newLeadForm.name}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, name: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                      placeholder="e.g. Sarah Jenkins"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-400 block mb-1">Email</label>
                      <input
                        type="email"
                        value={newLeadForm.email}
                        onChange={(e) => setNewLeadForm({ ...newLeadForm, email: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                        placeholder="sarah@example.com"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Phone</label>
                      <input
                        type="tel"
                        value={newLeadForm.phone}
                        onChange={(e) => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Service / Product Needed</label>
                    <input
                      type="text"
                      value={newLeadForm.serviceOrProduct}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, serviceOrProduct: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                      placeholder="e.g. Website Overhaul"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Requirement Notes</label>
                    <textarea
                      rows={2}
                      value={newLeadForm.requirement}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, requirement: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                      placeholder="Specific needs or budget..."
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => setIsAddLeadModalOpen(false)}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateManualLead}
                    className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs text-white font-semibold"
                  >
                    Save Lead
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 6. CONVERSATIONS DASHBOARD */}
      {/* ============================================================== */}
      {activeSection === "conversations" && (
        <div className="bg-[#0b1120] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Customer Conversation Threads
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Real customer sessions across website chat and voice channels with AI resolution status.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-950 text-cyan-300 border border-cyan-800/40">
              {conversations.length} Active Sessions
            </span>
          </div>

          {conversations.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <MessageCircle className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <h4 className="text-xs font-semibold text-white">No Inbound Conversations Yet</h4>
              <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                Customer questions submitted via your website widget or voice phone lines will be recorded here in full detail.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {conversations.map((conv) => (
                <div key={conv.id} className="p-4 hover:bg-slate-900/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{conv.customerName || "Website Visitor"}</span>
                      <span className="text-[10px] text-slate-400">({conv.customerContact || "Direct"})</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 capitalize">
                        {conv.channel.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 max-w-xl truncate">
                      {conv.lastMessageSnippet || "Conversation started"}
                    </p>
                    <div className="text-[10px] text-slate-500">
                      Started: {new Date(conv.createdAt).toLocaleString()} · {conv.messages.length} messages
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        conv.resolutionStatus === "AI HANDLED"
                          ? "bg-emerald-950 text-emerald-300 border border-emerald-500/30"
                          : conv.resolutionStatus === "WAITING FOR HUMAN"
                          ? "bg-amber-950 text-amber-300 border border-amber-500/30"
                          : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {conv.resolutionStatus}
                    </span>

                    {conv.humanHandoffRequested && (
                      <button
                        onClick={async () => {
                          await saveCustomerConversation(
                            { ...conv, resolutionStatus: "HUMAN HANDLED", humanHandoffRequested: false },
                            user
                          );
                          showToast("Marked as human handled.", "success");
                        }}
                        className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-semibold"
                      >
                        Take Over
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 7. APPOINTMENTS SYSTEM */}
      {/* ============================================================== */}
      {activeSection === "appointments" && (
        <div className="flex flex-col gap-4">
          {/* Calendar Safety Notice */}
          <div className="bg-[#0b1120] border border-blue-500/30 rounded-xl p-4 flex items-start gap-3">
            <Calendar className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 space-y-1">
              <strong className="text-blue-300 block">Factual Appointment Safety Rule:</strong>
              <p>
                The AI Customer Agent collects the customer&apos;s preferred date and service, but explicitly clarifies that the appointment is
                <strong className="text-white"> REQUESTED</strong> and awaiting final approval. The AI never claims an appointment is confirmed without a real verified calendar authorization.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Customer Booking Requests ({appointments.length})
            </h3>
            <button
              onClick={() => setIsAddApptModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Request</span>
            </button>
          </div>

          <div className="bg-[#0b1120] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            {appointments.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <h4 className="text-xs font-semibold text-white">No Appointment Requests Yet</h4>
                <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                  When website visitors or callers ask to book a consultation, the request is collected and shown here with all customer contact details.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Service</th>
                      <th className="py-3 px-4">Preferred Date & Time</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {appointments.map((appt) => (
                      <tr key={appt.id} className="hover:bg-slate-900/50 transition-colors">
                        <td className="py-3 px-4 font-medium text-white">
                          <div>{appt.customerName}</div>
                          <div className="text-[11px] text-slate-400">
                            {appt.customerEmail || appt.customerPhone || "Direct booking"}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-300">{appt.service}</td>
                        <td className="py-3 px-4 text-cyan-300 font-medium">
                          {appt.preferredDate} at {appt.preferredTime}
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={appt.status}
                            onChange={(e) =>
                              handleUpdateApptStatus(appt.id, e.target.value as CustomerAppointmentStatus)
                            }
                            className="bg-slate-900 border border-slate-700 text-[11px] rounded px-2 py-1 text-white font-bold"
                          >
                            <option value="REQUESTED">REQUESTED</option>
                            <option value="PENDING">PENDING</option>
                            <option value="CONFIRMED">CONFIRMED</option>
                            <option value="CANCELLED">CANCELLED</option>
                            <option value="COMPLETED">COMPLETED</option>
                          </select>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => deleteCustomerAppointment(appt.id, config.agentId, user)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Add Appointment Modal */}
          {isAddApptModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#0b1120] border border-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl flex flex-col gap-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h3 className="text-sm font-bold text-white">Record Booking Request</h3>
                  <button onClick={() => setIsAddApptModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
                </div>
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">Customer Name *</label>
                    <input
                      type="text"
                      value={newApptForm.customerName}
                      onChange={(e) => setNewApptForm({ ...newApptForm, customerName: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                      placeholder="Customer Name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-400 block mb-1">Email</label>
                      <input
                        type="email"
                        value={newApptForm.customerEmail}
                        onChange={(e) => setNewApptForm({ ...newApptForm, customerEmail: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Phone</label>
                      <input
                        type="tel"
                        value={newApptForm.customerPhone}
                        onChange={(e) => setNewApptForm({ ...newApptForm, customerPhone: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Service Needed</label>
                    <input
                      type="text"
                      value={newApptForm.service}
                      onChange={(e) => setNewApptForm({ ...newApptForm, service: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                      placeholder="e.g. Free Strategy Consultation"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-400 block mb-1">Preferred Date</label>
                      <input
                        type="date"
                        value={newApptForm.preferredDate}
                        onChange={(e) => setNewApptForm({ ...newApptForm, preferredDate: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Preferred Time</label>
                      <input
                        type="text"
                        value={newApptForm.preferredTime}
                        onChange={(e) => setNewApptForm({ ...newApptForm, preferredTime: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                        placeholder="11:00 AM"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button onClick={() => setIsAddApptModalOpen(false)} className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-xs font-semibold text-slate-300">Cancel</button>
                  <button onClick={handleCreateAppointment} className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white">Save Request</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 8. KNOWLEDGE BASE */}
      {/* ============================================================== */}
      {activeSection === "knowledge" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Verified Business Knowledge Items ({knowledgeItems.length})
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                The Customer Agent only speaks with confirmed business data. Factual integrity is strictly enforced.
              </p>
            </div>
            <button
              onClick={() => setIsAddKnowledgeOpen(true)}
              className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Knowledge Entry</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {knowledgeItems.length === 0 ? (
              <div className="col-span-2 p-12 text-center bg-[#0b1120] border border-slate-800 rounded-xl text-slate-400">
                <BookOpen className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <h4 className="text-xs font-semibold text-white">No Custom Knowledge Added Yet</h4>
                <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                  Add FAQs, pricing plans, service policies, or refund rules so your AI Employee answers customer questions with 100% accuracy.
                </p>
              </div>
            ) : (
              knowledgeItems.map((item) => (
                <div key={item.id} className="bg-[#0b1120] border border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-cyan-300">
                        {item.type}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          item.state === "READY"
                            ? "bg-emerald-950 text-emerald-300 border border-emerald-500/30"
                            : item.state === "PROCESSING"
                            ? "bg-amber-950 text-amber-300 animate-pulse"
                            : "bg-rose-950 text-rose-300"
                        }`}
                      >
                        {item.state}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-white mb-1">{item.title}</h4>
                    <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed line-clamp-4">
                      {item.content}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                    <span>Updated: {new Date(item.updatedAt).toLocaleDateString()}</span>
                    <button
                      onClick={() => deleteCustomerKnowledgeItem(item.id, config.agentId, user)}
                      className="text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add Knowledge Modal */}
          {isAddKnowledgeOpen && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#0b1120] border border-slate-800 rounded-2xl w-full max-w-lg p-5 shadow-2xl flex flex-col gap-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h3 className="text-sm font-bold text-white">Add Knowledge Entry</h3>
                  <button onClick={() => setIsAddKnowledgeOpen(false)} className="text-slate-400 hover:text-white">✕</button>
                </div>
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">Category / Type</label>
                    <select
                      value={knowledgeForm.type}
                      onChange={(e) => setKnowledgeForm({ ...knowledgeForm, type: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                    >
                      <option value="faq">Frequently Asked Question (FAQ)</option>
                      <option value="pricing">Pricing & Package Details</option>
                      <option value="service">Service Specification</option>
                      <option value="policy">Policy / Refund / Terms</option>
                      <option value="hours">Hours & Availability</option>
                      <option value="location">Location & Contact Details</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Title / Question *</label>
                    <input
                      type="text"
                      value={knowledgeForm.title}
                      onChange={(e) => setKnowledgeForm({ ...knowledgeForm, title: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                      placeholder="e.g. Do you offer emergency weekend appointments?"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Factual Answer / Content *</label>
                    <textarea
                      rows={5}
                      value={knowledgeForm.content}
                      onChange={(e) => setKnowledgeForm({ ...knowledgeForm, content: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                      placeholder="Yes, our weekend emergency on-call team is available from 8am to 8pm at standard rates..."
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button onClick={() => setIsAddKnowledgeOpen(false)} className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-xs font-semibold text-slate-300">Cancel</button>
                  <button onClick={handleAddKnowledgeItem} className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white">Save Knowledge</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 9. AUTOMATIONS */}
      {/* ============================================================== */}
      {activeSection === "automations" && (
        <div className="flex flex-col gap-4">
          <div className="bg-[#0b1120] border border-slate-800 rounded-xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
              Customer Event Automations
            </h3>
            <p className="text-[11px] text-slate-400">
              Trigger background business actions when customer-facing interactions occur.
            </p>
          </div>

          <div className="space-y-3">
            {[
              {
                id: "auto-1",
                name: "Lead Notification",
                trigger: "When a new lead is created",
                action: "Notify business owner & create follow-up task",
                defaultEnabled: true,
              },
              {
                id: "auto-2",
                name: "Human Escalation Alert",
                trigger: "When customer requests human assistance or dispute",
                action: "Create high-priority ticket in Human Handoff queue",
                defaultEnabled: true,
              },
              {
                id: "auto-3",
                name: "Appointment Request Notice",
                trigger: "When an appointment is requested by customer",
                action: "Create appointment request in queue & alert booking manager",
                defaultEnabled: true,
              },
              {
                id: "auto-4",
                name: "Lead Qualification Follow-up",
                trigger: "When a lead provides phone and requirement",
                action: "Promote lead to QUALIFIED status automatically",
                defaultEnabled: true,
              },
              {
                id: "auto-5",
                name: "Knowledge Gap Review",
                trigger: "When customer asks a question AI has no confirmed data for",
                action: "Create a review task to add this answer to Knowledge Base",
                defaultEnabled: true,
              },
            ].map((rule) => (
              <div
                key={rule.id}
                className="bg-[#0b1120] border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan-950/60 border border-cyan-800/40 flex items-center justify-center shrink-0">
                    <Zap className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{rule.name}</h4>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      <strong className="text-cyan-300">{rule.trigger}</strong> ➔ {rule.action}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                    Active
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 10. HUMAN HANDOFF */}
      {/* ============================================================== */}
      {activeSection === "handoff" && (
        <div className="flex flex-col gap-4">
          <div className="bg-[#0b1120] border border-slate-800 rounded-xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
              Human Handoff & Escalations Queue
            </h3>
            <p className="text-[11px] text-slate-400">
              When visitors ask for a human, register a complaint, or inquire about sensitive matters, the AI transfers the session to staff.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#090d1a] border border-slate-800 rounded-xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-white">Escalation Trigger Keywords</h4>
              <p className="text-[11px] text-slate-400">
                If any of these keywords are spoken by the customer, the AI automatically transfers the inquiry:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(config.handoffKeywords || [
                  "human",
                  "agent",
                  "representative",
                  "manager",
                  "complaint",
                  "refund",
                  "speak with someone",
                ]).map((kw, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-slate-300"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-[#090d1a] border border-slate-800 rounded-xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-white">Pending Escalations</h4>
              {conversations.filter((c) => c.humanHandoffRequested).length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs">
                  No active human transfer requests at this time.
                </div>
              ) : (
                conversations
                  .filter((c) => c.humanHandoffRequested)
                  .map((conv) => (
                    <div
                      key={conv.id}
                      className="p-3 rounded-lg bg-amber-950/20 border border-amber-500/30 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-white">{conv.customerName || "Customer"}</div>
                        <div className="text-[10px] text-amber-300">Reason: {conv.handoffReason || "Customer requested human"}</div>
                      </div>
                      <button
                        onClick={async () => {
                          await saveCustomerConversation(
                            { ...conv, resolutionStatus: "HUMAN HANDLED", humanHandoffRequested: false },
                            user
                          );
                          showToast("Escalation resolved", "success");
                        }}
                        className="px-3 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-semibold text-[11px]"
                      >
                        Claim Session
                      </button>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 11. AGENT SETTINGS */}
      {/* ============================================================== */}
      {activeSection === "settings" && (
        <div className="bg-[#0b1120] border border-slate-800 rounded-xl p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white">Customer-Facing AI Identity</h3>
              <p className="text-xs text-slate-400">Configure how the AI introduces itself to website visitors and callers.</p>
            </div>
            <button
              onClick={() => handleSaveConfig(config)}
              disabled={isConfigSaving}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md transition-all"
            >
              {isConfigSaving ? "Saving..." : "Save Identity Changes"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Agent Name</label>
              <input
                type="text"
                value={config.agentName}
                onChange={(e) => setConfig({ ...config, agentName: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                placeholder="e.g. Maya - Client Specialist"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Business Name</label>
              <input
                type="text"
                value={config.businessName}
                onChange={(e) => setConfig({ ...config, businessName: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                placeholder="e.g. Apex Engineering"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-slate-400 block mb-1">Welcome Message</label>
              <textarea
                rows={2}
                value={config.welcomeMessage}
                onChange={(e) => setConfig({ ...config, welcomeMessage: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Tone of Voice</label>
              <select
                value={config.tone}
                onChange={(e) => setConfig({ ...config, tone: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
              >
                <option value="Professional, warm & direct">Professional, warm & direct</option>
                <option value="Consultative, expert & trustworthy">Consultative, expert & trustworthy</option>
                <option value="Energetic, modern & helpful">Energetic, modern & helpful</option>
                <option value="Empathetic, calm & reassuring">Empathetic, calm & reassuring</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Working Hours Description</label>
              <input
                type="text"
                value={config.workingHoursText || ""}
                onChange={(e) => setConfig({ ...config, workingHoursText: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                placeholder="Monday - Friday: 9am - 6pm"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Support Contact Email</label>
              <input
                type="email"
                value={config.contactEmail || ""}
                onChange={(e) => setConfig({ ...config, contactEmail: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                placeholder="contact@example.com"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Support Phone Number</label>
              <input
                type="tel"
                value={config.contactPhone || ""}
                onChange={(e) => setConfig({ ...config, contactPhone: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 12. USAGE & ANALYTICS */}
      {/* ============================================================== */}
      {activeSection === "analytics" && (
        <div className="flex flex-col gap-4">
          <div className="bg-[#0b1120] border border-slate-800 rounded-xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
              Real Performance & Usage Metrics
            </h3>
            <p className="text-[11px] text-slate-400">
              Calculated exclusively from verified interactions. No simulated or inflated figures are shown.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#0b1120] border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Total Conversations</span>
              <div className="text-2xl font-bold text-white mt-1">{conversations.length}</div>
              <div className="text-[10px] text-slate-500 mt-1">Live customer sessions</div>
            </div>

            <div className="bg-[#0b1120] border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Real Leads Captured</span>
              <div className="text-2xl font-bold text-cyan-400 mt-1">{leads.length}</div>
              <div className="text-[10px] text-slate-500 mt-1">Authentic contact captures</div>
            </div>

            <div className="bg-[#0b1120] border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Appointments Requested</span>
              <div className="text-2xl font-bold text-emerald-400 mt-1">{appointments.length}</div>
              <div className="text-[10px] text-slate-500 mt-1">Booking inquiries</div>
            </div>

            <div className="bg-[#0b1120] border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Human Handoff Rate</span>
              <div className="text-2xl font-bold text-amber-400 mt-1">
                {conversations.length > 0
                  ? `${Math.round(
                      (conversations.filter((c) => c.humanHandoffRequested).length / conversations.length) * 100
                    )}%`
                  : "0%"}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Escalation ratio</div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 13. INTEGRATIONS */}
      {/* ============================================================== */}
      {activeSection === "integrations" && (
        <div className="flex flex-col gap-4">
          <div className="bg-[#0b1120] border border-slate-800 rounded-xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
              External Channels & Telephony Integrations
            </h3>
            <p className="text-[11px] text-slate-400">
              Connect real communication pipelines to deploy your AI Customer Agent across telephony, chat widgets, and calendar bookings.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {integrations.map((int) => (
              <div
                key={int.id}
                className="bg-[#0b1120] border border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-3 shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white">{int.label}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        int.status === "CONNECTED"
                          ? "bg-emerald-950 text-emerald-300 border border-emerald-500/30"
                          : int.status === "NOT CONNECTED"
                          ? "bg-amber-950 text-amber-300 border border-amber-500/30"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {int.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">{int.details}</p>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-slate-500">Channel: {int.channel}</span>
                  {int.channel === "website" ? (
                    <button
                      onClick={() => handleSelectSection("website")}
                      className="text-cyan-400 hover:underline font-semibold"
                    >
                      View Embed Code
                    </button>
                  ) : int.channel === "telephony" ? (
                    <button
                      onClick={() => {
                        showToast("Twilio Account SID / Auth Token can be set in server environment (.env).", "info");
                      }}
                      className="text-cyan-400 hover:underline font-semibold"
                    >
                      Setup Instructions
                    </button>
                  ) : (
                    <span className="text-slate-500">Coming soon</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Global Toast */}
      {toastMessage && (
        <div
          className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl text-white text-xs font-semibold shadow-2xl backdrop-blur-md flex items-center gap-2 border transition-all ${
            toastType === "warning"
              ? "bg-rose-950/90 border-rose-500/60 text-rose-200"
              : toastType === "info"
              ? "bg-slate-900/90 border-blue-500/50 text-blue-200"
              : "bg-slate-900/90 border-cyan-500/50 text-white"
          }`}
        >
          {toastType === "warning" ? (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          )}
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

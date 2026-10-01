import React, { useState, useEffect, useRef } from "react";
import { 
  Bot, 
  Sparkles, 
  Mic, 
  MicOff, 
  PhoneOff, 
  Send, 
  Upload, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  AlertCircle, 
  Globe, 
  Youtube, 
  Smartphone, 
  Share2, 
  Sliders, 
  Layers, 
  Check, 
  Copy, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Lock, 
  Loader2, 
  Volume2, 
  VolumeX, 
  ArrowRight, 
  Briefcase,
  Search,
  Wrench,
  Tag,
  Target,
  FileCheck,
  ChevronRight,
  RefreshCw
} from "lucide-react";
import { 
  BusinessAgentConfig, 
  AgentActionTask, 
  BusinessDocument, 
  BusinessTask, 
  SavedItem, 
  ActiveTab,
  SubscriptionPlanId
} from "../types";
import { useCredits } from "../context/CreditsContext";
import { useLanguage } from "../i18n/LanguageContext";
import { CENTRAL_PLANS } from "../data/plans";
import { 
  saveBusinessAgent, 
  deleteBusinessAgent, 
  subscribeToBusinessAgents, 
  loadGuestBusinessAgents,
  saveAgentTask,
  subscribeToAgentTasks,
  loadGuestAgentTasks,
  saveReport
} from "../services/storageService";
import { normalizeErrorMessage } from "../utils/errorUtils";
import { AILanguageSelector } from "./AILanguageSelector";

interface BusinessAgentCenterProps {
  setActiveTab: (tab: ActiveTab) => void;
  onSaveReport?: (item: Omit<SavedItem, "id" | "createdAt">) => void;
  initialOpenCreate?: boolean;
}

type AgentSection = 
  | "chat" 
  | "voice" 
  | "context" 
  | "analyze" 
  | "tasks" 
  | "reports" 
  | "documents" 
  | "tools";

export const BusinessAgentCenter: React.FC<BusinessAgentCenterProps> = ({
  setActiveTab,
  onSaveReport,
  initialOpenCreate = false,
}) => {
  const { user, isAnonymous, plan, canPerformAIAction, consumeCredit, openSignupModal, openLimitModal } = useCredits();
  const { languageInfo } = useLanguage();

  // Navigation inside Agent Dashboard
  const [activeSection, setActiveSection] = useState<AgentSection>("chat");

  // Agents Collection & Active Agent
  const [agents, setAgents] = useState<BusinessAgentConfig[]>([]);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(initialOpenCreate);

  // Setup Form State
  const [formName, setFormName] = useState("");
  const [formIndustry, setFormIndustry] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formWebsite, setFormWebsite] = useState("");
  const [formProducts, setFormProducts] = useState("");
  const [formCustomers, setFormCustomers] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formGoals, setFormGoals] = useState("");
  const [formLanguage, setFormLanguage] = useState("Auto / Same as user");
  const [formBrandTone, setFormBrandTone] = useState("Professional, warm & direct");
  const [formSocialUrl, setFormSocialUrl] = useState("");
  const [formYoutubeUrl, setFormYoutubeUrl] = useState("");
  const [formAppUrl, setFormAppUrl] = useState("");
  const [formInstructions, setFormInstructions] = useState("");
  const [isCreatingAgent, setIsCreatingAgent] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Chat State
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    preparedTask?: AgentActionTask;
    timestamp: string;
  }>>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Voice Agent State
  const [voiceStatus, setVoiceStatus] = useState<"idle" | "listening" | "thinking" | "speaking" | "muted" | "error">("idle");
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceAiResponse, setVoiceAiResponse] = useState("");
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(typeof window !== "undefined" ? window.speechSynthesis : null);

  // Tasks & Action Approval State
  const [tasks, setTasks] = useState<AgentActionTask[]>([]);
  const [taskFilter, setTaskFilter] = useState<string>("ALL");
  const [isExecutingAction, setIsExecutingAction] = useState<string | null>(null);

  // Documents State
  const [documents, setDocuments] = useState<BusinessDocument[]>([]);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [docUploadNotice, setDocUploadNotice] = useState<string | null>(null);

  // URL Analysis State
  const [inspectUrl, setInspectUrl] = useState("");
  const [isAnalyzingUrl, setIsAnalyzingUrl] = useState(false);
  const [urlAnalysisResult, setUrlAnalysisResult] = useState<any | null>(null);

  // Tools State
  const [selectedTool, setSelectedTool] = useState<string>("analyzeWebsite");
  const [toolArgInput, setToolArgInput] = useState("");
  const [isExecutingTool, setIsExecutingTool] = useState(false);
  const [toolResult, setToolResult] = useState<any | null>(null);

  // Notification Toast / Copy helper
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const activeAgent = agents.find((a) => a.id === activeAgentId) || agents[0] || null;
  const planConfig = CENTRAL_PLANS[plan] || CENTRAL_PLANS.free;
  const maxAllowedAgents = planConfig.agentFeatures?.maxAgents || 1;

  // Load agents from Firestore or localStorage
  useEffect(() => {
    if (user && !user.isAnonymous) {
      const unsub = subscribeToBusinessAgents(user.uid, (loaded) => {
        setAgents(loaded);
        if (loaded.length > 0 && !activeAgentId) {
          setActiveAgentId(loaded[0].id);
        }
      });
      return () => unsub();
    } else {
      const localAgents = loadGuestBusinessAgents();
      setAgents(localAgents);
      if (localAgents.length > 0 && !activeAgentId) {
        setActiveAgentId(localAgents[0].id);
      }
    }
  }, [user]);

  // Load tasks from Firestore or localStorage
  useEffect(() => {
    if (user && !user.isAnonymous) {
      const unsub = subscribeToAgentTasks(user.uid, (loaded) => {
        setTasks(loaded);
      });
      return () => unsub();
    } else {
      const localTasks = loadGuestAgentTasks();
      setTasks(localTasks);
    }
  }, [user]);

  // Handle Copy text
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // 1. Submit "Create My AI Agent"
  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formIndustry.trim()) {
      setCreateError("Business name and industry are required.");
      return;
    }

    if (agents.length >= maxAllowedAgents) {
      setCreateError(
        `Your ${plan.toUpperCase()} plan allows up to ${maxAllowedAgents} AI Agent${maxAllowedAgents > 1 ? "s" : ""}. Please upgrade your plan to add more agents.`
      );
      return;
    }

    setIsCreatingAgent(true);
    setCreateError(null);

    try {
      const res = await fetch("/api/ai/agent-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          industry: formIndustry.trim(),
          location: formLocation.trim() || "Global",
          website: formWebsite.trim() || undefined,
          productsServices: formProducts.trim() || undefined,
          targetCustomers: formCustomers.trim() || undefined,
          description: formDescription.trim() || undefined,
          businessGoals: formGoals.trim() || undefined,
          preferredLanguage: formLanguage,
          brandTone: formBrandTone,
          socialUrls: [formSocialUrl, formYoutubeUrl, formAppUrl].filter(Boolean),
          customInstructions: formInstructions.trim() || undefined,
          userId: user?.uid,
          userPlan: plan,
          isAnonymous,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || "Failed to create business agent.");
      }

      const newAgent: BusinessAgentConfig = data.agent;
      await saveBusinessAgent(newAgent, user);
      await consumeCredit();

      // Save initial suggested tasks
      if (data.initialSuggestedTasks && Array.isArray(data.initialSuggestedTasks)) {
        for (const st of data.initialSuggestedTasks) {
          const newTask: AgentActionTask = {
            id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            userId: user?.uid || "guest",
            agentId: newAgent.id,
            title: st.title,
            category: st.category || "marketing",
            actionType: st.actionType || "general",
            status: "WAITING FOR APPROVAL",
            details: st.previewContent || "",
            previewContent: st.previewContent || "",
            estimatedCostOrBudget: st.estimatedCostOrBudget || "$0",
            targetPlatform: st.targetPlatform || "Direct",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await saveAgentTask(newTask, user);
        }
      }

      setAgents((prev) => [newAgent, ...prev]);
      setActiveAgentId(newAgent.id);
      setShowCreateModal(false);

      // Initial welcome message in chat
      setChatMessages([
        {
          id: `msg_${Date.now()}`,
          role: "assistant",
          content: `Hello! I am ${newAgent.name}, your dedicated AI Business Agent for ${newAgent.industry}. I understand your goals, products, and target audience. What would you like to solve or prepare today?`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      setActiveSection("chat");
    } catch (err: unknown) {
      setCreateError(normalizeErrorMessage(err, "Could not generate business agent."));
    } finally {
      setIsCreatingAgent(false);
    }
  };

  // 2. Chat with Business Agent
  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || isSendingMessage || !activeAgent) return;

    const creditCheck = canPerformAIAction();
    if (!creditCheck.allowed) {
      if (creditCheck.reason === "need_signup") openSignupModal();
      else openLimitModal();
      return;
    }

    const userMsgId = `usr_${Date.now()}`;
    const userTimestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setChatMessages((prev) => [
      ...prev,
      { id: userMsgId, role: "user", content: query, timestamp: userTimestamp },
    ]);
    setInputMessage("");
    setIsSendingMessage(true);

    try {
      const res = await fetch("/api/ai/agent-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          agentConfig: activeAgent,
          conversationHistory: chatMessages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
          attachedDocuments: documents,
          language: activeAgent.preferredLanguage,
          userId: user?.uid,
          userPlan: plan,
          isAnonymous,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || "Agent is temporarily unavailable.");
      }

      let preparedTaskObj: AgentActionTask | undefined;
      if (data.preparedTask) {
        preparedTaskObj = {
          id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          userId: user?.uid || "guest",
          agentId: activeAgent.id,
          title: data.preparedTask.title,
          category: data.preparedTask.category || "marketing",
          actionType: data.preparedTask.actionType || "general",
          status: "WAITING FOR APPROVAL",
          details: data.preparedTask.details || "",
          previewContent: data.preparedTask.previewContent || "",
          estimatedCostOrBudget: data.preparedTask.estimatedCostOrBudget || "$0",
          targetPlatform: data.preparedTask.targetPlatform || "Direct",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await saveAgentTask(preparedTaskObj, user);
      }

      await consumeCredit();

      const aiMsgId = `ai_${Date.now()}`;
      const aiTimestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setChatMessages((prev) => [
        ...prev,
        {
          id: aiMsgId,
          role: "assistant",
          content: data.replyText,
          preparedTask: preparedTaskObj,
          timestamp: aiTimestamp,
        },
      ]);
    } catch (err: unknown) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: "assistant",
          content: `⚠️ ${normalizeErrorMessage(err, "Failed to respond. Please try again.")}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsSendingMessage(false);
    }
  };

  // 3. Voice Agent (Talk to AI)
  const startVoiceConversation = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      setVoiceError("Speech recognition is not supported in this browser. Please use Chrome or Safari.");
      setVoiceStatus("error");
      return;
    }

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRec();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = activeAgent?.preferredLanguage?.toLowerCase().includes("hindi") ? "hi-IN" : "en-US";

    recognition.onstart = () => {
      setVoiceStatus("listening");
      setVoiceError(null);
    };

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          const finalTranscript = event.results[i][0].transcript;
          setVoiceTranscript(finalTranscript);
          handleVoiceSubmit(finalTranscript);
        } else {
          interim += event.results[i][0].transcript;
          setVoiceTranscript(interim);
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.warn("Speech recognition error:", event.error);
      if (event.error === "not-allowed") {
        setVoiceError("Microphone permission was denied. Please allow microphone access in your browser settings.");
      } else {
        setVoiceError(`Voice notice: ${event.error}`);
      }
      setVoiceStatus("idle");
    };

    recognition.onend = () => {
      if (voiceStatus === "listening") {
        setVoiceStatus("idle");
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (err) {
      console.warn("Recognition start error:", err);
    }
  };

  const stopVoiceConversation = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setVoiceStatus("idle");
  };

  const handleVoiceSubmit = async (spokenText: string) => {
    if (!spokenText.trim() || !activeAgent) return;
    setVoiceStatus("thinking");

    try {
      const res = await fetch("/api/ai/agent-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          speechText: spokenText.trim(),
          agentConfig: activeAgent,
          conversationHistory: chatMessages.slice(-4).map((m) => ({ role: m.role, content: m.content })),
          language: activeAgent.preferredLanguage,
          userId: user?.uid,
          userPlan: plan,
          isAnonymous,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || "Voice processing unavailable.");
      }

      setVoiceAiResponse(data.spokenReply);
      await consumeCredit();

      // Audio Speech Playback via SpeechSynthesis
      if (synthRef.current && !isVoiceMuted) {
        synthRef.current.cancel();
        const utterance = new SpeechSynthesisUtterance(data.spokenReply);
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
        utterance.onstart = () => setVoiceStatus("speaking");
        utterance.onend = () => setVoiceStatus("idle");
        utterance.onerror = () => setVoiceStatus("idle");
        synthRef.current.speak(utterance);
      } else {
        setVoiceStatus("idle");
      }
    } catch (err: unknown) {
      setVoiceError(normalizeErrorMessage(err, "Voice request could not be processed."));
      setVoiceStatus("idle");
    }
  };

  // 4. Action Approval Lifecycle: PREPARED BY AI -> WAITING FOR APPROVAL -> EXECUTED -> COMPLETED
  const handleApproveAction = async (task: AgentActionTask) => {
    setIsExecutingAction(task.id);
    try {
      const res = await fetch("/api/ai/agent-action-execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.id,
          actionType: task.actionType,
          targetPlatform: task.targetPlatform,
          content: task.previewContent,
          userId: user?.uid,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Execution failed.");
      }

      const updatedTask: AgentActionTask = {
        ...task,
        status: "COMPLETED",
        executionNotes: data.executionNote 
          ? (data.externalExecutionLink ? `${data.executionNote} (Link: ${data.externalExecutionLink})` : data.executionNote)
          : "Approved and executed.",
        updatedAt: new Date().toISOString(),
      };

      await saveAgentTask(updatedTask, user);
    } catch (err) {
      console.error("Action execution error:", err);
    } finally {
      setIsExecutingAction(null);
    }
  };

  // 5. Document Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingDoc(true);
    setDocUploadNotice(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(",")[1];
        const res = await fetch("/api/ai/agent-document-parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: file.name,
            mimeType: file.type || "application/octet-stream",
            base64Data,
            userId: user?.uid,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Could not parse document.");
        }

        const newDoc: BusinessDocument = {
          id: `doc_${Date.now()}`,
          userId: user?.uid || "guest",
          agentId: activeAgent?.id,
          name: file.name,
          fileType: data.document.fileType,
          sizeBytes: file.size,
          extractedText: data.document.extractedText,
          summary: data.document.summary,
          uploadedAt: new Date().toISOString(),
        };

        setDocuments((prev) => [newDoc, ...prev]);
        setDocUploadNotice(`Document "${file.name}" processed and integrated into Agent memory.`);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setDocUploadNotice(`Upload failed: ${normalizeErrorMessage(err)}`);
    } finally {
      setIsUploadingDoc(false);
    }
  };

  // 6. Live URL Analysis
  const handleAnalyzeUrl = async () => {
    if (!inspectUrl.trim()) return;
    setIsAnalyzingUrl(true);
    setUrlAnalysisResult(null);

    try {
      const url = inspectUrl.trim();
      let endpoint = "/api/analytics/website-check";
      if (url.includes("youtube.com") || url.includes("youtu.be")) {
        endpoint = "/api/analytics/youtube-inspect";
      } else if (url.includes("play.google.com") || url.includes("apps.apple.com")) {
        endpoint = "/api/analytics/app-inspect";
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();
      setUrlAnalysisResult(data);
    } catch (err) {
      setUrlAnalysisResult({ success: false, error: normalizeErrorMessage(err) });
    } finally {
      setIsAnalyzingUrl(false);
    }
  };

  // 7. Tool Execution
  const handleRunTool = async () => {
    if (!selectedTool || isExecutingTool) return;
    setIsExecutingTool(true);
    setToolResult(null);

    try {
      const res = await fetch("/api/ai/agent-tool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: selectedTool,
          args: { url: toolArgInput, query: toolArgInput, challenge: toolArgInput },
          agentConfig: activeAgent,
          language: activeAgent?.preferredLanguage || "English",
          userId: user?.uid,
          userPlan: plan,
          isAnonymous,
        }),
      });

      const data = await res.json();
      setToolResult(data);
    } catch (err) {
      setToolResult({ success: false, error: normalizeErrorMessage(err) });
    } finally {
      setIsExecutingTool(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. TOP HEADER & ACTIVE AGENT SELECTOR */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-950 border border-cyan-500/40 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-slate-950 shadow-lg shadow-cyan-500/30 shrink-0">
            <Bot className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                {activeAgent ? activeAgent.name : "My AI Business Agent"}
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active
              </span>
            </div>
            <p className="text-xs text-slate-300">
              {activeAgent
                ? `${activeAgent.industry} • ${activeAgent.location} • Plan: ${plan.toUpperCase()} (${agents.length}/${maxAllowedAgents} Agents)`
                : `Create an AI agent customized to reduce your repetitive work.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {agents.length > 1 && (
            <select
              value={activeAgentId || ""}
              onChange={(e) => setActiveAgentId(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 outline-none focus:border-cyan-400"
            >
              {agents.map((ag) => (
                <option key={ag.id} value={ag.id}>
                  {ag.name} ({ag.industry})
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={() => {
              if (agents.length >= maxAllowedAgents) {
                openLimitModal();
              } else {
                setShowCreateModal(true);
              }
            }}
            className="px-3 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create AI Agent</span>
          </button>
        </div>
      </div>

      {/* 2. SUB-NAVIGATION TABS */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-950/80 border border-slate-800 overflow-x-auto scrollbar-none text-xs">
        {[
          { id: "chat" as const, label: "Chat", icon: Bot },
          { id: "voice" as const, label: "Voice", icon: Mic },
          { id: "context" as const, label: "Business Context", icon: Sliders },
          { id: "analyze" as const, label: "Analyze", icon: Search },
          { id: "tasks" as const, label: "Tasks & Approvals", icon: CheckCircle2, badge: tasks.filter(t => t.status === "WAITING FOR APPROVAL").length },
          { id: "documents" as const, label: "Documents", icon: FileText, badge: documents.length },
          { id: "tools" as const, label: "Business Tools", icon: Wrench },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {typeof tab.badge === "number" && tab.badge > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  isActive ? "bg-slate-950 text-cyan-300" : "bg-cyan-500/20 text-cyan-300"
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 3. SECTION CONTENT */}

      {/* SECTION A: CHAT */}
      {activeSection === "chat" && (
        <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <strong className="text-white">Live Agent Work Session</strong>
              <span className="text-slate-400">• Context: {activeAgent?.industry || "Commercial"}</span>
            </div>
            <button
              type="button"
              onClick={() => setActiveSection("voice")}
              className="px-2.5 py-1 rounded-lg bg-indigo-950 hover:bg-indigo-900 border border-indigo-700/50 text-indigo-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Mic className="w-3.5 h-3.5 text-indigo-400" />
              <span>Talk to AI (Voice)</span>
            </button>
          </div>

          {/* Quick Starter Chips */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {[
              "Why are my sales low?",
              "Write a reply to a price-inquiry customer",
              "Analyze my website conversion leaks",
              "Create next week's social media plan",
              "Give me 5 practical ideas to get 10 new clients",
            ].map((promptText, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(promptText)}
                className="px-2.5 py-1 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] text-cyan-300 hover:text-white transition-all cursor-pointer"
              >
                {promptText}
              </button>
            ))}
          </div>

          {/* Chat Messages */}
          <div className="space-y-3 min-h-[280px] max-h-[480px] overflow-y-auto p-2 rounded-2xl bg-slate-950/70 border border-slate-800/80">
            {chatMessages.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs space-y-2">
                <Bot className="w-8 h-8 text-slate-600 mx-auto" />
                <p>Start a conversation with your customized AI Business Agent.</p>
                <p className="text-[11px] text-slate-600">The agent remembers your business goals, target clients, and industry rules.</p>
              </div>
            ) : (
              chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"} space-y-1.5`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-gradient-to-r from-cyan-600 to-indigo-600 text-white font-medium"
                        : "bg-slate-900 border border-slate-800 text-slate-100 shadow-md"
                    }`}
                  >
                    {msg.content}
                  </div>

                  {/* PREPARED ACTION APPROVAL CARD */}
                  {msg.preparedTask && (
                    <div className="w-full max-w-lg p-3.5 rounded-2xl bg-gradient-to-r from-indigo-950/80 to-slate-900 border-2 border-indigo-500/50 shadow-xl space-y-2.5">
                      <div className="flex items-center justify-between pb-1.5 border-b border-indigo-800/50">
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase tracking-wider border border-amber-500/40">
                          PREPARED BY AI • WAITING FOR APPROVAL
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Platform: {msg.preparedTask.targetPlatform || "Direct"}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-white">
                        {msg.preparedTask.title}
                      </h4>

                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono whitespace-pre-wrap">
                        {msg.preparedTask.previewContent}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-slate-400">
                          Estimated Cost: {msg.preparedTask.estimatedCostOrBudget || "$0"}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopy(msg.preparedTask?.previewContent || "", `act_${msg.id}`)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                            <span>{copiedKey === `act_${msg.id}` ? "Copied" : "Copy"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleApproveAction(msg.preparedTask!)}
                            disabled={isExecutingAction === msg.preparedTask.id}
                            className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-black flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                          >
                            {isExecutingAction === msg.preparedTask.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3 h-3" />
                            )}
                            <span>Approve & Execute</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <span className="text-[10px] text-slate-500 px-1 font-mono">
                    {msg.timestamp}
                  </span>
                </div>
              ))
            )}
            {isSendingMessage && (
              <div className="flex items-center gap-2 text-xs text-cyan-300 p-2">
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                <span>Agent thinking & checking business memory...</span>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-950 border border-slate-800 focus-within:border-cyan-400 transition-colors">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={`Ask ${activeAgent?.name || "your agent"} or request a task...`}
              className="flex-1 bg-transparent px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 outline-none"
            />

            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={isSendingMessage || !inputMessage.trim()}
              className="p-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* SECTION B: VOICE (TALK TO AI) */}
      {activeSection === "voice" && (
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-indigo-500/40 shadow-2xl text-center space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg font-black text-white">🎙 Talk to AI Business Agent</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Real-time voice conversation with microphone audio input and spoken audio feedback.
            </p>
          </div>

          {/* Central Voice Pulse Button */}
          <div className="flex flex-col items-center justify-center py-6">
            <div className="relative">
              {voiceStatus === "listening" && (
                <div className="absolute inset-0 rounded-full bg-cyan-500/30 animate-ping" />
              )}
              {voiceStatus === "speaking" && (
                <div className="absolute inset-0 rounded-full bg-emerald-500/30 animate-pulse scale-125" />
              )}
              <button
                type="button"
                onClick={voiceStatus === "listening" ? stopVoiceConversation : startVoiceConversation}
                className={`relative w-28 h-28 rounded-full flex flex-col items-center justify-center transition-all cursor-pointer shadow-2xl ${
                  voiceStatus === "listening"
                    ? "bg-rose-600 text-white shadow-rose-600/40"
                    : voiceStatus === "speaking"
                    ? "bg-emerald-500 text-slate-950 shadow-emerald-500/40 animate-pulse"
                    : voiceStatus === "thinking"
                    ? "bg-amber-500 text-slate-950 shadow-amber-500/40"
                    : "bg-gradient-to-tr from-cyan-500 to-indigo-600 text-slate-950 hover:scale-105 shadow-cyan-500/30"
                }`}
              >
                {voiceStatus === "listening" ? (
                  <MicOff className="w-8 h-8" />
                ) : voiceStatus === "speaking" ? (
                  <Volume2 className="w-8 h-8" />
                ) : voiceStatus === "thinking" ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : (
                  <Mic className="w-8 h-8" />
                )}
                <span className="text-[10px] font-black uppercase mt-1">
                  {voiceStatus === "listening"
                    ? "Stop"
                    : voiceStatus === "speaking"
                    ? "Speaking"
                    : voiceStatus === "thinking"
                    ? "Thinking"
                    : "Tap to Speak"}
                </span>
              </button>
            </div>

            <span className="text-xs font-semibold text-cyan-300 mt-4">
              Status: {voiceStatus.toUpperCase()}
            </span>
          </div>

          {/* Controls: Mute & End */}
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setIsVoiceMuted(!isVoiceMuted)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                isVoiceMuted
                  ? "bg-rose-950 border-rose-500/50 text-rose-300"
                  : "bg-slate-950 border-slate-800 text-slate-300 hover:text-white"
              }`}
            >
              {isVoiceMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              <span>{isVoiceMuted ? "Unmute Audio" : "Mute Audio"}</span>
            </button>

            <button
              type="button"
              onClick={stopVoiceConversation}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <PhoneOff className="w-3.5 h-3.5 text-rose-400" />
              <span>End Call</span>
            </button>
          </div>

          {/* Live Voice Transcript Box */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left space-y-2 text-xs">
            <span className="font-bold text-slate-400 block uppercase tracking-wider text-[10px]">
              Live Spoken Transcript:
            </span>
            <div className="text-slate-200 min-h-[40px] font-mono">
              {voiceTranscript || "Tap the microphone above and speak naturally..."}
            </div>
            {voiceAiResponse && (
              <div className="pt-2 border-t border-slate-800 text-cyan-300">
                <span className="text-[10px] text-slate-500 block uppercase">Agent Spoke:</span>
                {voiceAiResponse}
              </div>
            )}
          </div>

          {voiceError && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2 text-left">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{voiceError}</span>
            </div>
          )}
        </div>
      )}

      {/* SECTION C: BUSINESS CONTEXT */}
      {activeSection === "context" && activeAgent && (
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white">Business Knowledge & Memory</h3>
              <p className="text-xs text-slate-400">
                This context is automatically loaded into every conversation and task.
              </p>
            </div>
            <button
              type="button"
              onClick={async () => {
                await saveBusinessAgent(activeAgent, user);
                alert("Business context saved successfully.");
              }}
              className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs cursor-pointer"
            >
              Save Context Changes
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-slate-400 font-mono block mb-1">Business Name</label>
              <input
                type="text"
                value={activeAgent.name}
                onChange={(e) => {
                  const updated = { ...activeAgent, name: e.target.value };
                  setAgents((prev) => prev.map((a) => (a.id === activeAgent.id ? updated : a)));
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="text-slate-400 font-mono block mb-1">Industry</label>
              <input
                type="text"
                value={activeAgent.industry}
                onChange={(e) => {
                  const updated = { ...activeAgent, industry: e.target.value };
                  setAgents((prev) => prev.map((a) => (a.id === activeAgent.id ? updated : a)));
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="text-slate-400 font-mono block mb-1">Location / Target Market</label>
              <input
                type="text"
                value={activeAgent.location}
                onChange={(e) => {
                  const updated = { ...activeAgent, location: e.target.value };
                  setAgents((prev) => prev.map((a) => (a.id === activeAgent.id ? updated : a)));
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="text-slate-400 font-mono block mb-1">Website URL</label>
              <input
                type="text"
                value={activeAgent.website || ""}
                onChange={(e) => {
                  const updated = { ...activeAgent, website: e.target.value };
                  setAgents((prev) => prev.map((a) => (a.id === activeAgent.id ? updated : a)));
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-cyan-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-slate-400 font-mono block mb-1">Products & Services</label>
              <textarea
                rows={2}
                value={activeAgent.productsServices || ""}
                onChange={(e) => {
                  const updated = { ...activeAgent, productsServices: e.target.value };
                  setAgents((prev) => prev.map((a) => (a.id === activeAgent.id ? updated : a)));
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-cyan-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-slate-400 font-mono block mb-1">Special Instructions & Policy</label>
              <textarea
                rows={3}
                value={activeAgent.customInstructions || ""}
                onChange={(e) => {
                  const updated = { ...activeAgent, customInstructions: e.target.value };
                  setAgents((prev) => prev.map((a) => (a.id === activeAgent.id ? updated : a)));
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* SECTION D: ANALYZE (URL INSPECTOR) */}
      {activeSection === "analyze" && (
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-4">
          <div>
            <h3 className="text-base font-bold text-white">Multi-Channel Presence & URL Inspector</h3>
            <p className="text-xs text-slate-400">
              Only analyzes legitimately available public information. No mock numbers.
            </p>
          </div>

          <div className="flex gap-2">
            <input
              type="url"
              value={inspectUrl}
              onChange={(e) => setInspectUrl(e.target.value)}
              placeholder="Enter Website URL, YouTube Video/Channel, or App Store Link..."
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-400"
            />
            <button
              type="button"
              onClick={handleAnalyzeUrl}
              disabled={isAnalyzingUrl || !inspectUrl.trim()}
              className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {isAnalyzingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Inspect</span>
            </button>
          </div>

          {urlAnalysisResult && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-2">
              <span className="font-bold text-cyan-300 block uppercase">Inspection Results:</span>
              <pre className="text-slate-300 whitespace-pre-wrap font-mono text-[11px] max-h-60 overflow-y-auto">
                {JSON.stringify(urlAnalysisResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* SECTION E: TASKS & APPROVAL LIFECYCLE */}
      {activeSection === "tasks" && (
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white">Agent Task & Approval Board</h3>
              <p className="text-xs text-slate-400">
                Principle: AI drafts the work $\rightarrow$ You approve before anything is sent or published.
              </p>
            </div>
            <span className="text-xs text-cyan-400 font-mono">
              Total Tasks: {tasks.length}
            </span>
          </div>

          {/* Task Status Filters */}
          <div className="flex gap-1.5 text-xs">
            {["ALL", "WAITING FOR APPROVAL", "COMPLETED", "TODO"].map((f) => (
              <button
                key={f}
                onClick={() => setTaskFilter(f)}
                className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                  taskFilter === f
                    ? "bg-cyan-500 text-slate-950"
                    : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Tasks List */}
          <div className="space-y-3">
            {tasks.filter((t) => taskFilter === "ALL" || t.status === taskFilter).length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No tasks found in this view. Ask your Agent in chat to prepare messages, posts, or marketing plans!
              </div>
            ) : (
              tasks
                .filter((t) => taskFilter === "ALL" || t.status === taskFilter)
                .map((task) => (
                  <div
                    key={task.id}
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        task.status === "WAITING FOR APPROVAL"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          : task.status === "COMPLETED"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : "bg-slate-800 text-slate-300"
                      }`}>
                        {task.status}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Target: {task.targetPlatform || "General"}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-white">{task.title}</h4>
                    <p className="text-xs text-slate-300 font-mono whitespace-pre-wrap">
                      {task.previewContent || task.details}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-xs">
                      <span className="text-[10px] text-slate-500">
                        {task.executionNotes || "Created by AI Business Agent"}
                      </span>
                      {task.status === "WAITING FOR APPROVAL" && (
                        <button
                          type="button"
                          onClick={() => handleApproveAction(task)}
                          disabled={isExecutingAction === task.id}
                          className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve & Execute</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {/* SECTION F: DOCUMENTS */}
      {activeSection === "documents" && (
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white">Business Documents & Knowledge Vault</h3>
              <p className="text-xs text-slate-400">
                Upload PDF, DOCX, TXT, or images. The agent extracts verified facts to remember.
              </p>
            </div>
            <label className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Document</span>
              <input
                type="file"
                accept=".pdf,.docx,.doc,.txt,image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {isUploadingDoc && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-xs">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              <span>Reading and extracting document knowledge with AI...</span>
            </div>
          )}

          {docUploadNotice && (
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
              {docUploadNotice}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {documents.length === 0 ? (
              <div className="sm:col-span-2 p-8 text-center text-slate-500 text-xs">
                No documents uploaded yet. Upload price lists, company brochures, or menus to ground your agent.
              </div>
            ) : (
              documents.map((doc) => (
                <div key={doc.id} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <strong className="text-white truncate">{doc.name}</strong>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {doc.fileType}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px] line-clamp-3">
                    {doc.summary}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SECTION G: TOOLS */}
      {activeSection === "tools" && (
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-4">
          <div>
            <h3 className="text-base font-bold text-white">Agent Operations Toolkit</h3>
            <p className="text-xs text-slate-400">
              Execute specialized business tools directly through your AI agent.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Select Tool</label>
              <select
                value={selectedTool}
                onChange={(e) => setSelectedTool(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-cyan-400"
              >
                <option value="analyzeWebsite">analyzeWebsite</option>
                <option value="analyzeSEO">analyzeSEO</option>
                <option value="analyzeYouTube">analyzeYouTube</option>
                <option value="analyzeSocial">analyzeSocial</option>
                <option value="analyzeApp">analyzeApp</option>
                <option value="analyzeTraffic">analyzeTraffic</option>
                <option value="researchWeb">researchWeb</option>
                <option value="analyzeCompetitors">analyzeCompetitors</option>
                <option value="generateMarketingPlan">generateMarketingPlan</option>
                <option value="generateSalesPlan">generateSalesPlan</option>
                <option value="generateAdPlan">generateAdPlan</option>
                <option value="generateSocialContent">generateSocialContent</option>
                <option value="generateSEOContent">generateSEOContent</option>
                <option value="generateCustomerReply">generateCustomerReply</option>
                <option value="analyzeBusiness">analyzeBusiness</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Input / Target URL / Query</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={toolArgInput}
                  onChange={(e) => setToolArgInput(e.target.value)}
                  placeholder="e.g. https://yourbusiness.com or customer challenge query"
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-cyan-400"
                />
                <button
                  type="button"
                  onClick={handleRunTool}
                  disabled={isExecutingTool}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isExecutingTool ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wrench className="w-3.5 h-3.5" />}
                  <span>Run</span>
                </button>
              </div>
            </div>
          </div>

          {toolResult && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-2">
              <div className="flex items-center justify-between text-cyan-300">
                <strong className="uppercase">Result: {toolResult.result?.tool || selectedTool}</strong>
                <span className="font-mono text-[10px] text-slate-400">{toolResult.result?.sourceLabel}</span>
              </div>
              <p className="text-slate-300 font-semibold">{toolResult.result?.summary}</p>
              <pre className="text-slate-400 whitespace-pre-wrap font-mono text-[11px] max-h-56 overflow-y-auto">
                {JSON.stringify(toolResult.result?.data || toolResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* CREATE MY AI AGENT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-xl rounded-3xl bg-slate-900 border border-cyan-500/50 p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Create My Business AI Agent</h3>
                  <span className="text-[11px] text-slate-400">Tailored to your specific company, clients & brand voice</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAgent} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Business Name *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Artisan Spices Direct or Urban Craft Cafe"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Industry *</label>
                  <input
                    type="text"
                    required
                    value={formIndustry}
                    onChange={(e) => setFormIndustry(e.target.value)}
                    placeholder="e.g. Restaurant, Construction, E-Commerce, Interior Design"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Country / City</label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="e.g. London, UK or Mumbai, India"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Website URL (Optional)</label>
                  <input
                    type="url"
                    value={formWebsite}
                    onChange={(e) => setFormWebsite(e.target.value)}
                    placeholder="https://yourbusiness.com"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Products / Services Offered</label>
                <input
                  type="text"
                  value={formProducts}
                  onChange={(e) => setFormProducts(e.target.value)}
                  placeholder="e.g. Turnkey office fit-outs, residential renovation, modular kitchens"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Target Customers</label>
                <input
                  type="text"
                  value={formCustomers}
                  onChange={(e) => setFormCustomers(e.target.value)}
                  placeholder="e.g. Commercial landlords, tech startups, corporate facility managers"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Business Description & Core Pitch</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Brief description of what makes your business unique..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-cyan-400 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Brand Tone</label>
                  <select
                    value={formBrandTone}
                    onChange={(e) => setFormBrandTone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-cyan-400"
                  >
                    <option value="Professional, authoritative & direct">Professional & Authoritative</option>
                    <option value="Friendly, warm & welcoming">Friendly & Warm</option>
                    <option value="Luxury, exclusive & refined">Luxury & Refined</option>
                    <option value="Modern, casual & growth-focused">Modern & Casual</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Preferred Language</label>
                  <input
                    type="text"
                    value={formLanguage}
                    onChange={(e) => setFormLanguage(e.target.value)}
                    placeholder="Auto / Same as user or English / Hindi / Bengali"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-semibold text-slate-400 text-[10px] block mb-1">Social URL (Opt)</label>
                  <input
                    type="url"
                    value={formSocialUrl}
                    onChange={(e) => setFormSocialUrl(e.target.value)}
                    placeholder="Instagram/LinkedIn"
                    className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-[11px] outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-400 text-[10px] block mb-1">YouTube URL (Opt)</label>
                  <input
                    type="url"
                    value={formYoutubeUrl}
                    onChange={(e) => setFormYoutubeUrl(e.target.value)}
                    placeholder="YouTube channel"
                    className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-[11px] outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-400 text-[10px] block mb-1">App URL (Opt)</label>
                  <input
                    type="url"
                    value={formAppUrl}
                    onChange={(e) => setFormAppUrl(e.target.value)}
                    placeholder="Play/App Store"
                    className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-[11px] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Additional Custom Instructions (Optional)</label>
                <textarea
                  rows={2}
                  value={formInstructions}
                  onChange={(e) => setFormInstructions(e.target.value)}
                  placeholder="e.g. Always emphasize our 24h response time and direct WhatsApp booking..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-cyan-400 resize-none"
                />
              </div>

              {createError && (
                <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs">
                  {createError}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingAgent}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
                >
                  {isCreatingAgent ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Generating Agent Profile & Memory...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-slate-950 fill-slate-950" />
                      <span>Generate My Business Agent</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

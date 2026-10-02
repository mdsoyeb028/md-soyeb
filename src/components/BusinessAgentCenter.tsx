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
  RefreshCw,
  Settings as SettingsIcon,
  Eye,
  Download,
  ShieldCheck,
  HelpCircle,
  Image as ImageIcon,
  MapPin,
  X
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
  deleteAgentTask,
  subscribeToAgentTasks,
  loadGuestAgentTasks,
  saveReport,
  deleteReport
} from "../services/storageService";
import { normalizeErrorMessage } from "../utils/errorUtils";
import { safeFetchJson } from "../utils/apiHelper";
import { AILanguageSelector } from "./AILanguageSelector";

interface BusinessAgentCenterProps {
  setActiveTab: (tab: ActiveTab) => void;
  onSaveReport?: (item: Omit<SavedItem, "id" | "createdAt">) => void;
  initialOpenCreate?: boolean;
}

export type AgentSection = 
  | "chat" 
  | "voice" 
  | "analyze" 
  | "tasks" 
  | "reports" 
  | "context" 
  | "documents" 
  | "settings";

export const BusinessAgentCenter: React.FC<BusinessAgentCenterProps> = ({
  setActiveTab,
  onSaveReport,
  initialOpenCreate = false,
}) => {
  const { user, isAnonymous, plan, canPerformAIAction, consumeCredit, openSignupModal, openLimitModal } = useCredits();
  const { languageInfo } = useLanguage();

  // Navigation inside Agent Dashboard: 8 distinct sections
  const [activeSection, setActiveSection] = useState<AgentSection>("chat");

  // Agents Collection & Active Agent
  const [agents, setAgents] = useState<BusinessAgentConfig[]>([]);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(initialOpenCreate);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);

  // Setup Form State (Create)
  const [formName, setFormName] = useState("");
  const [formIndustry, setFormIndustry] = useState("");
  const [formCountry, setFormCountry] = useState("");
  const [formCity, setFormCity] = useState("");
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

  // Edit Form State
  const [editName, setEditName] = useState("");
  const [editIndustry, setEditIndustry] = useState("");
  const [editCountry, setEditCountry] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [editProducts, setEditProducts] = useState("");
  const [editCustomers, setEditCustomers] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editGoals, setEditGoals] = useState("");
  const [editLanguage, setEditLanguage] = useState("");
  const [editBrandTone, setEditBrandTone] = useState("");
  const [editSocialUrl, setEditSocialUrl] = useState("");
  const [editYoutubeUrl, setEditYoutubeUrl] = useState("");
  const [editAppUrl, setEditAppUrl] = useState("");
  const [editInstructions, setEditInstructions] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editSuccessNotice, setEditSuccessNotice] = useState<string | null>(null);

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

  // Reports State
  const [agentReports, setAgentReports] = useState<Array<{
    id: string;
    title: string;
    type: string;
    category: string;
    summary: string;
    content: string;
    createdAt: string;
    isSaved?: boolean;
  }>>([]);
  const [isGeneratingReport, setIsGeneratingReport] = useState<string | null>(null);
  const [viewingReport, setViewingReport] = useState<any | null>(null);
  const [reportCustomFocus, setReportCustomFocus] = useState("");

  // Analyze (URL Inspector + Image Problem Solver)
  const [inspectUrl, setInspectUrl] = useState("");
  const [isAnalyzingUrl, setIsAnalyzingUrl] = useState(false);
  const [urlAnalysisResult, setUrlAnalysisResult] = useState<any | null>(null);

  // Image / Screenshot Analysis
  const [screenshotBase64, setScreenshotBase64] = useState<string | null>(null);
  const [screenshotMime, setScreenshotMime] = useState<string>("image/png");
  const [screenshotUserNotes, setScreenshotUserNotes] = useState("");
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [imageAnalysisResult, setImageAnalysisResult] = useState<any | null>(null);

  // Notification Toast / Copy helper
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [statusToast, setStatusToast] = useState<{ message: string; type: "success" | "info" | "warning" } | null>(null);

  const activeAgent = agents.find((a) => a.id === activeAgentId) || agents[0] || null;
  const planConfig = CENTRAL_PLANS[plan] || CENTRAL_PLANS.free;
  const maxAllowedAgents = planConfig.agentFeatures?.maxAgents || 1;

  // Show status toast
  const showToast = (message: string, type: "success" | "info" | "warning" = "success") => {
    setStatusToast({ message, type });
    setTimeout(() => setStatusToast(null), 3500);
  };

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

  // Sync edit form with active agent
  const openEditAgentModal = () => {
    if (!activeAgent) return;
    setEditName(activeAgent.name || activeAgent.businessName || "");
    setEditIndustry(activeAgent.industry || "");
    setEditCountry(activeAgent.country || "");
    setEditCity(activeAgent.city || "");
    setEditWebsite(activeAgent.website || "");
    setEditProducts(activeAgent.productsServices || "");
    setEditCustomers(activeAgent.targetCustomers || "");
    setEditDescription(activeAgent.description || activeAgent.businessDescription || "");
    setEditGoals(activeAgent.businessGoals || "");
    setEditLanguage(activeAgent.preferredLanguage || "Auto / Same as user");
    setEditBrandTone(activeAgent.brandTone || "Professional, direct and helpful");
    setEditSocialUrl(activeAgent.socialUrls?.[0] || activeAgent.socialLinks?.[0] || "");
    setEditYoutubeUrl(activeAgent.youtubeLink || activeAgent.youtubeLinks?.[0] || "");
    setEditAppUrl(activeAgent.appLink || activeAgent.appLinks?.[0] || "");
    setEditInstructions(activeAgent.customInstructions || activeAgent.additionalInstructions || "");
    setEditSuccessNotice(null);
    setShowEditModal(true);
  };

  // Save Edit Agent Profile
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAgent) return;
    if (!editName.trim() || !editIndustry.trim()) {
      showToast("Business name and industry are required.", "warning");
      return;
    }

    setIsSavingEdit(true);
    try {
      const updatedCountry = editCountry.trim();
      const updatedCity = editCity.trim();
      const updatedLocation = updatedCity && updatedCountry 
        ? `${updatedCity}, ${updatedCountry}` 
        : updatedCity || updatedCountry || activeAgent.location || "Global";

      const updatedAgent: BusinessAgentConfig = {
        ...activeAgent,
        name: editName.trim(),
        businessName: editName.trim(),
        industry: editIndustry.trim(),
        country: updatedCountry,
        city: updatedCity,
        location: updatedLocation,
        website: editWebsite.trim(),
        productsServices: editProducts.trim(),
        targetCustomers: editCustomers.trim(),
        description: editDescription.trim(),
        businessDescription: editDescription.trim(),
        businessGoals: editGoals.trim(),
        preferredLanguage: editLanguage.trim() || "Auto / Same as user",
        brandTone: editBrandTone.trim(),
        socialUrls: [editSocialUrl.trim()].filter(Boolean),
        socialLinks: [editSocialUrl.trim()].filter(Boolean),
        youtubeLink: editYoutubeUrl.trim(),
        youtubeLinks: [editYoutubeUrl.trim()].filter(Boolean),
        appLink: editAppUrl.trim(),
        appLinks: [editAppUrl.trim()].filter(Boolean),
        customInstructions: editInstructions.trim(),
        additionalInstructions: editInstructions.trim(),
        updatedAt: new Date().toISOString(),
      };

      await saveBusinessAgent(updatedAgent, user);

      setAgents((prev) => prev.map((a) => (a.id === updatedAgent.id ? updatedAgent : a)));
      setShowEditModal(false);
      showToast("Business context updated successfully! Your agent will use these facts for all future questions.", "success");
    } catch (err: unknown) {
      showToast(normalizeErrorMessage(err, "Failed to save agent updates."), "warning");
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Delete Business Agent
  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm("Are you sure you want to delete this AI Agent configuration? This action cannot be undone.")) {
      return;
    }
    try {
      await deleteBusinessAgent(agentId, user);
      setAgents((prev) => prev.filter((a) => a.id !== agentId));
      if (activeAgentId === agentId) {
        const remaining = agents.filter((a) => a.id !== agentId);
        setActiveAgentId(remaining.length > 0 ? remaining[0].id : null);
      }
      showToast("Business Agent deleted.", "info");
    } catch (err) {
      showToast("Could not delete agent.", "warning");
    }
  };

  // Handle Copy text
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Export report / deliverable as Markdown file
  const handleExportMarkdown = (title: string, content: string) => {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, "_")}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Exported report to markdown file.", "success");
  };

  // 1. Submit "Create My AI Agent"
  const handleCreateAgent = async (e?: React.FormEvent, skipOptional = false) => {
    if (e) e.preventDefault();
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
      const locationComputed = formCity.trim() && formCountry.trim() 
        ? `${formCity.trim()}, ${formCountry.trim()}`
        : formCity.trim() || formCountry.trim() || "Global";

      const data = await safeFetchJson<{
        success: boolean;
        agent: BusinessAgentConfig;
        initialSuggestedTasks?: any[];
        message?: string;
        error?: string;
      }>("/api/ai/agent-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          industry: formIndustry.trim(),
          country: formCountry.trim(),
          city: formCity.trim(),
          location: locationComputed,
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

      if (!data.success) {
        throw new Error(data.message || data.error || "Failed to create business agent.");
      }

      const newAgent: BusinessAgentConfig = {
        ...data.agent,
        country: formCountry.trim(),
        city: formCity.trim(),
        businessName: formName.trim(),
        businessGoals: formGoals.trim(),
        status: "active",
      };

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

      // Reset form
      setFormName("");
      setFormIndustry("");
      setFormCountry("");
      setFormCity("");
      setFormWebsite("");
      setFormProducts("");
      setFormCustomers("");
      setFormDescription("");
      setFormGoals("");
      setFormInstructions("");

      // Initial welcome message in chat
      setChatMessages([
        {
          id: `msg_${Date.now()}`,
          role: "assistant",
          content: `Hello! I am ${newAgent.name}, your dedicated AI Business Agent for ${newAgent.industry}. I understand your goals, target clients, and brand tone. What would you like to solve, analyze, or prepare today?`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      setActiveSection("chat");
      showToast(`Created AI Agent for "${newAgent.name}"!`, "success");
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
      const data = await safeFetchJson<{
        success: boolean;
        replyText: string;
        response?: string;
        mode?: string;
        detectedLanguage?: string;
        preparedTask?: any;
        message?: string;
        error?: string;
      }>("/api/ai/agent-chat", {
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

      if (!data.success) {
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
      console.warn("Speech recognition notice:", event.error);
      if (event.error === "not-allowed") {
        setVoiceError("Microphone permission was denied. Please allow microphone access in your browser address bar.");
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
      const data = await safeFetchJson<{
        success: boolean;
        spokenReply: string;
        detectedEmotionOrIntent?: string;
        message?: string;
        error?: string;
      }>("/api/ai/agent-voice", {
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

      if (!data.success) {
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
      const data = await safeFetchJson<{
        success: boolean;
        executionNote?: string;
        externalExecutionLink?: string;
        error?: string;
      }>("/api/ai/agent-action-execute", {
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

      if (!data.success) {
        throw new Error(data.error || "Execution failed.");
      }

      const updatedTask: AgentActionTask = {
        ...task,
        status: "COMPLETED",
        executionNotes: data.executionNote || "Approved and executed.",
        updatedAt: new Date().toISOString(),
      };

      await saveAgentTask(updatedTask, user);
      showToast(data.executionNote || "Task approved and completed.", "success");
    } catch (err) {
      showToast("Action approval could not be executed.", "warning");
    } finally {
      setIsExecutingAction(null);
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteAgentTask(taskId, user);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      showToast("Task removed.", "info");
    } catch {
      showToast("Could not delete task.", "warning");
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
        const data = await safeFetchJson<{
          success: boolean;
          document: { fileType: string; extractedText: string; summary: string };
          error?: string;
        }>("/api/ai/agent-document-parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: file.name,
            mimeType: file.type || "application/octet-stream",
            base64Data,
            userId: user?.uid,
          }),
        });

        if (!data.success) {
          throw new Error(data.error || "Could not parse document.");
        }

        const newDoc: BusinessDocument = {
          id: `doc_${Date.now()}`,
          userId: user?.uid || "guest",
          agentId: activeAgent?.id,
          name: file.name,
          fileType: (data.document.fileType as BusinessDocument["fileType"]) || "other",
          sizeBytes: file.size,
          extractedText: data.document.extractedText,
          summary: data.document.summary,
          uploadedAt: new Date().toISOString(),
        };

        setDocuments((prev) => [newDoc, ...prev]);
        setDocUploadNotice(`✓ Successfully extracted and indexed "${file.name}" into business knowledge.`);
        showToast(`Document "${file.name}" added to agent memory!`, "success");
      };
      reader.readAsDataURL(file);
    } catch (err: unknown) {
      setDocUploadNotice(`⚠️ Upload notice: ${normalizeErrorMessage(err, "Failed to parse document.")}`);
    } finally {
      setIsUploadingDoc(false);
    }
  };

  // 6. URL Auto-Detection & Real Analysis
  const handleAnalyzeUrl = async () => {
    if (!inspectUrl.trim() || isAnalyzingUrl) return;
    setIsAnalyzingUrl(true);
    setUrlAnalysisResult(null);

    try {
      const data = await safeFetchJson<any>("/api/ai/agent-url-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: inspectUrl.trim(),
          agentConfig: activeAgent,
          language: activeAgent?.preferredLanguage || "English",
        }),
      });

      setUrlAnalysisResult(data);
    } catch (err) {
      setUrlAnalysisResult({ success: false, error: normalizeErrorMessage(err) });
    } finally {
      setIsAnalyzingUrl(false);
    }
  };

  // 7. Image / Screenshot Problem Solver
  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const resultStr = reader.result as string;
      const base64 = resultStr.split(",")[1];
      setScreenshotBase64(base64);
      setScreenshotMime(file.type || "image/png");
      setImageAnalysisResult(null);
    };
    reader.readAsDataURL(file);
  };

  const handleRunScreenshotSolver = async () => {
    if (!screenshotBase64 || isAnalyzingImage) return;
    setIsAnalyzingImage(true);
    setImageAnalysisResult(null);

    try {
      const data = await safeFetchJson<{
        success: boolean;
        result: any;
        error?: string;
      }>("/api/ai/agent-tool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: "analyzeImage",
          args: {
            imageBase64: screenshotBase64,
            mimeType: screenshotMime,
            imageType: "business_problem",
            notes: screenshotUserNotes,
          },
          agentConfig: activeAgent,
          language: activeAgent?.preferredLanguage || "English",
          userId: user?.uid,
          userPlan: plan,
          isAnonymous,
        }),
      });

      if (!data.success) {
        throw new Error(data.error || "Failed to analyze screenshot.");
      }
      setImageAnalysisResult(data.result?.data || data.result);
      await consumeCredit();
      showToast("Screenshot diagnostic completed!", "success");
    } catch (err) {
      showToast(normalizeErrorMessage(err, "Failed to analyze image."), "warning");
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  // 8. Generate Specific Business Reports
  const handleGenerateReport = async (reportType: string) => {
    if (!activeAgent || isGeneratingReport) return;
    const creditCheck = canPerformAIAction();
    if (!creditCheck.allowed) {
      if (creditCheck.reason === "need_signup") openSignupModal();
      else openLimitModal();
      return;
    }

    setIsGeneratingReport(reportType);
    try {
      const data = await safeFetchJson<{
        success: boolean;
        report: {
          id: string;
          title: string;
          type: string;
          category: string;
          summary: string;
          content: string;
          createdAt: string;
          isSaved?: boolean;
        };
        message?: string;
        error?: string;
      }>("/api/ai/agent-report-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType,
          agentConfig: activeAgent,
          customFocus: reportCustomFocus.trim() || undefined,
          language: activeAgent.preferredLanguage || "English",
          userId: user?.uid,
          userPlan: plan,
          isAnonymous,
        }),
      });

      if (!data.success) {
        throw new Error(data.message || data.error || "Failed to generate report.");
      }

      await consumeCredit();
      const newRep = data.report;
      setAgentReports((prev) => [newRep, ...prev]);
      setViewingReport(newRep);
      showToast(`Generated "${reportType}"!`, "success");
    } catch (err: unknown) {
      showToast(normalizeErrorMessage(err, "Could not generate report."), "warning");
    } finally {
      setIsGeneratingReport(null);
    }
  };

  // Save report to Cloud Vault
  const handleSaveReportToVault = async (rep: any) => {
    try {
      const itemToSave: Omit<SavedItem, "id" | "createdAt"> = {
        title: rep.title,
        type: "business",
        category: rep.category || "Business Analysis",
        summary: rep.summary || "",
        content: rep.content,
      };

      if (onSaveReport) {
        onSaveReport(itemToSave);
      } else {
        await saveReport(itemToSave, user);
      }

      setAgentReports((prev) =>
        prev.map((r) => (r.id === rep.id ? { ...r, isSaved: true } : r))
      );
      showToast("Report saved to Trade Vault!", "success");
    } catch (err) {
      showToast("Could not save report.", "warning");
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* STATUS TOAST NOTIFICATION */}
      {statusToast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-2xl shadow-2xl border text-xs font-semibold flex items-center gap-2 transition-all backdrop-blur-md animate-fade-in ${
          statusToast.type === "success" 
            ? "bg-emerald-950/90 border-emerald-500/50 text-emerald-200"
            : statusToast.type === "warning"
            ? "bg-rose-950/90 border-rose-500/50 text-rose-200"
            : "bg-cyan-950/90 border-cyan-500/50 text-cyan-200"
        }`}>
          {statusToast.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          {statusToast.type === "warning" && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
          {statusToast.type === "info" && <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />}
          <span>{statusToast.message}</span>
        </div>
      )}

      {/* 1. MAIN AGENT CARD (ITEM 20) */}
      <div className="relative p-5 sm:p-7 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-950 border-2 border-cyan-500/40 shadow-2xl overflow-hidden space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-400 via-teal-400 to-indigo-500 flex items-center justify-center text-slate-950 font-black shrink-0 shadow-lg shadow-cyan-500/30">
              <Bot className="w-7 h-7 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  AI BUSINESS AGENT
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Status: Active
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
                {activeAgent ? activeAgent.name : "My AI Business Agent"}
              </h2>
              <p className="text-xs text-slate-300 max-w-xl">
                {activeAgent
                  ? `${activeAgent.industry} • ${activeAgent.location || "Global"} — Your AI assistant for business research, analysis, planning and repetitive work.`
                  : "Your AI assistant for business research, analysis, planning and repetitive work."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {agents.length > 1 && (
              <select
                value={activeAgentId || ""}
                onChange={(e) => setActiveAgentId(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 outline-none focus:border-cyan-400 font-semibold"
              >
                {agents.map((ag) => (
                  <option key={ag.id} value={ag.id}>
                    {ag.name} ({ag.industry})
                  </option>
                ))}
              </select>
            )}

            {activeAgent && (
              <button
                type="button"
                onClick={openEditAgentModal}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                title="Edit Agent details and business facts"
              >
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>Edit Agent</span>
              </button>
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
              className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-400/20 transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Create My AI Agent</span>
            </button>
          </div>
        </div>

        {/* Quick Launch Action Buttons on Main Card (Item 20) */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSection("chat")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeSection === "chat" 
                ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25" 
                : "bg-slate-950/80 hover:bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Chat</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection("voice")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeSection === "voice" 
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" 
                : "bg-slate-950/80 hover:bg-slate-900 border border-slate-800 text-indigo-300 hover:text-white"
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>🎙 Talk</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection("analyze")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeSection === "analyze" 
                ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25" 
                : "bg-slate-950/80 hover:bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Analyze</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection("tasks")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeSection === "tasks" 
                ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25" 
                : "bg-slate-950/80 hover:bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Tasks</span>
            {tasks.filter(t => t.status === "WAITING FOR APPROVAL").length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black">
                {tasks.filter(t => t.status === "WAITING FOR APPROVAL").length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSection("reports")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeSection === "reports" 
                ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25" 
                : "bg-slate-950/80 hover:bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Reports</span>
          </button>

          <button
            type="button"
            onClick={openEditAgentModal}
            className="ml-auto px-3 py-1.5 rounded-xl bg-purple-950/70 hover:bg-purple-900/80 border border-purple-500/40 text-purple-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-purple-400" />
            <span>Edit Business Context</span>
          </button>
        </div>
      </div>

      {/* 2. AGENT DASHBOARD NAVIGATION (ITEM 3) */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-950/90 border border-slate-800 overflow-x-auto scrollbar-none text-xs">
        {[
          { id: "chat" as const, label: "Chat", icon: Bot },
          { id: "voice" as const, label: "Talk", icon: Mic },
          { id: "analyze" as const, label: "Analyze", icon: Search },
          { id: "tasks" as const, label: "Tasks", icon: CheckCircle2, badge: tasks.filter(t => t.status === "WAITING FOR APPROVAL").length },
          { id: "reports" as const, label: "Reports", icon: FileText, badge: agentReports.length },
          { id: "context" as const, label: "Business Context", icon: Sliders },
          { id: "documents" as const, label: "Documents", icon: FileCheck, badge: documents.length },
          { id: "settings" as const, label: "Settings", icon: SettingsIcon },
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

      {/* SECTION 1: CHAT */}
      {activeSection === "chat" && (
        <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <strong className="text-white">Active Conversation</strong>
              <span className="text-slate-400">• {activeAgent?.name || "Business Agent"} ({activeAgent?.industry})</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveSection("voice")}
                className="px-2.5 py-1 rounded-lg bg-indigo-950 hover:bg-indigo-900 border border-indigo-700/50 text-indigo-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Mic className="w-3.5 h-3.5 text-indigo-400" />
                <span>Talk to AI</span>
              </button>
            </div>
          </div>

          {/* Quick Starter Chips */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {[
              "Why are my sales low?",
              "Analyze my website",
              "Create a 7-day social media plan",
              "Write a reply to this customer",
              "How can I get more leads?",
              "Make a marketing plan",
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
          <div className="space-y-3 min-h-[300px] max-h-[500px] overflow-y-auto p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
            {chatMessages.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs space-y-2">
                <Bot className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="font-semibold text-slate-400">Ask your AI Business Agent anything.</p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Greetings receive polite conversation, while business inquiries automatically switch into practical planning and deliverable preparation.
                </p>
              </div>
            ) : (
              chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"} space-y-1.5`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-gradient-to-r from-cyan-600 to-indigo-600 text-white font-medium"
                        : "bg-slate-900 border border-slate-800 text-slate-100 shadow-md"
                    }`}
                  >
                    {msg.content}
                  </div>

                  {/* PREPARED ACTION APPROVAL CARD (ITEM 14) */}
                  {msg.preparedTask && (
                    <div className="w-full max-w-lg p-3.5 rounded-2xl bg-gradient-to-r from-indigo-950/90 to-slate-900 border-2 border-indigo-500/50 shadow-xl space-y-2.5">
                      <div className="flex items-center justify-between pb-1.5 border-b border-indigo-800/50">
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase tracking-wider border border-amber-500/40">
                          PREPARED BY AI • WAITING FOR APPROVAL
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Target: {msg.preparedTask.targetPlatform || "Direct"}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-white">
                        {msg.preparedTask.title}
                      </h4>

                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                        {msg.preparedTask.previewContent}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-slate-400">
                          Budget: {msg.preparedTask.estimatedCostOrBudget || "$0"}
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
                <span>Agent thinking & grounding response in business memory...</span>
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
              placeholder={`Ask ${activeAgent?.name || "your agent"} or request a business task...`}
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

      {/* SECTION 2: TALK (VOICE) */}
      {activeSection === "voice" && (
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-indigo-500/40 shadow-2xl text-center space-y-6">
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

      {/* SECTION 3: ANALYZE (URL AUTO DETECTION & SCREENSHOT PROBLEM SOLVER) */}
      {activeSection === "analyze" && (
        <div className="space-y-6">
          {/* A. URL Auto-Detection & Inspection */}
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                <h3 className="text-base font-bold text-white">URL Auto-Detection & Multi-Channel Analysis</h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Automatically detects Website, YouTube video/channel, Instagram, Google Business, or App Store URLs.
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
                <span>Inspect URL</span>
              </button>
            </div>

            {urlAnalysisResult && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-cyan-300 uppercase">
                    Detected Platform: {urlAnalysisResult.platform || "URL"}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    urlAnalysisResult.dataLabel === "OBSERVED"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  }`}>
                    {urlAnalysisResult.dataLabel || "NEEDS VERIFICATION"}
                  </span>
                </div>
                <p className="text-slate-200">{urlAnalysisResult.summary}</p>
                {urlAnalysisResult.observedData && (
                  <pre className="text-slate-400 whitespace-pre-wrap font-mono text-[11px] max-h-52 overflow-y-auto p-2 rounded-xl bg-slate-900 border border-slate-800">
                    {JSON.stringify(urlAnalysisResult.observedData, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>

          {/* B. Multimodal Screenshot Problem Solver (Item 12) */}
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Visual Screenshot & Image Problem Solver</h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Upload a screenshot of your website, ads manager, analytics dashboard, or document. The agent extracts: WHAT I SEE, THE PROBLEM, WHY IT MATTERS, HOW TO FIX IT, and NEXT STEP.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block p-4 rounded-2xl border-2 border-dashed border-slate-800 hover:border-cyan-500/50 bg-slate-950/60 text-center cursor-pointer transition-all">
                  <Upload className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
                  <span className="text-xs font-bold text-white block">Upload Screenshot</span>
                  <span className="text-[11px] text-slate-500">PNG, JPG, WebP supported</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleScreenshotUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Optional context or question:</label>
                <textarea
                  rows={3}
                  value={screenshotUserNotes}
                  onChange={(e) => setScreenshotUserNotes(e.target.value)}
                  placeholder="e.g. Why is the bounce rate high on this page? or Why are these Facebook Ads not converting?"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 outline-none focus:border-cyan-400"
                />
                <button
                  type="button"
                  onClick={handleRunScreenshotSolver}
                  disabled={!screenshotBase64 || isAnalyzingImage}
                  className="w-full mt-2 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isAnalyzingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 fill-slate-950" />}
                  <span>Diagnose Screenshot</span>
                </button>
              </div>
            </div>

            {imageAnalysisResult && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-cyan-500/40 space-y-3 text-xs">
                <div className="border-b border-slate-800 pb-2">
                  <span className="text-[10px] uppercase font-mono font-bold text-cyan-300">
                    Visual Diagnostic Report
                  </span>
                </div>
                <div className="space-y-2">
                  <div>
                    <strong className="text-cyan-400 block uppercase text-[10px]">What I See:</strong>
                    <p className="text-slate-200">{imageAnalysisResult.whatISee || imageAnalysisResult.summary}</p>
                  </div>
                  <div>
                    <strong className="text-rose-400 block uppercase text-[10px]">The Problem:</strong>
                    <p className="text-slate-200">{imageAnalysisResult.theProblem || imageAnalysisResult.problemIdentified}</p>
                  </div>
                  <div>
                    <strong className="text-amber-400 block uppercase text-[10px]">Why It Matters:</strong>
                    <p className="text-slate-200">{imageAnalysisResult.whyItMatters || "Impacts conversion rate and revenue."}</p>
                  </div>
                  <div>
                    <strong className="text-emerald-400 block uppercase text-[10px]">How To Fix It:</strong>
                    <p className="text-slate-200">{imageAnalysisResult.howToFixIt}</p>
                  </div>
                  <div>
                    <strong className="text-indigo-400 block uppercase text-[10px]">Next Step:</strong>
                    <p className="text-slate-200">{imageAnalysisResult.nextStep}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 4: TASKS & APPROVAL SYSTEM (ITEMS 12 & 14) */}
      {activeSection === "tasks" && (
        <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white">Task & Action Approval Board</h3>
              <p className="text-xs text-slate-400">
                Principle: AI drafts the work $\rightarrow$ You approve before anything is sent or published.
              </p>
            </div>
            <span className="text-xs text-cyan-400 font-mono">
              Total Tasks: {tasks.length}
            </span>
          </div>

          {/* Task Status Filters */}
          <div className="flex gap-1.5 text-xs flex-wrap">
            {["ALL", "WAITING FOR APPROVAL", "TODO", "IN PROGRESS", "COMPLETED", "FAILED"].map((f) => (
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
                          : task.status === "FAILED"
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                          : "bg-slate-800 text-slate-300"
                      }`}>
                        {task.status}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 font-mono">
                          Target: {task.targetPlatform || "General"}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 cursor-pointer"
                          title="Delete task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h4 className="text-xs font-bold text-white">{task.title}</h4>
                    <p className="text-xs text-slate-300 font-mono whitespace-pre-wrap bg-slate-900/60 p-2.5 rounded-xl border border-slate-900">
                      {task.previewContent || task.details}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-xs">
                      <span className="text-[10px] text-slate-500">
                        {task.executionNotes || "Created by AI Business Agent"}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopy(task.previewContent || task.details, `task_${task.id}`)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copiedKey === `task_${task.id}` ? "Copied" : "Copy"}</span>
                        </button>

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
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {/* SECTION 5: REPORTS (ITEM 15) */}
      {activeSection === "reports" && (
        <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white">Business Intelligence Reports</h3>
              <p className="text-xs text-slate-400">
                Generate, view, export, and save structured business reports to your cloud vault.
              </p>
            </div>
            <span className="text-xs text-cyan-400 font-mono">
              Saved in Vault: {agentReports.filter(r => r.isSaved).length}
            </span>
          </div>

          {/* Quick Report Generation Grid */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-300 block">
              Generate Structured Report for {activeAgent?.name || "My Business"}:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                "Business Analysis",
                "SEO Report",
                "Marketing Plan",
                "Sales Plan",
                "Competitor Analysis",
                "Social Media Plan",
                "Website Audit",
                "General Business Report",
              ].map((repType) => (
                <button
                  key={repType}
                  type="button"
                  onClick={() => handleGenerateReport(repType)}
                  disabled={isGeneratingReport !== null}
                  className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 text-left transition-all cursor-pointer disabled:opacity-50 group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <FileText className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                    {isGeneratingReport === repType && <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />}
                  </div>
                  <strong className="text-xs text-white block truncate">{repType}</strong>
                  <span className="text-[10px] text-slate-500">Tap to generate</span>
                </button>
              ))}
            </div>
          </div>

          {/* Reports List */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Generated Reports</h4>
            {agentReports.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs rounded-2xl bg-slate-950 border border-slate-800">
                No reports generated yet. Tap any report template above to generate a comprehensive strategy.
              </div>
            ) : (
              agentReports.map((rep) => (
                <div key={rep.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-white text-xs sm:text-sm">{rep.title}</strong>
                      {rep.isSaved && (
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                          ✓ Saved to Vault
                        </span>
                      )}
                    </div>
                    <p className="text-slate-400 text-[11px] mt-0.5 line-clamp-1">{rep.summary}</p>
                    <span className="text-[10px] text-slate-600 font-mono">
                      Generated: {new Date(rep.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setViewingReport(rep)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-cyan-400" />
                      <span>View</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSaveReportToVault(rep)}
                      disabled={rep.isSaved}
                      className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{rep.isSaved ? "Saved" : "Save"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleExportMarkdown(rep.title, rep.content)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                      title="Export as Markdown file"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setAgentReports((prev) => prev.filter((r) => r.id !== rep.id))}
                      className="p-1.5 rounded-xl text-slate-500 hover:text-rose-400 cursor-pointer"
                      title="Delete report"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SECTION 6: BUSINESS CONTEXT (ITEM 4 & 7) */}
      {activeSection === "context" && activeAgent && (
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white">Saved Business Context & Memory</h3>
              <p className="text-xs text-slate-400">
                The Agent automatically grounds every conversation and generated deliverable in these facts.
              </p>
            </div>
            <button
              type="button"
              onClick={openEditAgentModal}
              className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-cyan-500/20"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Edit Business Context</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 font-mono text-[10px] uppercase block mb-1">Business Name</span>
              <strong className="text-white text-sm">{activeAgent.name || activeAgent.businessName}</strong>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 font-mono text-[10px] uppercase block mb-1">Industry</span>
              <strong className="text-white text-sm">{activeAgent.industry}</strong>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 font-mono text-[10px] uppercase block mb-1">Location</span>
              <span className="text-slate-200">{activeAgent.location || "Global"}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 font-mono text-[10px] uppercase block mb-1">Website URL</span>
              <span className="text-slate-200">{activeAgent.website || "Not provided"}</span>
            </div>

            <div className="sm:col-span-2 p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 font-mono text-[10px] uppercase block mb-1">Products & Services</span>
              <p className="text-slate-200 leading-relaxed">{activeAgent.productsServices || "Not specified"}</p>
            </div>

            <div className="sm:col-span-2 p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 font-mono text-[10px] uppercase block mb-1">Target Customers</span>
              <p className="text-slate-200 leading-relaxed">{activeAgent.targetCustomers || "Not specified"}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 font-mono text-[10px] uppercase block mb-1">Brand Tone</span>
              <span className="text-slate-200">{activeAgent.brandTone || "Professional, direct and helpful"}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 font-mono text-[10px] uppercase block mb-1">Preferred Language</span>
              <span className="text-slate-200">{activeAgent.preferredLanguage || "Auto / Same as user"}</span>
            </div>

            <div className="sm:col-span-2 p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 font-mono text-[10px] uppercase block mb-1">Business Goals</span>
              <p className="text-slate-200 leading-relaxed">{activeAgent.businessGoals || "Growth & customer acquisition"}</p>
            </div>

            <div className="sm:col-span-2 p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 font-mono text-[10px] uppercase block mb-1">Custom Owner Instructions</span>
              <p className="text-slate-200 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">{activeAgent.customInstructions || activeAgent.additionalInstructions || "None specified"}</p>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 7: DOCUMENTS (ITEM 11) */}
      {activeSection === "documents" && (
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white">Business Documents & Knowledge Vault</h3>
              <p className="text-xs text-slate-400">
                Upload PDF, DOCX, TXT, or images. The agent extracts verified facts to remember.
              </p>
            </div>
            <label className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-cyan-500/20">
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
              <div className="sm:col-span-2 p-8 text-center text-slate-500 text-xs rounded-2xl bg-slate-950 border border-slate-800">
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

      {/* SECTION 8: SETTINGS & AGENT MANAGEMENT (ITEM 16 & 18) */}
      {activeSection === "settings" && activeAgent && (
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white">Agent Settings & Multi-Agent Workspace</h3>
              <p className="text-xs text-slate-400">
                Manage your active AI Business Agent configuration and plan allowances.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-[10px] font-mono text-slate-500 uppercase block">Active Agent ID</span>
              <code className="text-cyan-300 text-xs font-mono block break-all">{activeAgent.id}</code>
              <span className="text-[11px] text-slate-400 block">Created: {new Date(activeAgent.createdAt).toLocaleDateString()}</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-[10px] font-mono text-slate-500 uppercase block">Plan Allowance</span>
              <div className="flex items-center justify-between">
                <span className="text-white font-bold">{plan.toUpperCase()} Plan</span>
                <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 font-mono text-xs border border-cyan-800">
                  {agents.length} / {maxAllowedAgents} Agents
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Daily Requests: {planConfig.agentFeatures?.maxDailyRequests === Infinity ? "Unlimited*" : `${planConfig.agentFeatures?.maxDailyRequests} / day`}
              </p>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={openEditAgentModal}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>Edit Agent Details</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("pricing")}
              className="px-4 py-2 rounded-xl bg-purple-950 hover:bg-purple-900 border border-purple-500/40 text-purple-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Upgrade Plan Limits</span>
            </button>

            <button
              type="button"
              onClick={() => handleDeleteAgent(activeAgent.id)}
              className="ml-auto px-4 py-2 rounded-xl bg-rose-950 hover:bg-rose-900 border border-rose-500/40 text-rose-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete This Agent</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE MY AI AGENT (ITEM 1) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-xl rounded-3xl bg-slate-900 border border-cyan-500/50 p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Create My Business AI Agent</h3>
                  <span className="text-[11px] text-slate-400">Only Business Name & Industry required. Skip optional fields anytime.</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={(e) => handleCreateAgent(e)} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-200 block mb-1">Business Name *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Apex Interior Design or City Bakery"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-200 block mb-1">Industry *</label>
                  <input
                    type="text"
                    required
                    value={formIndustry}
                    onChange={(e) => setFormIndustry(e.target.value)}
                    placeholder="e.g. Interior Design, Construction, Cafe, E-Commerce"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-400 block mb-1">Country (Optional)</label>
                  <input
                    type="text"
                    value={formCountry}
                    onChange={(e) => setFormCountry(e.target.value)}
                    placeholder="e.g. India, United States, UK"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-400 block mb-1">City (Optional)</label>
                  <input
                    type="text"
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    placeholder="e.g. Mumbai, New York, London"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-cyan-400"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-400 block mb-1">Website URL (Optional)</label>
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
                <label className="font-semibold text-slate-400 block mb-1">Products / Services (Optional)</label>
                <input
                  type="text"
                  value={formProducts}
                  onChange={(e) => setFormProducts(e.target.value)}
                  placeholder="e.g. Residential interior architecture, custom furniture, 3D floor plans"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-400 block mb-1">Target Customers (Optional)</label>
                <input
                  type="text"
                  value={formCustomers}
                  onChange={(e) => setFormCustomers(e.target.value)}
                  placeholder="e.g. New homeowners, luxury villa owners, corporate offices"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-400 block mb-1">Business Description (Optional)</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="What makes your business unique or high quality..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-cyan-400 resize-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-400 block mb-1">Business Goals (Optional)</label>
                <input
                  type="text"
                  value={formGoals}
                  onChange={(e) => setFormGoals(e.target.value)}
                  placeholder="e.g. Acquire 5 high-ticket design clients per month and automate customer replies"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-400 block mb-1">Brand Tone</label>
                  <select
                    value={formBrandTone}
                    onChange={(e) => setFormBrandTone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-cyan-400"
                  >
                    <option value="Professional, warm & direct">Professional, Warm & Direct</option>
                    <option value="Authoritative & strategic">Authoritative & Strategic</option>
                    <option value="Luxury, exclusive & refined">Luxury & Refined</option>
                    <option value="Modern, friendly & conversational">Modern & Friendly</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-400 block mb-1">Preferred Response Language</label>
                  <input
                    type="text"
                    value={formLanguage}
                    onChange={(e) => setFormLanguage(e.target.value)}
                    placeholder="Auto / Same as user"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-semibold text-slate-500 text-[10px] block mb-1">Social URL</label>
                  <input
                    type="url"
                    value={formSocialUrl}
                    onChange={(e) => setFormSocialUrl(e.target.value)}
                    placeholder="Instagram/LinkedIn"
                    className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-[11px] outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-500 text-[10px] block mb-1">YouTube URL</label>
                  <input
                    type="url"
                    value={formYoutubeUrl}
                    onChange={(e) => setFormYoutubeUrl(e.target.value)}
                    placeholder="Channel link"
                    className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-[11px] outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-500 text-[10px] block mb-1">App URL</label>
                  <input
                    type="url"
                    value={formAppUrl}
                    onChange={(e) => setFormAppUrl(e.target.value)}
                    placeholder="Store link"
                    className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-[11px] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-400 block mb-1">Additional Instructions (Optional)</label>
                <textarea
                  rows={2}
                  value={formInstructions}
                  onChange={(e) => setFormInstructions(e.target.value)}
                  placeholder="e.g. Never offer discounts without prior consultation, always include phone number..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-cyan-400 resize-none"
                />
              </div>

              {createError && (
                <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs">
                  {createError}
                </div>
              )}

              <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => handleCreateAgent(undefined, true)}
                  disabled={isCreatingAgent || !formName.trim() || !formIndustry.trim()}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer disabled:opacity-40"
                >
                  Skip optional fields & create now →
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingAgent}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
                  >
                    {isCreatingAgent ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-slate-950 fill-slate-950" />
                        <span>Create Agent</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT AGENT / BUSINESS CONTEXT (ITEM 3 & 4) */}
      {showEditModal && activeAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-xl rounded-3xl bg-slate-900 border border-purple-500/50 p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Edit Business Agent & Knowledge</h3>
                  <span className="text-[11px] text-slate-400">Updates immediately affect future agent answers and tasks.</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-200 block mb-1">Business Name *</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-200 block mb-1">Industry *</label>
                  <input
                    type="text"
                    required
                    value={editIndustry}
                    onChange={(e) => setEditIndustry(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-400 block mb-1">Country</label>
                  <input
                    type="text"
                    value={editCountry}
                    onChange={(e) => setEditCountry(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-400 block mb-1">City</label>
                  <input
                    type="text"
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-cyan-400"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-400 block mb-1">Website URL</label>
                  <input
                    type="url"
                    value={editWebsite}
                    onChange={(e) => setEditWebsite(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Products / Services</label>
                <textarea
                  rows={2}
                  value={editProducts}
                  onChange={(e) => setEditProducts(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-cyan-400 resize-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Target Customers</label>
                <input
                  type="text"
                  value={editCustomers}
                  onChange={(e) => setEditCustomers(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Business Description</label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-cyan-400 resize-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Business Goals</label>
                <input
                  type="text"
                  value={editGoals}
                  onChange={(e) => setEditGoals(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Brand Tone</label>
                  <input
                    type="text"
                    value={editBrandTone}
                    onChange={(e) => setEditBrandTone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Preferred Language</label>
                  <input
                    type="text"
                    value={editLanguage}
                    onChange={(e) => setEditLanguage(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Additional Instructions</label>
                <textarea
                  rows={3}
                  value={editInstructions}
                  onChange={(e) => setEditInstructions(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-cyan-400 font-mono text-[11px]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-400/20 cursor-pointer disabled:opacity-50"
                >
                  {isSavingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: VIEW REPORT MODAL */}
      {viewingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl bg-slate-900 border border-cyan-500/50 p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-mono text-cyan-400 uppercase">{viewingReport.category}</span>
                <h3 className="font-bold text-base text-white">{viewingReport.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingReport(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 max-h-[55vh] overflow-y-auto text-xs text-slate-200 leading-relaxed font-mono whitespace-pre-wrap">
              {viewingReport.content}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => handleCopy(viewingReport.content, `view_${viewingReport.id}`)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedKey === `view_${viewingReport.id}` ? "Copied" : "Copy Content"}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleExportMarkdown(viewingReport.title, viewingReport.content)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export .MD</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveReportToVault(viewingReport)}
                  className="px-4 py-1.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save to Vault</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

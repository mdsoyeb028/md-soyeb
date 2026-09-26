import React, { useState } from "react";
import { 
  Search, 
  Smartphone, 
  Globe, 
  Briefcase, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  BookmarkCheck, 
  Loader2,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Check,
  ListChecks,
  Compass,
  Zap,
  Target,
  Send,
  MessageSquare,
  Mail,
  PhoneCall,
  Shield,
  HelpCircle,
  CheckSquare,
  Globe2,
  DollarSign,
  TrendingUp,
  Layers,
  ExternalLink
} from "lucide-react";
import { ActiveTab, SavedItem, AssistantResult, ReadyMaterial, ImplementationStep } from "../types";
import { normalizeErrorMessage } from "../utils/errorUtils";
import { useLanguage } from "../i18n/LanguageContext";

interface HomeViewProps {
  setActiveTab: (tab: ActiveTab) => void;
  onSaveItem: (item: Omit<SavedItem, "id" | "createdAt">) => void;
  savedItemIds: string[];
}

const COMMON_SCENARIOS = [
  {
    id: "sales",
    icon: "📉",
    title: "My sales are low",
    query: "My sales are low. Diagnose why buyers aren't purchasing, fix my offer, and create ready-to-use sales copy, WhatsApp follow-ups, and objection scripts.",
    topic: "business",
  },
  {
    id: "customers",
    icon: "👥",
    title: "I don't have customers",
    query: "I don't have customers. Define my ideal customer, create zero-cost acquisition strategies, and write ready-to-send cold outreach and referral messages.",
    topic: "outreach",
  },
  {
    id: "website",
    icon: "🌐",
    title: "Website not converting",
    query: "My website is not getting customers. Inspect observable problems, rewrite my homepage headline, create a high-converting CTA, trust sections, and FAQs.",
    topic: "seo",
  },
  {
    id: "low_budget",
    icon: "💰",
    title: "No money for marketing",
    query: "I have no money for marketing. Activate Low-Budget Mode: prioritize free and zero-cost growth actions, generate ready materials, and build a 7-day execution plan.",
    topic: "marketing",
  },
  {
    id: "local",
    icon: "📍",
    title: "Local business visibility",
    query: "I run a local business and need more walk-ins and phone enquiries. Create Google Business Profile updates, review request messages, and local landing page copy.",
    topic: "business",
  },
  {
    id: "competitors",
    icon: "⚔️",
    title: "Competitors getting customers",
    query: "My competitors are getting more customers than me. Analyze observable gaps, create an unbeatable positioning angle, and write copy that differentiates my offer.",
    topic: "branding",
  },
  {
    id: "growth",
    icon: "📈",
    title: "Comprehensive 90-day plan",
    query: "I want to grow my business systematically. Create an execution roadmap for TODAY, 7 DAYS, 30 DAYS, 60 DAYS, and 90 DAYS with all needed materials.",
    topic: "business",
  },
];

export const HomeView: React.FC<HomeViewProps> = ({ setActiveTab, onSaveItem }) => {
  const { t, language, languageInfo, isRtl } = useLanguage();
  const [query, setQuery] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [showWebsiteInput, setShowWebsiteInput] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMode, setLoadingMode] = useState<"solve" | "create_all" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [assistantData, setAssistantData] = useState<AssistantResult | null>(null);
  const [responseContent, setResponseContent] = useState<string | null>(null);
  
  // Interactive Next Action & Material Tracking
  const [activeNextActionIndex, setActiveNextActionIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [hasSaved, setHasSaved] = useState(false);
  const [selectedMaterialCategory, setSelectedMaterialCategory] = useState<string>("all");

  const assistantTopics = [
    { id: "all", label: t("home.topicAll", "All Topics") },
    { id: "seo", label: t("home.topicSeo", "🔍 SEO & Website") },
    { id: "social", label: t("home.topicSocial", "📱 Social Media") },
    { id: "export", label: t("home.topicExport", "🌐 Export & Trade") },
    { id: "business", label: t("home.topicBusiness", "💼 Business & Sales") },
    { id: "marketing", label: t("home.topicMarketing", "📣 Growth Marketing") },
    { id: "branding", label: t("home.topicBranding", "✨ Brand & USP") },
    { id: "outreach", label: t("home.topicOutreach", "💬 Buyer Outreach") },
  ];

  const handleAskAI = async (textToAsk?: string, categoryOverride?: string, doItForMe: boolean = false) => {
    const promptToUse = textToAsk || query;
    if (!promptToUse.trim()) {
      setErrorMessage(t("errors.emptyQuery", "Please describe your business problem or select a scenario below."));
      return;
    }

    if (isLoading) return;

    setIsLoading(true);
    setLoadingMode(doItForMe ? "create_all" : "solve");
    setErrorMessage(null);
    setAssistantData(null);
    setResponseContent(null);
    setHasSaved(false);
    setActiveNextActionIndex(0);
    setCompletedSteps({});

    const topicToUse = categoryOverride || selectedTopic;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout

    try {
      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ 
          query: promptToUse.trim(),
          category: topicToUse !== "all" ? topicToUse : "General Business Growth & Export Strategy",
          websiteUrl: websiteUrl.trim() || undefined,
          doItForMe,
          language: languageInfo.code,
          languageName: `${languageInfo.nativeName} (${languageInfo.name})`,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const contentTypeHeader = res.headers.get("content-type") || "";
      if (!contentTypeHeader.includes("application/json")) {
        const rawText = await res.text();
        const snippet = rawText.slice(0, 150).replace(/<[^>]*>/g, "").trim();
        const fallbackMsg = snippet 
          ? `Server returned HTTP ${res.status}: ${snippet}` 
          : `The AI Problem Solver returned an unexpected response (HTTP ${res.status}).`;
        throw new Error(fallbackMsg);
      }

      const data = await res.json();
      if (!res.ok || data.success === false) {
        const rawError = data?.error || data?.message || data?.detail || `AI service returned error (HTTP ${res.status})`;
        const errorDetail = normalizeErrorMessage(rawError, "The AI Problem Solver is temporarily unavailable. Please try again.");
        throw new Error(errorDetail);
      }

      const payload = data.data || data;
      setAssistantData(payload);
      setResponseContent(payload.content || data.content || payload.answer || "Problem solved and materials generated.");

      // Smooth scroll to response container
      setTimeout(() => {
        document.getElementById("ai-response-container")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      console.error("AI Problem Solver error:", err);
      let msg = "AI Problem Solver failed to process your inquiry.";
      if (err instanceof Error && err.name === "AbortError") {
        msg = "Request timed out after 45 seconds. Please try again with a shorter inquiry.";
      } else {
        msg = normalizeErrorMessage(err, "AI Problem Solver failed to process inquiry.");
      }
      setErrorMessage(msg);
      setAssistantData(null);
      setResponseContent(null);
    } finally {
      setIsLoading(false);
      setLoadingMode(null);
    }
  };

  const handleCopyText = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2200);
  };

  const handleSave = () => {
    if (!responseContent && !assistantData) return;
    onSaveItem({
      type: "assistant",
      title: query ? `Solution: ${query.slice(0, 45)}...` : "Business Problem Solution & Assets",
      summary: assistantData?.diagnosis?.priorityFix 
        ? `Priority Fix: ${assistantData.diagnosis.priorityFix}`
        : (assistantData?.answer ? assistantData.answer.slice(0, 120) + "..." : "Self-solving business diagnosis and copyable materials."),
      content: responseContent || assistantData?.answer || "Solution plan",
      category: "Self-Solving Business Plan",
      tags: ["Problem Solver", assistantData?.problemType || "Growth", "Ready Materials"],
    });
    setHasSaved(true);
  };

  const toggleStepCompleted = (stepId: string) => {
    setCompletedSteps(prev => ({ ...prev, [stepId]: !prev[stepId] }));
  };

  // Determine current active next action
  const nextActionItem = assistantData?.nextAction;
  const implementationSteps = assistantData?.implementationSteps || [];
  const readyMaterials = assistantData?.readyMaterials || [];

  // Filter ready materials by category
  const filteredMaterials = readyMaterials.filter(m => {
    if (selectedMaterialCategory === "all") return true;
    return m.category === selectedMaterialCategory;
  });

  const materialCategories = Array.from(new Set(readyMaterials.map(m => m.category)));

  // Calculate problem-solving progress
  const completedCount = Object.values(completedSteps).filter(Boolean).length;
  const totalCount = implementationSteps.length > 0 ? implementationSteps.length : 4;
  const isAllComplete = completedCount >= totalCount && totalCount > 0;

  return (
    <div className="space-y-6 pb-6">
      {/* 1. First Screen Hero Header */}
      <section className="text-center pt-3 pb-2 space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 text-xs font-semibold backdrop-blur-md">
          <Zap className="w-3.5 h-3.5 text-cyan-400" />
          <span>SELF-SOLVING BUSINESS GROWTH ENGINE</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white uppercase drop-shadow-sm">
          {t("home.heroTitle", "ACTUALLY SOLVE YOUR BUSINESS PROBLEM")}
        </h1>
        
        <p className="text-sm sm:text-base text-cyan-200/90 font-medium max-w-xl mx-auto">
          We don't give you articles or external links to read. We diagnose the bottleneck, create the solution, and generate the exact copyable materials inside the app.
        </p>

        {/* Workflow Diagram Banner */}
        <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-slate-400 pt-1 font-mono">
          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-400 font-semibold">1. PROBLEM</span>
          <span>→</span>
          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-blue-400 font-semibold">2. DIAGNOSIS</span>
          <span>→</span>
          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-purple-400 font-semibold">3. SOLUTION</span>
          <span>→</span>
          <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-semibold">4. READY MATERIALS</span>
          <span>→</span>
          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-emerald-400 font-semibold">5. ACTION</span>
        </div>
      </section>

      {/* 2. Quick Problem Scenario Selection */}
      <section className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-cyan-400" />
            Select Your Exact Business Emergency:
          </span>
          <span className="text-[11px] text-slate-500">1-click automated diagnosis</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {COMMON_SCENARIOS.map((scen) => (
            <button
              key={scen.id}
              onClick={() => {
                setQuery(scen.query);
                setSelectedTopic(scen.topic);
                handleAskAI(scen.query, scen.topic, false);
              }}
              className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 transition-all text-left group active:scale-95 cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-base">{scen.icon}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-cyan-400 transition-colors" />
              </div>
              <span className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors line-clamp-1">
                {scen.title}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* 3. Central Problem Solver Input Panel */}
      <section className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900/95 via-slate-900/80 to-indigo-950/60 border border-cyan-500/40 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <h2 className="font-bold text-sm sm:text-base text-white">
              Describe Your Business Problem
            </h2>
          </div>
          <span className="text-[10px] uppercase font-semibold tracking-wider text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded-full border border-cyan-800/60">
            {languageInfo.nativeName} ({language.toUpperCase()})
          </span>
        </div>

        <p className="text-xs text-slate-300 mb-2.5">
          Tell us what is failing (e.g. "My website is not getting customers", "Sales dropped 40%", "I have zero budget").
        </p>

        {/* Topic Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2.5 scrollbar-none">
          {assistantTopics.map((topic) => (
            <button
              key={topic.id}
              onClick={() => setSelectedTopic(topic.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors border cursor-pointer ${
                selectedTopic === topic.id
                  ? "bg-cyan-500/25 text-cyan-300 border-cyan-500/50"
                  : "bg-slate-950/60 hover:bg-slate-800 text-slate-400 border-slate-800"
              }`}
            >
              {topic.label}
            </button>
          ))}
        </div>

        {/* Problem Description Textarea */}
        <div className="space-y-2">
          <textarea
            id="ai-central-input"
            rows={3}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAskAI();
              }
            }}
            placeholder="Describe your business, customer target, and problem: e.g. 'I sell handcrafted ceramics online. Visitors browse my store but nobody clicks Buy. What should I change?'"
            className="w-full rounded-xl bg-slate-950/90 border border-slate-700/80 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 text-white placeholder-slate-500 p-3.5 text-xs sm:text-sm resize-none outline-none transition-all"
          />

          {/* Optional Website URL Toggle & Input */}
          <div className="pt-1">
            {!showWebsiteInput && !websiteUrl ? (
              <button
                type="button"
                onClick={() => setShowWebsiteInput(true)}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>+ Include Website URL for live crawler inspection (identifies conversion bottlenecks)</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                <Globe className="w-4 h-4 text-cyan-400 shrink-0" />
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://yourbusiness.com (we crawl observable headlines and CTAs)"
                  className="w-full bg-transparent text-xs text-white placeholder-slate-500 outline-none"
                />
                {websiteUrl && (
                  <button
                    type="button"
                    onClick={() => setWebsiteUrl("")}
                    className="text-slate-500 hover:text-white text-xs px-1"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Prominent Action Buttons: "🚀 Solve My Problem" and "⚡ Create Everything For Me" */}
          <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2">
            <span className="text-[11px] text-slate-400 hidden lg:inline">
              Instant diagnosis + copyable messages & action plan
            </span>

            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
              {/* Primary Button 1: "🚀 Solve My Problem" */}
              <button
                id="btn-solve-my-problem"
                onClick={() => handleAskAI(query, selectedTopic, false)}
                disabled={isLoading || !query.trim()}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 active:scale-95 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading && loadingMode === "solve" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Diagnosing & Solving...</span>
                  </>
                ) : (
                  <>
                    <RocketIcon className="w-4 h-4" />
                    <span>🚀 Solve My Problem</span>
                  </>
                )}
              </button>

              {/* Primary Button 2: "⚡ Create Everything For Me" */}
              <button
                id="btn-create-everything"
                onClick={() => handleAskAI(query, selectedTopic, true)}
                disabled={isLoading || !query.trim()}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 active:scale-95 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                title="Generates complete ready-to-copy marketing copy, sales sequences, headlines, and prioritized 30-day checklist."
              >
                {isLoading && loadingMode === "create_all" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Creating Complete Materials...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-amber-300" />
                    <span>⚡ Create Everything For Me</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Error Alert Banner */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-950/70 border border-rose-500/50 text-rose-200 backdrop-blur-xl space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>Problem Solver Error</span>
          </div>
          <p className="text-xs text-rose-200/90 leading-relaxed">
            {errorMessage}
          </p>
          <button
            onClick={() => handleAskAI(query, selectedTopic, false)}
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-900/80 hover:bg-rose-800 text-white text-xs font-semibold border border-rose-700 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Solving</span>
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. SELF-SOLVING OUTPUT SECTION (DIAGNOSIS, MATERIALS & ACTIONS) */}
      {/* ============================================================== */}
      {assistantData && (
        <section 
          id="ai-response-container" 
          className="p-4 sm:p-6 rounded-2xl bg-slate-900/95 border border-cyan-500/40 shadow-2xl backdrop-blur-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200"
        >
          {/* Header Bar with Status & Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                <CheckCircle2 className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <span className="font-bold text-sm sm:text-base text-white block">
                  Self-Solving Business Plan & Materials
                </span>
                <span className="text-[11px] text-cyan-300/80 flex items-center gap-1">
                  <span>Target: {languageInfo.nativeName}</span>
                  {assistantData.isLowBudgetMode && (
                    <span className="px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-800/60 font-semibold text-[10px]">
                      💰 LOW-BUDGET MODE ACTIVE
                    </span>
                  )}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleCopyText(responseContent || assistantData.answer, "all-content")}
                id="copy-all-solution-btn"
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer"
              >
                {copiedId === "all-content" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
                <span>{copiedId === "all-content" ? "Copied!" : "Copy Full Brief"}</span>
              </button>
              <button
                onClick={handleSave}
                id="save-solution-btn"
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border cursor-pointer ${
                  hasSaved
                    ? "bg-emerald-950 text-emerald-300 border-emerald-700"
                    : "bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border-cyan-700"
                }`}
              >
                <BookmarkCheck className="w-3.5 h-3.5" />
                <span>{hasSaved ? "Saved in Vault" : "Save Plan"}</span>
              </button>
            </div>
          </div>

          {/* 4.A PROBLEM-SOLVING PROGRESS SCORE BAR (Real completed actions tracker, not fake score) */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-cyan-400" />
                Problem-Solving Execution Progress:
              </span>
              <span className="text-[11px] text-cyan-400 font-mono font-bold">
                {completedCount} of {totalCount} actions completed
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-[11px] pt-1">
              <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>Problem identified</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>Diagnosis</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>Solution created</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>Materials ready</span>
              </div>
              <div className={`flex items-center gap-1.5 font-medium ${
                completedCount > 0 ? "text-cyan-400" : "text-slate-500"
              }`}>
                {completedCount > 0 ? <Check className="w-3.5 h-3.5 shrink-0" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-600" />}
                <span>Implementation</span>
              </div>
              <div className={`flex items-center gap-1.5 font-medium ${
                isAllComplete ? "text-emerald-400" : "text-slate-500"
              }`}>
                {isAllComplete ? <Check className="w-3.5 h-3.5 shrink-0" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-600" />}
                <span>Measurement</span>
              </div>
            </div>
          </div>

          {/* 4.B YOUR AUTOMATIC NEXT ACTION (Prominent, guided action box) */}
          {nextActionItem && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/60 via-slate-950 to-indigo-950/60 border-2 border-cyan-500/60 shadow-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-cyan-500 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                    YOUR NEXT ACTION
                  </span>
                  <span className="text-xs font-bold text-white">
                    {nextActionItem.title}
                  </span>
                </div>
                <span className="text-[11px] text-cyan-300 font-mono">
                  Where: {nextActionItem.whereToUse || "Execute immediately"}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
                {nextActionItem.actionText}
              </p>

              {nextActionItem.materialToCopy && (
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between gap-3 text-xs text-cyan-200 font-mono">
                  <span className="truncate">{nextActionItem.materialToCopy}</span>
                  <button
                    onClick={() => handleCopyText(nextActionItem.materialToCopy!, "next-action-copy")}
                    className="shrink-0 px-2 py-1 rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedId === "next-action-copy" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedId === "next-action-copy" ? "Copied!" : "Copy"}</span>
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-400 italic">
                  I prepared everything. You only need to copy, send, or publish it.
                </span>
                <button
                  onClick={() => {
                    const stepKey = `step-${activeNextActionIndex}`;
                    toggleStepCompleted(stepKey);
                    setActiveNextActionIndex(prev => prev + 1);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Mark Complete & Advance</span>
                </button>
              </div>
            </div>
          )}

          {/* 4.C PRIORITY FIX & DIAGNOSTIC BREAKDOWN */}
          {assistantData.diagnosis && (
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Likely Bottlenecks & Priority Fix
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Root Cause Analysis
                </span>
              </div>

              {assistantData.diagnosis.priorityFix && (
                <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-500/40 text-xs text-amber-200">
                  <span className="font-bold text-amber-300 block mb-0.5">
                    ⚡ Priority Fix (Fix This First):
                  </span>
                  <span>{assistantData.diagnosis.priorityFix}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {assistantData.diagnosis.likelyBottlenecks && assistantData.diagnosis.likelyBottlenecks.length > 0 && (
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="font-semibold text-slate-300 block mb-1">
                      Identified Bottlenecks:
                    </span>
                    <ul className="space-y-1 text-slate-400 text-[11px] list-disc list-inside">
                      {assistantData.diagnosis.likelyBottlenecks.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {assistantData.diagnosis.confirmedFindings && assistantData.diagnosis.confirmedFindings.length > 0 && (
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="font-semibold text-slate-300 block mb-1">
                      Observable Findings:
                    </span>
                    <ul className="space-y-1 text-slate-400 text-[11px] list-disc list-inside">
                      {assistantData.diagnosis.confirmedFindings.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4.D READY-TO-USE MATERIALS (Headline, WhatsApp, Email, Scripts, FAQ) */}
          {readyMaterials.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    Ready-to-Use Materials (Copy & Use Directly)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    I prepared everything inside the app. You only need to copy, publish, or send it.
                  </p>
                </div>

                {/* Material Category Filter */}
                {materialCategories.length > 1 && (
                  <div className="flex items-center gap-1 overflow-x-auto text-[10px]">
                    <button
                      onClick={() => setSelectedMaterialCategory("all")}
                      className={`px-2 py-0.5 rounded-lg border transition-colors ${
                        selectedMaterialCategory === "all"
                          ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-semibold"
                          : "bg-slate-900 text-slate-400 border-slate-800"
                      }`}
                    >
                      All ({readyMaterials.length})
                    </button>
                    {materialCategories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedMaterialCategory(cat)}
                        className={`px-2 py-0.5 rounded-lg border transition-colors capitalize ${
                          selectedMaterialCategory === cat
                            ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-semibold"
                            : "bg-slate-900 text-slate-400 border-slate-800"
                        }`}
                      >
                        {cat.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Material Cards Grid */}
              <div className="grid grid-cols-1 gap-3">
                {filteredMaterials.map((mat) => (
                  <div
                    key={mat.id}
                    className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-cyan-500/40 transition-colors space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                          {mat.category.replace("_", " ")}
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-white">
                          {mat.title}
                        </h4>
                      </div>

                      <button
                        onClick={() => handleCopyText(mat.content, mat.id)}
                        className="px-2.5 py-1 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                      >
                        {copiedId === mat.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedId === mat.id ? "Copied!" : "Copy"}</span>
                      </button>
                    </div>

                    {mat.description && (
                      <p className="text-[11px] text-slate-400">
                        {mat.description}
                      </p>
                    )}

                    {/* OLD vs NEW Comparison if available */}
                    {mat.oldVsNew && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold text-rose-400 uppercase">
                            Previous / Weak:
                          </span>
                          <p className="text-[11px] text-rose-200/80 line-through">
                            {mat.oldVsNew.oldText}
                          </p>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold text-emerald-400 uppercase">
                            High-Converting Replacement:
                          </span>
                          <p className="text-[11px] text-emerald-200 font-medium">
                            {mat.oldVsNew.newText}
                          </p>
                        </div>
                        {mat.oldVsNew.reason && (
                          <div className="sm:col-span-2 text-[10px] text-cyan-300/80 pt-0.5">
                            <strong>Why this converts:</strong> {mat.oldVsNew.reason}
                          </div>
                        )}
                      </div>
                    )}

                    {/* The Ready-to-Copy Text Box */}
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs sm:text-sm text-slate-200 font-mono whitespace-pre-wrap leading-relaxed select-all">
                      {mat.content}
                    </div>

                    <div className="text-[10px] text-slate-500 italic flex items-center justify-between">
                      <span>{mat.instructions || "Ready to paste directly into your website, WhatsApp, email, or profile."}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4.E 7-DAY & 30-DAY STEP-BY-STEP IMPLEMENTATION CHECKLIST */}
          {implementationSteps.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ListChecks className="w-3.5 h-3.5" />
                  Step-by-Step Implementation Roadmap
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Interactive checklist
                </span>
              </div>

              <div className="space-y-2">
                {implementationSteps.map((step) => {
                  const isChecked = Boolean(completedSteps[step.id]);
                  return (
                    <div
                      key={step.id}
                      onClick={() => toggleStepCompleted(step.id)}
                      className={`p-2.5 rounded-lg border flex items-start gap-2.5 transition-colors cursor-pointer ${
                        isChecked
                          ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-200"
                          : "bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300"
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <div className="w-4 h-4 rounded border border-slate-600 bg-slate-950" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1 text-xs">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-cyan-300 font-bold">
                            {step.timeframe || `STEP ${step.stepNumber}`}
                          </span>
                          <span className={`font-semibold ${isChecked ? "line-through text-slate-400" : "text-white"}`}>
                            {step.title}
                          </span>
                        </div>
                        <p className={`text-[11px] leading-relaxed ${isChecked ? "text-slate-500" : "text-slate-400"}`}>
                          {step.action}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4.F Official Verification & Responsible Measurement Notice */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <span className="font-semibold text-slate-300 block">
              Responsible Business Guidance:
            </span>
            <p>
              These actions are designed to improve conversion, visibility, and buyer response. Test and measure results over 30 days. Official legal compliance, export licensing, and tax policies require formal verification with relevant government authorities.
            </p>
          </div>
        </section>
      )}

      {/* 5. Quick Access 4-Button Grid for Hub Deep Dives */}
      <section className="grid grid-cols-2 gap-3" aria-label="Core Navigation Sections">
        <button
          id="quick-nav-seo"
          onClick={() => setActiveTab("seo")}
          className="group p-3.5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/80 border border-slate-700/60 hover:border-cyan-500/50 backdrop-blur-md transition-all text-left shadow-lg active:scale-95 cursor-pointer"
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30 group-hover:scale-105 transition-transform">
              <Search className="w-4 h-4" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
          </div>
          <span className="font-bold text-sm text-white block">🔍 {t("nav.seo", "SEO")}</span>
          <span className="text-[11px] text-slate-400 block mt-0.5">Live Audits & Titles</span>
        </button>

        <button
          id="quick-nav-social"
          onClick={() => setActiveTab("social")}
          className="group p-3.5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/80 border border-slate-700/60 hover:border-purple-500/50 backdrop-blur-md transition-all text-left shadow-lg active:scale-95 cursor-pointer"
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30 group-hover:scale-105 transition-transform">
              <Smartphone className="w-4 h-4" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition-colors" />
          </div>
          <span className="font-bold text-sm text-white block">📱 {t("nav.social", "SOCIAL")}</span>
          <span className="text-[11px] text-slate-400 block mt-0.5">Captions & Calendars</span>
        </button>

        <button
          id="quick-nav-export"
          onClick={() => setActiveTab("export")}
          className="group p-3.5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/80 border border-slate-700/60 hover:border-blue-500/50 backdrop-blur-md transition-all text-left shadow-lg active:scale-95 cursor-pointer"
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30 group-hover:scale-105 transition-transform">
              <Globe className="w-4 h-4" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
          </div>
          <span className="font-bold text-sm text-white block">🌍 {t("nav.export", "EXPORT")}</span>
          <span className="text-[11px] text-slate-400 block mt-0.5">Buyers & Incoterms</span>
        </button>

        <button
          id="quick-nav-business"
          onClick={() => setActiveTab("business")}
          className="group p-3.5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/80 border border-slate-700/60 hover:border-emerald-500/50 backdrop-blur-md transition-all text-left shadow-lg active:scale-95 cursor-pointer"
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 group-hover:scale-105 transition-transform">
              <Briefcase className="w-4 h-4" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
          </div>
          <span className="font-bold text-sm text-white block">💼 {t("nav.business", "BUSINESS")}</span>
          <span className="text-[11px] text-slate-400 block mt-0.5">Pricing & Margins</span>
        </button>
      </section>
    </div>
  );
};

// Internal icon helper
function RocketIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  );
}

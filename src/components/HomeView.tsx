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
  CornerDownLeft, 
  Loader2,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Check,
  ListChecks,
  Compass,
  AlertOctagon,
  Rocket
} from "lucide-react";
import { ActiveTab, SavedItem, AssistantResult } from "../types";
import { QUICK_PROMPTS } from "../data/mockData";
import { normalizeErrorMessage } from "../utils/errorUtils";

interface HomeViewProps {
  setActiveTab: (tab: ActiveTab) => void;
  onSaveItem: (item: Omit<SavedItem, "id" | "createdAt">) => void;
  savedItemIds: string[];
}

const ASSISTANT_TOPICS = [
  { id: "all", label: "All Topics" },
  { id: "seo", label: "🔍 SEO" },
  { id: "social", label: "📱 Social Media" },
  { id: "export", label: "🌐 Export & Trade" },
  { id: "business", label: "💼 Business & Margins" },
  { id: "marketing", label: "📣 Marketing & Growth" },
  { id: "branding", label: "✨ Branding & USP" },
  { id: "outreach", label: "💬 Buyer Outreach" },
];

export const HomeView: React.FC<HomeViewProps> = ({ setActiveTab, onSaveItem }) => {
  const [query, setQuery] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [assistantData, setAssistantData] = useState<AssistantResult | null>(null);
  const [responseContent, setResponseContent] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [hasSaved, setHasSaved] = useState(false);

  const handleAskAI = async (textToAsk?: string, categoryOverride?: string) => {
    const promptToUse = textToAsk || query;
    if (!promptToUse.trim()) {
      setErrorMessage("Please enter a business, SEO, export, or marketing inquiry.");
      return;
    }

    if (isLoading) return;

    setIsLoading(true);
    setErrorMessage(null);
    setAssistantData(null);
    setResponseContent(null);
    setHasSaved(false);

    const topicToUse = categoryOverride || selectedTopic;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 40000); // 40s timeout

    try {
      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ 
          query: promptToUse.trim(),
          category: topicToUse !== "all" ? topicToUse : "General Business Growth & Export Strategy"
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Defensive verification: check if response is valid JSON
      const contentTypeHeader = res.headers.get("content-type") || "";
      if (!contentTypeHeader.includes("application/json")) {
        const rawText = await res.text();
        const snippet = rawText.slice(0, 150).replace(/<[^>]*>/g, "").trim();
        const fallbackMsg = snippet 
          ? `Server returned HTTP ${res.status}: ${snippet}` 
          : `The AI Assistant service returned an unexpected response (HTTP ${res.status}).`;
        throw new Error(fallbackMsg);
      }

      const data = await res.json();
      if (!res.ok || data.success === false) {
        const rawError = data?.error || data?.message || data?.detail || `AI service returned error (HTTP ${res.status})`;
        const errorDetail = normalizeErrorMessage(rawError, "The AI Assistant service is temporarily unavailable. Please try again.");
        throw new Error(errorDetail);
      }

      const payload = data.data || data;
      setAssistantData(payload);
      setResponseContent(payload.content || data.content || payload.answer || "Strategic roadmap generated.");
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      console.error("AI Assistant error:", err);
      let msg = "AI Trade Advisor failed to process inquiry.";
      if (err instanceof Error && err.name === "AbortError") {
        msg = "Request timed out after 40 seconds. Please try again with a shorter inquiry.";
      } else {
        msg = normalizeErrorMessage(err, "AI Trade Advisor failed to process inquiry.");
      }
      setErrorMessage(msg);
      setAssistantData(null);
      setResponseContent(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!responseContent) return;
    navigator.clipboard.writeText(responseContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopySection = (text: string, sectionKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionKey);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleSave = () => {
    if (!responseContent || hasSaved) return;
    onSaveItem({
      type: "ai-assistant",
      title: query ? `Advice: ${query.slice(0, 45)}...` : "Export & Business Strategic Brief",
      summary: assistantData?.answer ? assistantData.answer.slice(0, 120) + "..." : "Comprehensive growth roadmap and recommendations.",
      content: responseContent,
      category: "AI Strategic Consultation",
      tags: ["Trade Advisor", selectedTopic !== "all" ? selectedTopic : "Growth", "Export"],
    });
    setHasSaved(true);
  };

  return (
    <div className="space-y-6 pb-6">
      {/* 1. First Screen Hero Header */}
      <section className="text-center pt-3 pb-2 space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 text-xs font-medium backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Next-Gen Global Trade & Business Suite</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white uppercase drop-shadow-sm">
          BUSINESS GROWTH & EXPORT HUB
        </h1>
        
        <p className="text-sm sm:text-base text-cyan-200/90 font-medium">
          “Turn your business idea into growth.”
        </p>
        
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Grow Your Business • Reach Customers • Go Global
        </p>
      </section>

      {/* 2. Quick Access 4-Button Grid */}
      <section className="grid grid-cols-2 gap-3" aria-label="Core Navigation Sections">
        <button
          id="quick-nav-seo"
          onClick={() => setActiveTab("seo")}
          className="group p-3.5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/80 border border-slate-700/60 hover:border-cyan-500/50 backdrop-blur-md transition-all text-left shadow-lg active:scale-95"
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30 group-hover:scale-105 transition-transform">
              <Search className="w-4 h-4" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
          </div>
          <span className="font-bold text-sm text-white block">🔍 SEO</span>
          <span className="text-[11px] text-slate-400 block mt-0.5">Audits & Keywords</span>
        </button>

        <button
          id="quick-nav-social"
          onClick={() => setActiveTab("social")}
          className="group p-3.5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/80 border border-slate-700/60 hover:border-purple-500/50 backdrop-blur-md transition-all text-left shadow-lg active:scale-95"
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30 group-hover:scale-105 transition-transform">
              <Smartphone className="w-4 h-4" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition-colors" />
          </div>
          <span className="font-bold text-sm text-white block">📱 SOCIAL</span>
          <span className="text-[11px] text-slate-400 block mt-0.5">Reels, Posts & Plans</span>
        </button>

        <button
          id="quick-nav-export"
          onClick={() => setActiveTab("export")}
          className="group p-3.5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/80 border border-slate-700/60 hover:border-blue-500/50 backdrop-blur-md transition-all text-left shadow-lg active:scale-95"
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30 group-hover:scale-105 transition-transform">
              <Globe className="w-4 h-4" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
          </div>
          <span className="font-bold text-sm text-white block">🌍 EXPORT</span>
          <span className="text-[11px] text-slate-400 block mt-0.5">Buyers & Checklists</span>
        </button>

        <button
          id="quick-nav-business"
          onClick={() => setActiveTab("business")}
          className="group p-3.5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/80 border border-slate-700/60 hover:border-emerald-500/50 backdrop-blur-md transition-all text-left shadow-lg active:scale-95"
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 group-hover:scale-105 transition-transform">
              <Briefcase className="w-4 h-4" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
          </div>
          <span className="font-bold text-sm text-white block">💼 BUSINESS</span>
          <span className="text-[11px] text-slate-400 block mt-0.5">Plans, Margins & Brand</span>
        </button>
      </section>

      {/* 3. Central AI Business Assistant Input Box */}
      <section className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-indigo-950/50 border border-cyan-500/30 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <h2 className="font-bold text-sm sm:text-base text-white">
              Ask AI anything about your business
            </h2>
          </div>
          <span className="text-[10px] uppercase font-semibold tracking-wider text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded-full border border-cyan-800/60">
            Trade Intelligence
          </span>
        </div>

        <p className="text-xs text-slate-300 mb-2.5">
          Select a topic or type anything about SEO, social media, export, or business growth:
        </p>

        {/* Focus Topic Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2.5 scrollbar-none">
          {ASSISTANT_TOPICS.map((topic) => (
            <button
              key={topic.id}
              onClick={() => setSelectedTopic(topic.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors border cursor-pointer ${
                selectedTopic === topic.id
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50"
                  : "bg-slate-950/60 hover:bg-slate-800 text-slate-400 border-slate-800"
              }`}
            >
              {topic.label}
            </button>
          ))}
        </div>

        <div className="relative">
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
            placeholder="e.g., How do I start exporting home decor to the US and Europe with low MOQ?"
            className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 text-white placeholder-slate-500 p-3.5 text-xs sm:text-sm resize-none outline-none transition-all"
          />

          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              Press Enter or click Consult
            </span>
            <button
              id="ai-submit-btn"
              onClick={() => handleAskAI()}
              disabled={isLoading || !query.trim()}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 active:scale-95 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Synthesizing Strategy...</span>
                </>
              ) : (
                <>
                  <span>Consult Advisor</span>
                  <CornerDownLeft className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Question Pills */}
        <div className="mt-3.5 pt-3 border-t border-slate-800/80">
          <div className="text-[11px] text-slate-400 mb-2 font-medium">
            Try asking one of these:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.slice(0, 4).map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQuery(prompt);
                  handleAskAI(prompt);
                }}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800/70 hover:bg-slate-700/70 text-slate-300 hover:text-white border border-slate-700/60 transition-colors text-left cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Error Alert Banner */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-950/70 border border-rose-500/50 text-rose-200 backdrop-blur-xl space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>Consultation Unavailable</span>
          </div>
          <p className="text-xs text-rose-200/90 leading-relaxed">
            {errorMessage}
          </p>
          <button
            onClick={() => handleAskAI()}
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-900/80 hover:bg-rose-800 text-white text-xs font-semibold border border-rose-700 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Consultation</span>
          </button>
        </div>
      )}

      {/* AI Assistant Output Card (if generated) */}
      {(assistantData || responseContent) && (
        <section 
          id="ai-response-container" 
          className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-cyan-500/40 shadow-2xl backdrop-blur-xl space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              <div>
                <span className="font-bold text-sm text-white block">
                  Strategic Advisory Brief
                </span>
                <span className="text-[11px] text-cyan-300/80">
                  {selectedTopic !== "all" ? `Topic: ${selectedTopic.toUpperCase()}` : "Strategic Growth Roadmap"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleCopy}
                id="copy-ai-response-btn"
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
                <span>{copied ? "Copied!" : "Copy All"}</span>
              </button>
              <button
                onClick={handleSave}
                id="save-ai-response-btn"
                className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border cursor-pointer ${
                  hasSaved
                    ? "bg-emerald-950 text-emerald-300 border-emerald-700"
                    : "bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border-cyan-700"
                }`}
              >
                <BookmarkCheck className="w-3.5 h-3.5" />
                <span>{hasSaved ? "Saved" : "Save"}</span>
              </button>
            </div>
          </div>

          {/* Mandatory Official Notice Banner */}
          <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-[11px] text-amber-200/90 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold uppercase tracking-wider text-[11px] text-amber-300 block">
                Official Verification Notice:
              </span>
              <p className="mt-0.5 leading-relaxed">
                {assistantData?.verificationNotice || "Needs verification with the relevant official authority. Market estimates and compliance rules must be verified with certified agencies or trade registries."}
              </p>
            </div>
          </div>

          {/* Structured Intelligence Cards if structured data is available */}
          {assistantData ? (
            <div className="space-y-3.5">
              {/* 1. Direct Answer */}
              {assistantData.answer && (
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Executive Answer & Strategy
                    </span>
                    <button
                      onClick={() => handleCopySection(assistantData.answer, "answer")}
                      className="text-[11px] text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 flex items-center gap-1"
                    >
                      {copiedSection === "answer" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSection === "answer" ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
                    {assistantData.answer}
                  </p>
                </div>
              )}

              {/* 2. Recommended Actions */}
              {assistantData.actions && assistantData.actions.length > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <ListChecks className="w-3.5 h-3.5" />
                      Recommended Actions
                    </span>
                    <button
                      onClick={() => handleCopySection(assistantData.actions.join("\n"), "actions")}
                      className="text-[11px] text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 flex items-center gap-1"
                    >
                      {copiedSection === "actions" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSection === "actions" ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <ul className="space-y-1.5 text-xs sm:text-sm text-slate-200">
                    {assistantData.actions.map((act, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{act}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 3. Step-by-Step Strategic Plan */}
              {assistantData.stepByStepPlan && assistantData.stepByStepPlan.length > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5" />
                      Step-by-Step Strategic Plan
                    </span>
                    <button
                      onClick={() => handleCopySection(assistantData.stepByStepPlan?.join("\n") || "", "steps")}
                      className="text-[11px] text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 flex items-center gap-1"
                    >
                      {copiedSection === "steps" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSection === "steps" ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <div className="space-y-2 text-xs sm:text-sm text-slate-200">
                    {assistantData.stepByStepPlan.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
                        <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold text-[10px] shrink-0 border border-blue-500/40">
                          {idx + 1}
                        </span>
                        <span className="leading-relaxed">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Important Considerations & Risks */}
              {assistantData.importantConsiderations && assistantData.importantConsiderations.length > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertOctagon className="w-3.5 h-3.5" />
                      Important Considerations & Operational Risks
                    </span>
                    <button
                      onClick={() => handleCopySection(assistantData.importantConsiderations?.join("\n") || "", "considerations")}
                      className="text-[11px] text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 flex items-center gap-1"
                    >
                      {copiedSection === "considerations" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSection === "considerations" ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {assistantData.importantConsiderations.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-amber-400 font-bold shrink-0">•</span>
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 5. Immediate Next Steps */}
              {assistantData.nextSteps && assistantData.nextSteps.length > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Rocket className="w-3.5 h-3.5" />
                      Immediate Next Steps (Next 24-48 Hours)
                    </span>
                    <button
                      onClick={() => handleCopySection(assistantData.nextSteps?.join("\n") || "", "nextsteps")}
                      className="text-[11px] text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 flex items-center gap-1"
                    >
                      {copiedSection === "nextsteps" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSection === "nextsteps" ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-200">
                    {assistantData.nextSteps.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <ArrowRight className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-sans space-y-3">
              {responseContent}
            </div>
          )}

          {/* Legal Compliance Notice */}
          <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 leading-relaxed">
            <strong>Data Integrity:</strong> Advice is formulated from real business strategy frameworks. We do not invent fictional buyers, fake contact data, or guaranteed profits. Needs verification with the relevant official authority for statutory licenses and tariffs.
          </div>
        </section>
      )}

      {/* 4. Four Large Mobile Cards Section */}
      <section className="space-y-3 pt-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 px-1">
          Explore Core Growth Pillars
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Card 1: 🔍 SEO Growth */}
          <div 
            id="card-seo-growth"
            className="p-4 rounded-2xl bg-slate-900/60 hover:bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 backdrop-blur-xl transition-all shadow-xl group cursor-pointer"
            onClick={() => setActiveTab("seo")}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center border border-cyan-500/30">
                  <Search className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white group-hover:text-cyan-300 transition-colors">
                    🔍 SEO Growth
                  </h3>
                  <span className="text-[11px] text-cyan-400/80">Search & Visibility</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
            </div>

            <ul className="space-y-1.5 text-xs text-slate-300 pl-1">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>SEO Audit & Health Score</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Keyword Ideas & Search Intent</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Meta Title & Description Generator</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Website SEO Suggestions</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>High-Converting SEO Content Ideas</span>
              </li>
            </ul>

            <button className="mt-3.5 w-full py-2 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 font-semibold text-xs border border-cyan-800/50 flex items-center justify-center gap-1.5 transition-colors">
              <span>Open SEO Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 2: 📱 Social Media */}
          <div 
            id="card-social-media"
            className="p-4 rounded-2xl bg-slate-900/60 hover:bg-slate-900/80 border border-slate-800 hover:border-purple-500/40 backdrop-blur-xl transition-all shadow-xl group cursor-pointer"
            onClick={() => setActiveTab("social")}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center border border-purple-500/30">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white group-hover:text-purple-300 transition-colors">
                    📱 Social Media
                  </h3>
                  <span className="text-[11px] text-purple-400/80">Content & Reach</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
            </div>

            <ul className="space-y-1.5 text-xs text-slate-300 pl-1">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>Instagram Ideas & Story Prompts</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>Facebook Content & Community Posts</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>YouTube Ideas & Video Hooks</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>High-Converting Captions & CTAs</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>Targeted Hashtags & Weekly Calendar</span>
              </li>
            </ul>

            <button className="mt-3.5 w-full py-2 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 font-semibold text-xs border border-purple-800/50 flex items-center justify-center gap-1.5 transition-colors">
              <span>Open Social Media Suite</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 3: 🌍 Export Help */}
          <div 
            id="card-export-help"
            className="p-4 rounded-2xl bg-slate-900/60 hover:bg-slate-900/80 border border-slate-800 hover:border-blue-500/40 backdrop-blur-xl transition-all shadow-xl group cursor-pointer"
            onClick={() => setActiveTab("export")}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center border border-blue-500/30">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white group-hover:text-blue-300 transition-colors">
                    🌍 Export Help
                  </h3>
                  <span className="text-[11px] text-blue-400/80">Cross-Border Trade</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
            </div>

            <ul className="space-y-1.5 text-xs text-slate-300 pl-1">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Product & Demand Research</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Target Country Market Intelligence</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Buyer Research & Outreach Strategy</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Interactive Export Checklist</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Buyer Message & Catalog Generator</span>
              </li>
            </ul>

            <button className="mt-3.5 w-full py-2 rounded-xl bg-blue-950/60 hover:bg-blue-900/60 text-blue-300 font-semibold text-xs border border-blue-800/50 flex items-center justify-center gap-1.5 transition-colors">
              <span>Open Export Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 4: 💼 Business Help */}
          <div 
            id="card-business-help"
            className="p-4 rounded-2xl bg-slate-900/60 hover:bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 backdrop-blur-xl transition-all shadow-xl group cursor-pointer"
            onClick={() => setActiveTab("business")}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-500/30">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white group-hover:text-emerald-300 transition-colors">
                    💼 Business Help
                  </h3>
                  <span className="text-[11px] text-emerald-400/80">Strategy & Operations</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
            </div>

            <ul className="space-y-1.5 text-xs text-slate-300 pl-1">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Business Idea & Feasibility Generator</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Business & Marketing Plan Creator</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Pricing & Export Margin Calculator</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Competitor Research & SWOT Analysis</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Customer Messages & Brand Names</span>
              </li>
            </ul>

            <button className="mt-3.5 w-full py-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 font-semibold text-xs border border-emerald-800/50 flex items-center justify-center gap-1.5 transition-colors">
              <span>Open Business Tool Suite</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

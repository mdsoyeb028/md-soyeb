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
  RefreshCw
} from "lucide-react";
import { ActiveTab, SavedItem } from "../types";
import { QUICK_PROMPTS } from "../data/mockData";

interface HomeViewProps {
  setActiveTab: (tab: ActiveTab) => void;
  onSaveItem: (item: Omit<SavedItem, "id" | "createdAt">) => void;
  savedItemIds: string[];
}

export const HomeView: React.FC<HomeViewProps> = ({ setActiveTab, onSaveItem }) => {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [responseContent, setResponseContent] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  const handleAskAI = async (textToAsk?: string) => {
    const promptToUse = textToAsk || query;
    if (!promptToUse.trim() || isLoading) return;

    setIsLoading(true);
    setErrorMessage(null);
    setResponseContent(null);
    setHasSaved(false);

    try {
      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: promptToUse }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Server responded with status ${res.status}`);
      }

      setResponseContent(data.content || "Strategic roadmap generated.");
    } catch (err: unknown) {
      console.error("AI Assistant error:", err);
      const msg = err instanceof Error ? err.message : "AI Trade Advisor failed to process inquiry.";
      setErrorMessage(msg);
      setResponseContent(null); // Never replace failed real requests with fake data
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

  const handleSave = () => {
    if (!responseContent || hasSaved) return;
    onSaveItem({
      type: "ai-assistant",
      title: query ? `Advice: ${query.slice(0, 45)}...` : "Export & Business Strategic Brief",
      summary: "Comprehensive trade roadmap covering target markets, buyer search, and compliance steps.",
      content: responseContent,
      category: "AI Strategic Consultation",
      tags: ["Trade Advisor", "Export", "Growth"],
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

        <p className="text-xs text-slate-300 mb-3">
          What do you need help with?
        </p>

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
            placeholder="e.g., I want to export handicrafts from India to the USA and Europe..."
            className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 text-white placeholder-slate-500 p-3.5 text-xs sm:text-sm resize-none outline-none transition-all"
          />

          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              Press Enter to ask
            </span>
            <button
              id="ai-submit-btn"
              onClick={() => handleAskAI()}
              disabled={isLoading || !query.trim()}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 active:scale-95 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Analyzing Trade Regulations...</span>
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
            {QUICK_PROMPTS.slice(0, 3).map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQuery(prompt);
                  handleAskAI(prompt);
                }}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800/70 hover:bg-slate-700/70 text-slate-300 hover:text-white border border-slate-700/60 transition-colors text-left"
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
      {responseContent && (
        <section 
          id="ai-response-container" 
          className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-cyan-500/40 shadow-2xl backdrop-blur-xl space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              <span className="font-bold text-sm text-white">
                Strategic Export & Business Roadmap
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleCopy}
                id="copy-ai-response-btn"
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700"
              >
                <Copy className="w-3.5 h-3.5 text-cyan-400" />
                <span>{copied ? "Copied!" : "Copy"}</span>
              </button>
              <button
                onClick={handleSave}
                id="save-ai-response-btn"
                className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border ${
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

          <div className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-sans space-y-3">
            {responseContent}
          </div>

          {/* Legal and Regulatory Disclaimer per requirement 4 */}
          <div className="mt-4 p-3 rounded-xl bg-amber-950/40 border border-amber-800/40 text-[11px] text-amber-300/90 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p>
              <strong>Official Compliance Notice:</strong> All international trade, tariff, tax, customs, and legal recommendations are general advisory guidance. Importers and exporters must verify current country tariffs, import permits, and customs procedures with official trade agencies, chambers of commerce, or certified trade lawyers before finalizing shipments.
            </p>
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

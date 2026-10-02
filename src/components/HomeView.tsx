import React, { useState } from "react";
import { 
  Bot, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles, 
  Zap, 
  Search, 
  Share2, 
  FileText, 
  Globe, 
  MessageSquare, 
  Mic, 
  BarChart3, 
  Check, 
  Layers,
  HelpCircle,
  Clock,
  ChevronRight,
  TrendingUp,
  Cpu,
  Database
} from "lucide-react";
import { ActiveTab } from "../types";
import { useCredits } from "../context/CreditsContext";

interface HomeViewProps {
  setActiveTab: (tab: ActiveTab) => void;
  onSaveItem?: (item: any) => void;
  savedItemIds?: string[];
  onCreateAgent?: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ 
  setActiveTab, 
  onCreateAgent 
}) => {
  const { isAnonymous, plan, openSignupModal } = useCredits();
  const [activeInteractiveTab, setActiveInteractiveTab] = useState<"chat" | "tasks" | "context">("chat");

  const handleLaunchAgent = () => {
    if (onCreateAgent) {
      onCreateAgent();
    } else {
      setActiveTab("agent");
    }
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="w-full flex flex-col gap-16 sm:gap-24 pt-4 sm:pt-8 pb-12">
      
      {/* ========================================================================= */}
      {/* 1. HERO SECTION                                                          */}
      {/* ========================================================================= */}
      <section className="relative flex flex-col items-center text-center max-w-3xl mx-auto px-2">
        {/* Subtle top badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-950/40 border border-cyan-800/40 text-cyan-300 text-xs font-semibold mb-6 shadow-sm shadow-cyan-950/30">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Next-Generation Autonomous Business Intelligence</span>
        </div>

        {/* Headline */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.15] mb-5">
          Your Business. <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
            Your AI Agent.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-lg text-slate-300 max-w-2xl font-normal leading-relaxed mb-8">
          One AI agent to understand your business, analyze problems, create strategies, and help you take action.
        </p>

        {/* Hero CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto">
          <button
            onClick={handleLaunchAgent}
            id="hero-create-agent-btn"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Bot className="w-4 h-4" />
            <span>Create Your AI Agent</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => scrollToSection("how-it-works")}
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-slate-200 font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>See How It Works</span>
          </button>
        </div>

        {/* Capability micro-line */}
        <div className="mt-8 flex items-center justify-center gap-2 sm:gap-3 text-xs font-medium text-slate-400">
          <span>Chat</span>
          <span className="text-slate-600">•</span>
          <span>Analyze</span>
          <span className="text-slate-600">•</span>
          <span>Plan</span>
          <span className="text-slate-600">•</span>
          <span>Act</span>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. PRODUCT PREVIEW: REALISTIC AI AGENT DASHBOARD MOCKUP                   */}
      {/* ========================================================================= */}
      <section id="product" className="relative max-w-4xl mx-auto w-full">
        {/* Subtle backdrop glow */}
        <div className="absolute -inset-1.5 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 rounded-2xl blur-xl -z-10 opacity-70" />

        <div className="rounded-2xl border border-slate-800/90 bg-[#090d1a]/90 backdrop-blur-xl shadow-2xl overflow-hidden">
          {/* Top Window Bar */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-800/80 bg-slate-950/60">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/70" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <div className="w-3 h-3 rounded-full bg-green-500/70" />
              </div>
              <div className="h-4 w-[1px] bg-slate-800 mx-1 hidden sm:block" />
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-white">ABC Interior Studio</span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-400">Interior Design, Kolkata, India</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-[11px] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Agent Active
              </span>
            </div>
          </div>

          {/* Sub-navigation tabs within the mockup */}
          <div className="flex items-center gap-1 px-4 sm:px-6 pt-3 border-b border-slate-800/60 bg-slate-950/30 text-xs">
            <button
              onClick={() => setActiveInteractiveTab("chat")}
              className={`px-3 py-2 border-b-2 font-semibold transition-all cursor-pointer ${
                activeInteractiveTab === "chat" 
                  ? "border-cyan-400 text-cyan-300" 
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              Conversation & Diagnosis
            </button>
            <button
              onClick={() => setActiveInteractiveTab("tasks")}
              className={`px-3 py-2 border-b-2 font-semibold transition-all cursor-pointer ${
                activeInteractiveTab === "tasks" 
                  ? "border-cyan-400 text-cyan-300" 
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              Action Tasks (2)
            </button>
            <button
              onClick={() => setActiveInteractiveTab("context")}
              className={`px-3 py-2 border-b-2 font-semibold transition-all cursor-pointer ${
                activeInteractiveTab === "context" 
                  ? "border-cyan-400 text-cyan-300" 
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              Business Memory
            </button>
          </div>

          {/* Tab 1: Chat & Diagnostic View */}
          {activeInteractiveTab === "chat" && (
            <div className="p-4 sm:p-6 flex flex-col gap-4">
              {/* User message */}
              <div className="flex items-start justify-end gap-3">
                <div className="max-w-[85%] sm:max-w-lg rounded-2xl rounded-tr-sm bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-3 text-xs sm:text-sm font-medium shadow-md">
                  Why am I not getting enough clients for my 3BHK residential design packages?
                </div>
                <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
                  U
                </div>
              </div>

              {/* Agent response */}
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-cyan-600/30 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shrink-0 mt-1">
                  <Bot className="w-4 h-4" />
                </div>

                <div className="flex-1 rounded-2xl rounded-tl-sm bg-slate-900/90 border border-slate-800 p-4 sm:p-5 text-xs sm:text-sm text-slate-200 flex flex-col gap-4 shadow-sm">
                  <p className="leading-relaxed">
                    Based on your business information, recent website crawl, and local market analysis in Kolkata, I identified the key drop-off point:
                  </p>

                  {/* Structured Truth / Evidence Badges */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-blue-950 text-blue-400 font-mono text-[10px] font-bold shrink-0">
                        OBSERVED
                      </span>
                      <span className="text-slate-300 text-[11px]">
                        Website gets 380 monthly visits, but lead form has 12 fields and no instant WhatsApp alternative.
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 font-mono text-[10px] font-bold shrink-0">
                        USER PROVIDED
                      </span>
                      <span className="text-slate-300 text-[11px]">
                        Target project budget: ₹15L–₹35L. Core audience: New flat owners in New Town & Salt Lake.
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-purple-950 text-purple-400 font-mono text-[10px] font-bold shrink-0">
                        RESEARCHED
                      </span>
                      <span className="text-slate-300 text-[11px]">
                        Top 3 competitors in Kolkata offer instant 60-second budget estimators and completed video walk-throughs.
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 font-mono text-[10px] font-bold shrink-0">
                        NEEDS VERIFICATION
                      </span>
                      <span className="text-slate-300 text-[11px]">
                        Confirm if previous 5 client inquiries received a follow-up call within 30 minutes.
                      </span>
                    </div>
                  </div>

                  {/* Concrete immediate action */}
                  <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/40 text-xs">
                    <div className="font-bold text-cyan-300 mb-1 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" />
                      <span>Recommended Immediate Action:</span>
                    </div>
                    <p className="text-slate-300 leading-normal">
                      Replace the 12-field form with a 1-click &ldquo;Get 3BHK Cost Sheet via WhatsApp&rdquo; CTA before running paid ads. I have prepared the code snippet and WhatsApp welcome flow for your approval.
                    </p>
                  </div>

                  {/* Interactive mock buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button 
                      onClick={handleLaunchAgent}
                      className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve Prepared Flow</span>
                    </button>
                    <button 
                      onClick={handleLaunchAgent}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Draft WhatsApp Hook</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Action Tasks */}
          {activeInteractiveTab === "tasks" && (
            <div className="p-4 sm:p-6 flex flex-col gap-3">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-cyan-400" />
                  <div>
                    <h4 className="text-xs font-bold text-white">Embed High-Converting WhatsApp Lead Trigger</h4>
                    <p className="text-[11px] text-slate-400">Pre-generated code ready to insert into landing page</p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/40">
                  Ready to Execute
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  <div>
                    <h4 className="text-xs font-bold text-white">Google Business Profile Local Keyword Enrichment</h4>
                    <p className="text-[11px] text-slate-400">Updated title tags with &ldquo;Interior Designer New Town Kolkata&rdquo;</p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/40">
                  Pending Review
                </span>
              </div>
            </div>
          )}

          {/* Tab 3: Context / Memory */}
          {activeInteractiveTab === "context" && (
            <div className="p-4 sm:p-6 flex flex-col gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="text-slate-400 mb-1 font-semibold">Indexed Knowledge:</div>
                <p className="text-slate-200">
                  Catalog PDF uploaded (24 pages), Website crawl completed (18 URLs), WhatsApp business profile connected.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="text-slate-400 mb-1 font-semibold">Autonomous Vigilance:</div>
                <p className="text-slate-200">
                  Agent tracks competitor pricing in Kolkata and audits weekly search rank changes automatically.
                </p>
              </div>
            </div>
          )}

          {/* Bottom Bar: Action prompt */}
          <div className="px-4 sm:px-6 py-3 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Ready to experience this for your own business?</span>
            <button
              onClick={handleLaunchAgent}
              className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>Build Your Agent in 60s</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. HOW IT WORKS (3 SIMPLE, CONCRETE STEPS)                               */}
      {/* ========================================================================= */}
      <section id="how-it-works" className="max-w-4xl mx-auto w-full px-2">
        <div className="text-center mb-12">
          <h2 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-2">
            Streamlined Architecture
          </h2>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            How Your AI Agent Operates
          </h3>
          <p className="text-sm text-slate-400 mt-2 max-w-lg mx-auto">
            From initial setup to autonomous growth plans, your agent works continuously in your corner.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="p-6 rounded-2xl bg-[#090d1a]/80 border border-slate-800/90 relative flex flex-col">
            <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400 font-bold text-sm mb-4">
              01
            </div>
            <h4 className="text-base font-bold text-white mb-2">Create Your Agent</h4>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Enter your business name, industry, location, and website. Your agent initializes your business profile and brand persona.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-6 rounded-2xl bg-[#090d1a]/80 border border-slate-800/90 relative flex flex-col">
            <div className="w-9 h-9 rounded-xl bg-blue-950/80 border border-blue-800/60 flex items-center justify-center text-blue-400 font-bold text-sm mb-4">
              02
            </div>
            <h4 className="text-base font-bold text-white mb-2">Build Business Memory</h4>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Upload price lists, connect your channels, and analyze your URLs. The agent observes facts, identifies bottlenecks, and benchmarks competitors.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-6 rounded-2xl bg-[#090d1a]/80 border border-slate-800/90 relative flex flex-col">
            <div className="w-9 h-9 rounded-xl bg-purple-950/80 border border-purple-800/60 flex items-center justify-center text-purple-400 font-bold text-sm mb-4">
              03
            </div>
            <h4 className="text-base font-bold text-white mb-2">Analyze, Plan & Execute</h4>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Ask any business problem. Receive verified strategic diagnosis, actionable step-by-step tasks, and ready-to-run marketing & sales campaigns.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. CAPABILITIES OF THE AI BUSINESS AGENT                                 */}
      {/* ========================================================================= */}
      <section id="capabilities" className="max-w-4xl mx-auto w-full px-2">
        <div className="text-center mb-12">
          <h2 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-2">
            Unified Suite
          </h2>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Capabilities of Your AI Agent
          </h3>
          <p className="text-sm text-slate-400 mt-2 max-w-lg mx-auto">
            Not separate disconnected tools — everything is powered by your agent&rsquo;s continuous business context.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {/* Capability 1: Strategic Diagnosis */}
          <div className="p-5 rounded-2xl bg-[#090d1a]/70 border border-slate-800/80 hover:border-cyan-500/40 transition-colors flex flex-col justify-between group">
            <div>
              <div className="w-9 h-9 rounded-xl bg-cyan-950/70 border border-cyan-800/40 flex items-center justify-center text-cyan-400 mb-3.5 group-hover:scale-105 transition-transform">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1.5">Problem Diagnosis & Turnaround Plans</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Diagnoses sales drops, conversion leaks, and marketing bottlenecks with verifiable root cause analysis.
              </p>
            </div>
            <button
              onClick={handleLaunchAgent}
              className="mt-4 text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer pt-2 border-t border-slate-800/60"
            >
              <span>Explore in Agent</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Capability 2: SEO & Digital Presence */}
          <div className="p-5 rounded-2xl bg-[#090d1a]/70 border border-slate-800/80 hover:border-cyan-500/40 transition-colors flex flex-col justify-between group">
            <div>
              <div className="w-9 h-9 rounded-xl bg-blue-950/70 border border-blue-800/40 flex items-center justify-center text-blue-400 mb-3.5 group-hover:scale-105 transition-transform">
                <Search className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1.5">SEO & Search Visibility Audit</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Crawls your website, detects title and schema flaws, and discovers buyer-intent local search keywords.
              </p>
            </div>
            <button
              onClick={handleLaunchAgent}
              className="mt-4 text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer pt-2 border-t border-slate-800/60"
            >
              <span>Explore in Agent</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Capability 3: Social Media & Campaigns */}
          <div className="p-5 rounded-2xl bg-[#090d1a]/70 border border-slate-800/80 hover:border-cyan-500/40 transition-colors flex flex-col justify-between group">
            <div>
              <div className="w-9 h-9 rounded-xl bg-purple-950/70 border border-purple-800/40 flex items-center justify-center text-purple-400 mb-3.5 group-hover:scale-105 transition-transform">
                <Share2 className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1.5">Social Media & Content Campaigns</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Generates high-converting hooks, viral carousel outlines, and localized outreach sequences aligned with your brand.
              </p>
            </div>
            <button
              onClick={handleLaunchAgent}
              className="mt-4 text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer pt-2 border-t border-slate-800/60"
            >
              <span>Explore in Agent</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Capability 4: Real-Time Voice Advisory */}
          <div className="p-5 rounded-2xl bg-[#090d1a]/70 border border-slate-800/80 hover:border-cyan-500/40 transition-colors flex flex-col justify-between group">
            <div>
              <div className="w-9 h-9 rounded-xl bg-emerald-950/70 border border-emerald-800/40 flex items-center justify-center text-emerald-400 mb-3.5 group-hover:scale-105 transition-transform">
                <Mic className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1.5">Conversational & Voice Advisory</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Speak directly with your business agent on the go. Brainstorm pricing strategy, pitch ideas, or customer objection scripts.
              </p>
            </div>
            <button
              onClick={handleLaunchAgent}
              className="mt-4 text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer pt-2 border-t border-slate-800/60"
            >
              <span>Explore in Agent</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Capability 5: Document Memory Vault */}
          <div className="p-5 rounded-2xl bg-[#090d1a]/70 border border-slate-800/80 hover:border-cyan-500/40 transition-colors flex flex-col justify-between group">
            <div>
              <div className="w-9 h-9 rounded-xl bg-amber-950/70 border border-amber-800/40 flex items-center justify-center text-amber-400 mb-3.5 group-hover:scale-105 transition-transform">
                <Database className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1.5">Document & Knowledge Memory</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Upload PDFs, product sheets, customer feedback, and contracts. Your agent indexes genuine facts into permanent memory.
              </p>
            </div>
            <button
              onClick={handleLaunchAgent}
              className="mt-4 text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer pt-2 border-t border-slate-800/60"
            >
              <span>Explore in Agent</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Capability 6: Market & Competitor Research */}
          <div className="p-5 rounded-2xl bg-[#090d1a]/70 border border-slate-800/80 hover:border-cyan-500/40 transition-colors flex flex-col justify-between group">
            <div>
              <div className="w-9 h-9 rounded-xl bg-rose-950/70 border border-rose-800/40 flex items-center justify-center text-rose-400 mb-3.5 group-hover:scale-105 transition-transform">
                <Globe className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1.5">Market & Competitor Research</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Monitors competitor positioning and extracts export demand insights across regional and global markets.
              </p>
            </div>
            <button
              onClick={handleLaunchAgent}
              className="mt-4 text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer pt-2 border-t border-slate-800/60"
            >
              <span>Explore in Agent</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. PRICING PREVIEW                                                        */}
      {/* ========================================================================= */}
      <section id="pricing" className="max-w-4xl mx-auto w-full px-2">
        <div className="text-center mb-10">
          <h2 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-2">
            Predictable Pricing
          </h2>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Transparent Plans for Every Business
          </h3>
          <p className="text-sm text-slate-400 mt-2 max-w-lg mx-auto">
            Start free, scale as your business expands with automated agent workflows.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Starter Plan */}
          <div className="p-6 rounded-2xl bg-[#090d1a]/80 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Starter</div>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-3xl font-extrabold text-white">$0</span>
                <span className="text-xs text-slate-400">/ trial</span>
              </div>
              <p className="text-xs text-slate-400 mb-6">Perfect to test and generate your business agent profile.</p>

              <div className="space-y-2.5 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>1 AI Business Agent profile</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Instant Problem Diagnosis</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Basic SEO & URL check</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleLaunchAgent}
              className="mt-8 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              Start Free
            </button>
          </div>

          {/* Pro Plan (Featured) */}
          <div className="p-6 rounded-2xl bg-gradient-to-b from-cyan-950/40 to-[#090d1a] border-2 border-cyan-500/50 flex flex-col justify-between relative shadow-xl shadow-cyan-950/40">
            <div className="absolute -top-3 right-6 px-2.5 py-0.5 rounded-full bg-cyan-500 text-slate-950 font-bold text-[10px] tracking-wide uppercase">
              Most Popular
            </div>

            <div>
              <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">Pro Growth</div>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-3xl font-extrabold text-white">$29</span>
                <span className="text-xs text-slate-400">/ month</span>
              </div>
              <p className="text-xs text-slate-300 mb-6">Complete strategic autonomy for active businesses.</p>

              <div className="space-y-2.5 text-xs text-slate-200">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Unlimited AI Agent conversations</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Deep Web & SEO Analysis Engine</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Document Vault & Catalog Memory</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>One-Click Action Task Execution</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setActiveTab("pricing")}
              className="mt-8 w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/30 transition-all cursor-pointer"
            >
              Upgrade to Pro
            </button>
          </div>

          {/* Enterprise Plan */}
          <div className="p-6 rounded-2xl bg-[#090d1a]/80 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Enterprise</div>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-3xl font-extrabold text-white">$99</span>
                <span className="text-xs text-slate-400">/ month</span>
              </div>
              <p className="text-xs text-slate-400 mb-6">For multi-brand agencies and high-volume exporters.</p>

              <div className="space-y-2.5 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Multiple Specialized Business Agents</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Multi-Market Export Intelligence</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Dedicated Model Capacity & SLAs</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setActiveTab("pricing")}
              className="mt-8 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              Contact Sales
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. FINAL CALL TO ACTION                                                   */}
      {/* ========================================================================= */}
      <section className="max-w-4xl mx-auto w-full px-2">
        <div className="rounded-3xl bg-gradient-to-r from-blue-950/60 via-slate-900 to-purple-950/60 border border-slate-800 p-8 sm:p-12 text-center relative overflow-hidden">
          <div className="max-w-xl mx-auto flex flex-col items-center">
            <h3 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
              Ready to empower your business with an AI Agent?
            </h3>
            <p className="text-xs sm:text-base text-slate-300 mb-8 leading-relaxed">
              Create your agent in seconds. Start solving business bottlenecks with verified insights.
            </p>
            <button
              onClick={handleLaunchAgent}
              id="cta-create-agent-btn"
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm shadow-xl shadow-cyan-500/25 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Bot className="w-4 h-4" />
              <span>Create Your AI Agent Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. MINIMAL FOOTER                                                         */}
      {/* ========================================================================= */}
      <footer className="max-w-4xl mx-auto w-full pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 px-2">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-[10px]">
            AI
          </div>
          <span className="font-semibold text-slate-300">MD SOYEB AI</span>
          <span>• &copy; {new Date().getFullYear()} All Rights Reserved.</span>
        </div>

        <div className="flex items-center gap-6">
          <button 
            onClick={() => scrollToSection("product")}
            className="hover:text-slate-200 transition-colors cursor-pointer"
          >
            Product
          </button>
          <button 
            onClick={() => scrollToSection("how-it-works")}
            className="hover:text-slate-200 transition-colors cursor-pointer"
          >
            How it works
          </button>
          <button 
            onClick={() => setActiveTab("pricing")}
            className="hover:text-slate-200 transition-colors cursor-pointer"
          >
            Pricing
          </button>
        </div>
      </footer>
    </div>
  );
};

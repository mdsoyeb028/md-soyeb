import React, { useState } from "react";
import { 
  Bot, 
  Users,
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
  Database,
  Calendar,
  PhoneCall,
  UserCheck,
  UserX,
  MessageCircle,
  Headphones,
  CalendarClock
} from "lucide-react";
import { ActiveTab } from "../types";
import { useCredits } from "../context/CreditsContext";

interface HomeViewProps {
  setActiveTab: (tab: ActiveTab) => void;
  onSaveItem?: (item: any) => void;
  savedItemIds?: string[];
  onCreateAgent?: () => void;
  onCreateCustomerAgent?: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ 
  setActiveTab, 
  onCreateAgent,
  onCreateCustomerAgent
}) => {
  const { isAnonymous, plan, openSignupModal } = useCredits();
  const [activeInteractiveTab, setActiveInteractiveTab] = useState<"business" | "customer">("business");
  const [businessSubTab, setBusinessSubTab] = useState<"chat" | "tasks" | "context">("chat");

  const handleLaunchBusinessAgent = () => {
    if (onCreateAgent) {
      onCreateAgent();
    } else {
      setActiveTab("agent");
    }
  };

  const handleLaunchCustomerAgent = () => {
    if (onCreateCustomerAgent) {
      onCreateCustomerAgent();
    } else {
      setActiveTab("customer-agent");
    }
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="w-full flex flex-col gap-14 sm:gap-20 pt-4 sm:pt-8 pb-12">
      
      {/* ========================================================================= */}
      {/* 1. HERO SECTION                                                          */}
      {/* ========================================================================= */}
      <section className="relative flex flex-col items-center text-center max-w-4xl mx-auto px-2">
        {/* Subtle top badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/50 border border-cyan-800/40 text-cyan-300 text-xs font-semibold mb-6 shadow-sm shadow-cyan-950/30">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Autonomous AI Platform for Modern Business</span>
        </div>

        {/* Headline */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.15] mb-5">
          Your AI Team <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
            for Business
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-base sm:text-xl text-slate-300 max-w-2xl font-normal leading-relaxed mb-8">
          One platform to run your business, grow your business, and handle your customers with AI.
        </p>

        {/* Hero Primary Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto">
          <button
            onClick={handleLaunchBusinessAgent}
            id="hero-create-business-agent-btn"
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Bot className="w-4 h-4" />
            <span>Create AI Business Agent</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleLaunchCustomerAgent}
            id="hero-create-customer-agent-btn"
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Users className="w-4 h-4" />
            <span>Create AI Customer Agent</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Unified Capability Micro-line */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs font-medium text-slate-400">
          <span className="text-cyan-400 font-semibold">Business Strategy</span>
          <span className="text-slate-600">•</span>
          <span className="text-cyan-400 font-semibold">SEO & Audits</span>
          <span className="text-slate-600">•</span>
          <span className="text-indigo-400 font-semibold">Website Chat</span>
          <span className="text-slate-600">•</span>
          <span className="text-indigo-400 font-semibold">Lead Capture</span>
          <span className="text-slate-600">•</span>
          <span className="text-purple-400 font-semibold">Voice Telephony</span>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. THE TWO PRIMARY PRODUCT CARDS (Side-by-Side Desktop / Stacked Mobile) */}
      {/* ========================================================================= */}
      <section id="products" className="relative max-w-5xl mx-auto w-full px-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-stretch">
          
          {/* ========================================== */}
          {/* PRODUCT CARD 1: AI BUSINESS AGENT          */}
          {/* ========================================== */}
          <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-cyan-950/25 via-[#090d1a] to-[#070b16] hover:border-cyan-400/60 transition-all duration-300 p-6 sm:p-7 flex flex-col justify-between relative shadow-xl shadow-cyan-950/20 group">
            {/* Top decorative gradient line */}
            <div className="absolute top-0 left-6 right-6 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent" />

            <div>
              {/* Header: Icon & Badge */}
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shadow-md shadow-cyan-950/40 group-hover:scale-105 transition-transform">
                  <Bot className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/40 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  AI Business Strategist
                </span>
              </div>

              {/* Title & Tagline */}
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                AI Business Agent
              </h2>
              <p className="text-sm font-semibold text-cyan-400 mt-1 mb-3">
                Your AI business strategist.
              </p>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6">
                Your autonomous strategist to diagnose business leaks, benchmark competitors, formulate growth roadmaps, and convert strategic thinking into real action.
              </p>

              {/* Feature Checklist */}
              <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-2.5 text-xs text-slate-200">
                  <div className="w-5 h-5 rounded-md bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                    <TrendingUp className="w-3 h-3" />
                  </div>
                  <span className="font-semibold">Business Analysis</span>
                  <span className="text-[11px] text-slate-400 hidden sm:inline">— Root cause diagnostic & leaks</span>
                </div>

                <div className="flex items-center gap-2.5 text-xs text-slate-200">
                  <div className="w-5 h-5 rounded-md bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                    <Search className="w-3 h-3" />
                  </div>
                  <span className="font-semibold">SEO & Marketing</span>
                  <span className="text-[11px] text-slate-400 hidden sm:inline">— Website audit & search rank intent</span>
                </div>

                <div className="flex items-center gap-2.5 text-xs text-slate-200">
                  <div className="w-5 h-5 rounded-md bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                    <Zap className="w-3 h-3" />
                  </div>
                  <span className="font-semibold">Growth Strategy</span>
                  <span className="text-[11px] text-slate-400 hidden sm:inline">— Prioritized monetization & turnaround</span>
                </div>

                <div className="flex items-center gap-2.5 text-xs text-slate-200">
                  <div className="w-5 h-5 rounded-md bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                    <Globe className="w-3 h-3" />
                  </div>
                  <span className="font-semibold">Competitor Analysis</span>
                  <span className="text-[11px] text-slate-400 hidden sm:inline">— Market positioning & pricing moats</span>
                </div>

                <div className="flex items-center gap-2.5 text-xs text-slate-200">
                  <div className="w-5 h-5 rounded-md bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                    <FileText className="w-3 h-3" />
                  </div>
                  <span className="font-semibold">Reports</span>
                  <span className="text-[11px] text-slate-400 hidden sm:inline">— Executive exports & board-ready briefs</span>
                </div>

                <div className="flex items-center gap-2.5 text-xs text-slate-200">
                  <div className="w-5 h-5 rounded-md bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                    <CheckCircle2 className="w-3 h-3" />
                  </div>
                  <span className="font-semibold">Tasks & Planning</span>
                  <span className="text-[11px] text-slate-400 hidden sm:inline">— Step-by-step action roadmaps</span>
                </div>
              </div>
            </div>

            {/* Bottom Section with CTA */}
            <div className="mt-8 pt-4 border-t border-slate-800/80 flex flex-col gap-3">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                <span>Autonomous Strategy Engine</span>
                <span className="text-cyan-400 font-semibold">Continuous Business Memory</span>
              </div>

              <button
                onClick={handleLaunchBusinessAgent}
                id="card-create-business-agent-btn"
                className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm shadow-md shadow-cyan-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Bot className="w-4 h-4" />
                <span>Create Business Agent</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ========================================== */}
          {/* PRODUCT CARD 2: AI CUSTOMER AGENT          */}
          {/* ========================================== */}
          <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-b from-purple-950/25 via-[#090d1a] to-[#070b16] hover:border-purple-400/60 transition-all duration-300 p-6 sm:p-7 flex flex-col justify-between relative shadow-xl shadow-purple-950/20 group">
            {/* Top decorative gradient line */}
            <div className="absolute top-0 left-6 right-6 h-[2px] bg-gradient-to-r from-transparent via-purple-400/80 to-transparent" />

            <div>
              {/* Header: Icon & Badge */}
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-purple-950/80 border border-purple-500/40 text-purple-400 flex items-center justify-center shadow-md shadow-purple-950/40 group-hover:scale-105 transition-transform">
                  <Users className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-950 text-purple-300 border border-purple-500/40 flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3 text-purple-400" />
                  24/7 AI Employee
                </span>
              </div>

              {/* Title & Tagline */}
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                AI Customer Agent
              </h2>
              <p className="text-sm font-semibold text-purple-400 mt-1 mb-3">
                Your AI employee for customer communication.
              </p>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6">
                Your frontline AI employee to deploy on your website and voice channels to handle customer inquiries, capture leads, book meetings, and escalate smoothly.
              </p>

              {/* Feature Checklist */}
              <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-2.5 text-xs text-slate-200">
                  <div className="w-5 h-5 rounded-md bg-purple-950/80 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                    <MessageSquare className="w-3 h-3" />
                  </div>
                  <span className="font-semibold">Website Chat</span>
                  <span className="text-[11px] text-slate-400 hidden sm:inline">— Embeddable 24/7 conversational widget</span>
                </div>

                <div className="flex items-center gap-2.5 text-xs text-slate-200">
                  <div className="w-5 h-5 rounded-md bg-purple-950/80 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                    <HelpCircle className="w-3 h-3" />
                  </div>
                  <span className="font-semibold">Customer Questions</span>
                  <span className="text-[11px] text-slate-400 hidden sm:inline">— Grounded business FAQs & 0 hallucinations</span>
                </div>

                <div className="flex items-center gap-2.5 text-xs text-slate-200">
                  <div className="w-5 h-5 rounded-md bg-purple-950/80 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                    <UserCheck className="w-3 h-3" />
                  </div>
                  <span className="font-semibold">Lead Capture</span>
                  <span className="text-[11px] text-slate-400 hidden sm:inline">— Name, email, phone & requirements</span>
                </div>

                <div className="flex items-center gap-2.5 text-xs text-slate-200">
                  <div className="w-5 h-5 rounded-md bg-purple-950/80 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                    <Calendar className="w-3 h-3" />
                  </div>
                  <span className="font-semibold">Appointments</span>
                  <span className="text-[11px] text-slate-400 hidden sm:inline">— Real consultation & booking requests</span>
                </div>

                <div className="flex items-center gap-2.5 text-xs text-slate-200">
                  <div className="w-5 h-5 rounded-md bg-purple-950/80 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                    <PhoneCall className="w-3 h-3" />
                  </div>
                  <span className="font-semibold">Voice Calls</span>
                  <span className="text-[11px] text-slate-400 hidden sm:inline">— Inbound telephony & speech synthesis</span>
                </div>

                <div className="flex items-center gap-2.5 text-xs text-slate-200">
                  <div className="w-5 h-5 rounded-md bg-purple-950/80 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                    <UserX className="w-3 h-3" />
                  </div>
                  <span className="font-semibold">Human Handoff</span>
                  <span className="text-[11px] text-slate-400 hidden sm:inline">— Instant escalation to owner or team</span>
                </div>

                <div className="flex items-center gap-2.5 text-xs text-slate-200">
                  <div className="w-5 h-5 rounded-md bg-purple-950/80 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                    <CheckCircle2 className="w-3 h-3" />
                  </div>
                  <span className="font-semibold">Customer Follow-up</span>
                  <span className="text-[11px] text-slate-400 hidden sm:inline">— Automated triggers & booking confirmation</span>
                </div>
              </div>
            </div>

            {/* Bottom Section with CTA */}
            <div className="mt-8 pt-4 border-t border-slate-800/80 flex flex-col gap-3">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                <span>Frontline Customer Operations</span>
                <span className="text-purple-400 font-semibold">Zero-Hallucination Policy</span>
              </div>

              <button
                onClick={handleLaunchCustomerAgent}
                id="card-create-customer-agent-btn"
                className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white font-bold text-sm shadow-md shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Users className="w-4 h-4" />
                <span>Create Customer Agent</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. PRODUCT PREVIEW: REALISTIC DUAL AI AGENT SHOWCASE                      */}
      {/* ========================================================================= */}
      <section id="product" className="relative max-w-4xl mx-auto w-full px-2">
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
                <span className="font-bold text-white">Apex Interior Studio</span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-400">Live Agent Architecture</span>
              </div>
            </div>

            {/* Toggle between Business Agent & Customer Agent previews */}
            <div className="flex items-center p-0.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
              <button
                onClick={() => setActiveInteractiveTab("business")}
                className={`px-3 py-1 rounded-md font-semibold transition-all ${
                  activeInteractiveTab === "business"
                    ? "bg-cyan-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Business Strategist
              </button>
              <button
                onClick={() => setActiveInteractiveTab("customer")}
                className={`px-3 py-1 rounded-md font-semibold transition-all ${
                  activeInteractiveTab === "customer"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Customer Employee
              </button>
            </div>
          </div>

          {/* ==================================================== */}
          {/* VIEW A: AI BUSINESS AGENT PREVIEW                    */}
          {/* ==================================================== */}
          {activeInteractiveTab === "business" && (
            <div>
              {/* Sub-navigation tabs within the mockup */}
              <div className="flex items-center gap-1 px-4 sm:px-6 pt-3 border-b border-slate-800/60 bg-slate-950/30 text-xs">
                <button
                  onClick={() => setBusinessSubTab("chat")}
                  className={`px-3 py-2 border-b-2 font-semibold transition-all cursor-pointer ${
                    businessSubTab === "chat" 
                      ? "border-cyan-400 text-cyan-300" 
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Diagnostic & Strategy
                </button>
                <button
                  onClick={() => setBusinessSubTab("tasks")}
                  className={`px-3 py-2 border-b-2 font-semibold transition-all cursor-pointer ${
                    businessSubTab === "tasks" 
                      ? "border-cyan-400 text-cyan-300" 
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Action Roadmap (2)
                </button>
                <button
                  onClick={() => setBusinessSubTab("context")}
                  className={`px-3 py-2 border-b-2 font-semibold transition-all cursor-pointer ${
                    businessSubTab === "context" 
                      ? "border-cyan-400 text-cyan-300" 
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Market Memory
                </button>
              </div>

              {businessSubTab === "chat" && (
                <div className="p-4 sm:p-6 flex flex-col gap-4">
                  <div className="flex items-start justify-end gap-3">
                    <div className="max-w-[85%] sm:max-w-lg rounded-2xl rounded-tr-sm bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-3 text-xs sm:text-sm font-medium shadow-md">
                      Why are our website visitors not converting into design consultation calls this month?
                    </div>
                    <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
                      U
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-cyan-600/30 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shrink-0 mt-1">
                      <Bot className="w-4 h-4" />
                    </div>

                    <div className="flex-1 rounded-2xl rounded-tl-sm bg-slate-900/90 border border-slate-800 p-4 sm:p-5 text-xs sm:text-sm text-slate-200 flex flex-col gap-4 shadow-sm">
                      <p className="leading-relaxed">
                        I crawled your landing page and cross-referenced with your target customer segments. Here is the verified breakdown:
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-blue-950 text-blue-400 font-mono text-[10px] font-bold shrink-0">
                            OBSERVED
                          </span>
                          <span className="text-slate-300 text-[11px]">
                            Landing page receives 420 monthly clicks, but the contact form asks for 11 fields before showing package prices.
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 font-mono text-[10px] font-bold shrink-0">
                            COMPETITOR
                          </span>
                          <span className="text-slate-300 text-[11px]">
                            Top 2 local interior firms offer 2-question instant WhatsApp estimates with portfolio downloads.
                          </span>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/40 text-xs">
                        <div className="font-bold text-cyan-300 mb-1 flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5" />
                          <span>Immediate Strategic Action:</span>
                        </div>
                        <p className="text-slate-300 leading-normal">
                          Deploy your AI Customer Agent widget to engage visitors in seconds, calculate instant package quotes, and book consultations directly.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button 
                          onClick={handleLaunchBusinessAgent}
                          className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Generate Full Execution Plan</span>
                        </button>
                        <button 
                          onClick={handleLaunchCustomerAgent}
                          className="px-3 py-1.5 rounded-lg bg-purple-600/80 hover:bg-purple-600 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>Deploy Customer Widget</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {businessSubTab === "tasks" && (
                <div className="p-4 sm:p-6 flex flex-col gap-3">
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-cyan-400" />
                      <div>
                        <h4 className="text-xs font-bold text-white">Embed AI Customer Agent Chat Widget</h4>
                        <p className="text-[11px] text-slate-400">Embed 1-line script to capture customer inquiries 24/7</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/40">
                      Ready to Embed
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-400" />
                      <div>
                        <h4 className="text-xs font-bold text-white">Update High-Intent Local Keywords</h4>
                        <p className="text-[11px] text-slate-400">Targeting residential interior packages in primary metro zones</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/40">
                      Completed
                    </span>
                  </div>
                </div>
              )}

              {businessSubTab === "context" && (
                <div className="p-4 sm:p-6 flex flex-col gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div className="text-slate-400 mb-1 font-semibold">Indexed Knowledge Memory:</div>
                    <p className="text-slate-200">
                      Pricing PDF indexed (14 packages), Website crawl verified (12 pages), Competitor pricing monitored.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================================================== */}
          {/* VIEW B: AI CUSTOMER AGENT PREVIEW                    */}
          {/* ==================================================== */}
          {activeInteractiveTab === "customer" && (
            <div className="p-4 sm:p-6 flex flex-col gap-4">
              {/* Customer chat mockup */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-bold text-white">Maya</span>
                  <span className="text-slate-400">· AI Client Specialist (Live on Website)</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-950 text-purple-300 border border-purple-500/40">
                  Zero Hallucination Grounding
                </span>
              </div>

              {/* Message from visitor */}
              <div className="flex items-start justify-end gap-3">
                <div className="max-w-[85%] sm:max-w-md rounded-2xl rounded-tr-sm bg-slate-800 text-white px-4 py-2.5 text-xs sm:text-sm">
                  Hi, do you offer residential 3BHK interior renovation in New Town, and what does it typically cost?
                </div>
                <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
                  V
                </div>
              </div>

              {/* Message from AI employee */}
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0 mt-1">
                  <Users className="w-4 h-4" />
                </div>

                <div className="flex-1 rounded-2xl rounded-tl-sm bg-slate-900/90 border border-slate-800 p-4 text-xs sm:text-sm text-slate-200 flex flex-col gap-3">
                  <p className="leading-relaxed">
                    Hello! Yes, Apex Interior Studio specializes in 3BHK residential projects in New Town. Complete turnkey packages typically range between ₹15L and ₹28L depending on modular woodwork and finish specifications.
                  </p>
                  
                  {/* Lead capture prompt */}
                  <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/30 text-xs">
                    <span className="text-purple-300 font-semibold block mb-1">
                      Would you like our detailed 3BHK brochure and a free 20-minute site consultation?
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      Leave your name and WhatsApp number, and our design team will send the portfolio right away.
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="px-2.5 py-1 rounded bg-slate-800 text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                      <UserCheck className="w-3 h-3" />
                      Lead Capture Ready
                    </span>
                    <span className="px-2.5 py-1 rounded bg-slate-800 text-[11px] text-blue-400 font-semibold flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Calendar Booking Ready
                    </span>
                    <button
                      onClick={handleLaunchCustomerAgent}
                      className="ml-auto text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <span>Configure Agent Responses</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Bar: Quick launch */}
          <div className="px-4 sm:px-6 py-3 bg-slate-950 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-slate-400 font-medium">Ready to deploy your dual AI team?</span>
            <div className="flex items-center gap-3">
              <button
                onClick={handleLaunchBusinessAgent}
                className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>Launch Business Agent</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <span className="text-slate-700">•</span>
              <button
                onClick={handleLaunchCustomerAgent}
                className="text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>Launch Customer Agent</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. HOW IT WORKS (3 STREAMLINED STEPS FOR BOTH AGENTS)                    */}
      {/* ========================================================================= */}
      <section id="how-it-works" className="max-w-4xl mx-auto w-full px-2">
        <div className="text-center mb-12">
          <h2 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-2">
            Seamless Workflow
          </h2>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            How Your Dual AI Team Operates
          </h3>
          <p className="text-sm text-slate-400 mt-2 max-w-lg mx-auto">
            From internal strategy to frontline customer interaction, both agents work in complete synergy.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="p-6 rounded-2xl bg-[#090d1a]/80 border border-slate-800/90 relative flex flex-col">
            <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400 font-bold text-sm mb-4">
              01
            </div>
            <h4 className="text-base font-bold text-white mb-2">Create Your AI Team</h4>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Initialize your AI Business Agent and AI Customer Agent with your business name, industry, catalogs, and website links.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-6 rounded-2xl bg-[#090d1a]/80 border border-slate-800/90 relative flex flex-col">
            <div className="w-9 h-9 rounded-xl bg-blue-950/80 border border-blue-800/60 flex items-center justify-center text-blue-400 font-bold text-sm mb-4">
              02
            </div>
            <h4 className="text-base font-bold text-white mb-2">Deploy Customer Employee</h4>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Embed the AI Customer Agent widget on your website and connect voice lines. It answers questions, captures leads, and requests bookings.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-6 rounded-2xl bg-[#090d1a]/80 border border-slate-800/90 relative flex flex-col">
            <div className="w-9 h-9 rounded-xl bg-purple-950/80 border border-purple-800/60 flex items-center justify-center text-purple-400 font-bold text-sm mb-4">
              03
            </div>
            <h4 className="text-base font-bold text-white mb-2">Strategic Intelligence & Growth</h4>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Your AI Business Agent monitors performance, benchmarks competitors, produces board reports, and identifies revenue opportunities.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. CAPABILITIES OF THE COMPLETE AI PLATFORM                              */}
      {/* ========================================================================= */}
      <section id="capabilities" className="max-w-4xl mx-auto w-full px-2">
        <div className="text-center mb-12">
          <h2 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-2">
            Integrated Ecosystem
          </h2>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Capabilities of Your AI Team
          </h3>
          <p className="text-sm text-slate-400 mt-2 max-w-lg mx-auto">
            Not separate disconnected tools — everything is powered by continuous business context and verified facts.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {/* Capability 1: Strategic Diagnosis */}
          <div className="p-5 rounded-2xl bg-[#090d1a]/70 border border-slate-800/80 hover:border-cyan-500/40 transition-colors flex flex-col justify-between group">
            <div>
              <div className="w-9 h-9 rounded-xl bg-cyan-950/70 border border-cyan-800/40 flex items-center justify-center text-cyan-400 mb-3.5 group-hover:scale-105 transition-transform">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1.5">Business Analysis & Turnaround</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Diagnoses sales drops, conversion leaks, and operational bottlenecks with verified root-cause analysis.
              </p>
            </div>
            <button
              onClick={handleLaunchBusinessAgent}
              className="mt-4 text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer pt-2 border-t border-slate-800/60"
            >
              <span>Explore in Business Agent</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Capability 2: Website Chat & Lead Capture */}
          <div className="p-5 rounded-2xl bg-[#090d1a]/70 border border-slate-800/80 hover:border-purple-500/40 transition-colors flex flex-col justify-between group">
            <div>
              <div className="w-9 h-9 rounded-xl bg-purple-950/70 border border-purple-800/40 flex items-center justify-center text-purple-400 mb-3.5 group-hover:scale-105 transition-transform">
                <MessageSquare className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1.5">Website Chat & Real Leads</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                24/7 customer chat that qualifies inquiries, collects verified contact details, and logs genuine CRM leads.
              </p>
            </div>
            <button
              onClick={handleLaunchCustomerAgent}
              className="mt-4 text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer pt-2 border-t border-slate-800/60"
            >
              <span>Explore in Customer Agent</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Capability 3: Inbound Voice Telephony */}
          <div className="p-5 rounded-2xl bg-[#090d1a]/70 border border-slate-800/80 hover:border-blue-500/40 transition-colors flex flex-col justify-between group">
            <div>
              <div className="w-9 h-9 rounded-xl bg-blue-950/70 border border-blue-800/40 flex items-center justify-center text-blue-400 mb-3.5 group-hover:scale-105 transition-transform">
                <PhoneCall className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1.5">Voice Calls & Phone Reception</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Conversational voice agent capable of handling phone calls, answering FAQs, and routing urgent callers.
              </p>
            </div>
            <button
              onClick={handleLaunchCustomerAgent}
              className="mt-4 text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer pt-2 border-t border-slate-800/60"
            >
              <span>Explore in Customer Agent</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Capability 4: SEO & Market Audit */}
          <div className="p-5 rounded-2xl bg-[#090d1a]/70 border border-slate-800/80 hover:border-cyan-500/40 transition-colors flex flex-col justify-between group">
            <div>
              <div className="w-9 h-9 rounded-xl bg-cyan-950/70 border border-cyan-800/40 flex items-center justify-center text-cyan-400 mb-3.5 group-hover:scale-105 transition-transform">
                <Search className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1.5">SEO & Search Visibility Audits</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Crawls your website, detects title and schema flaws, and discovers buyer-intent local search keywords.
              </p>
            </div>
            <button
              onClick={handleLaunchBusinessAgent}
              className="mt-4 text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer pt-2 border-t border-slate-800/60"
            >
              <span>Explore in Business Agent</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Capability 5: Appointment Scheduling */}
          <div className="p-5 rounded-2xl bg-[#090d1a]/70 border border-slate-800/80 hover:border-emerald-500/40 transition-colors flex flex-col justify-between group">
            <div>
              <div className="w-9 h-9 rounded-xl bg-emerald-950/70 border border-emerald-800/40 flex items-center justify-center text-emerald-400 mb-3.5 group-hover:scale-105 transition-transform">
                <Calendar className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1.5">Appointment & Consultation Booking</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Receives booking requests, collects dates and customer requirements, and alerts your team for confirmation.
              </p>
            </div>
            <button
              onClick={handleLaunchCustomerAgent}
              className="mt-4 text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer pt-2 border-t border-slate-800/60"
            >
              <span>Explore in Customer Agent</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Capability 6: Competitor & Market Research */}
          <div className="p-5 rounded-2xl bg-[#090d1a]/70 border border-slate-800/80 hover:border-purple-500/40 transition-colors flex flex-col justify-between group">
            <div>
              <div className="w-9 h-9 rounded-xl bg-purple-950/70 border border-purple-800/40 flex items-center justify-center text-purple-400 mb-3.5 group-hover:scale-105 transition-transform">
                <Globe className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1.5">Competitor & Market Research</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Monitors competitor positioning and extracts export demand insights across regional and global markets.
              </p>
            </div>
            <button
              onClick={handleLaunchBusinessAgent}
              className="mt-4 text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer pt-2 border-t border-slate-800/60"
            >
              <span>Explore in Business Agent</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. PRICING PREVIEW                                                        */}
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
            Deploy your AI Business Agent and AI Customer Agent on clear, predictable tiers.
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
              <p className="text-xs text-slate-400 mb-6">Test both agents with your own business data.</p>

              <div className="space-y-2.5 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>1 AI Business Agent profile</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>1 AI Customer Agent widget</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Website Chat & Lead Capture</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Basic SEO & URL audit</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleLaunchBusinessAgent}
              className="mt-8 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              Start Free
            </button>
          </div>

          {/* Pro Plan (Featured) */}
          <div className="p-6 rounded-2xl bg-gradient-to-b from-cyan-950/40 via-[#090d1a] to-[#090d1a] border-2 border-cyan-500/50 flex flex-col justify-between relative shadow-xl shadow-cyan-950/40">
            <div className="absolute -top-3 right-6 px-2.5 py-0.5 rounded-full bg-cyan-500 text-slate-950 font-bold text-[10px] tracking-wide uppercase">
              Most Popular
            </div>

            <div>
              <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">Pro Growth</div>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-3xl font-extrabold text-white">$29</span>
                <span className="text-xs text-slate-400">/ month</span>
              </div>
              <p className="text-xs text-slate-300 mb-6">Complete strategic autonomy and 24/7 customer reception.</p>

              <div className="space-y-2.5 text-xs text-slate-200">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Full AI Business Agent suite</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Full AI Customer Agent employee</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Unlimited Website Chat & Lead Logging</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Voice Call Simulator & Telephony</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Document Vault & Catalog Indexing</span>
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
              <p className="text-xs text-slate-400 mb-6">Multi-brand businesses, franchises, and high-volume teams.</p>

              <div className="space-y-2.5 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Multiple Specialized Business Agents</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Dedicated AI Customer Employees</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Custom CRM & Telephony Webhooks</span>
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
      {/* 7. FINAL CALL TO ACTION                                                   */}
      {/* ========================================================================= */}
      <section className="max-w-4xl mx-auto w-full px-2">
        <div className="rounded-3xl bg-gradient-to-r from-blue-950/60 via-slate-900 to-purple-950/60 border border-slate-800 p-8 sm:p-12 text-center relative overflow-hidden">
          <div className="max-w-xl mx-auto flex flex-col items-center">
            <h3 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
              Ready to empower your business with an AI Team?
            </h3>
            <p className="text-xs sm:text-base text-slate-300 mb-8 leading-relaxed">
              Run your strategy with the AI Business Agent, and handle your customers with the AI Customer Agent.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <button
                onClick={handleLaunchBusinessAgent}
                id="cta-create-business-agent-btn"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm shadow-xl shadow-cyan-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Bot className="w-4 h-4" />
                <span>Create AI Business Agent</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={handleLaunchCustomerAgent}
                id="cta-create-customer-agent-btn"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white font-bold text-sm shadow-xl shadow-indigo-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Users className="w-4 h-4" />
                <span>Create AI Customer Agent</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. MINIMAL FOOTER                                                         */}
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
            onClick={() => scrollToSection("products")}
            className="hover:text-slate-200 transition-colors cursor-pointer"
          >
            Products
          </button>
          <button 
            onClick={() => scrollToSection("product")}
            className="hover:text-slate-200 transition-colors cursor-pointer"
          >
            Showcase
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

import React, { useState } from "react";
import { 
  Globe, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  Bookmark,
  BookmarkCheck, 
  Loader2, 
  AlertCircle, 
  Check, 
  Calendar, 
  ChevronRight,
  Clock,
  ExternalLink,
  Target,
  MessageSquare,
  Mail,
  Zap,
  Tag,
  HelpCircle,
  TrendingUp,
  Search,
  Smartphone,
  Briefcase
} from "lucide-react";
import { ActiveTab, SavedItem, SolutionPack, PracticalProblemSolverResult } from "../types";
import { normalizeErrorMessage } from "../utils/errorUtils";
import { useLanguage } from "../i18n/LanguageContext";
import { AILanguageSelector } from "./AILanguageSelector";

interface HomeViewProps {
  setActiveTab: (tab: ActiveTab) => void;
  onSaveItem: (item: Omit<SavedItem, "id" | "createdAt">) => void;
  savedItemIds: string[];
}

const COMMON_SCENARIOS = [
  {
    id: "low_sales",
    icon: "📉",
    label: "Low Sales & High Drop-off",
    query: "My sales are low and visitors leave without buying. Diagnose why people aren't purchasing, fix my offer, and create ready-to-use headlines, WhatsApp scripts, and an exact 7-day turnaround plan.",
  },
  {
    id: "no_customers",
    icon: "👥",
    label: "Zero Customers / Cold Start",
    query: "I have zero customers right now. Define my ideal customer, give me ready-to-send cold outreach and referral messages, and build a 7-day plan to get my first paying clients without ad budget.",
  },
  {
    id: "website_conversion",
    icon: "🌐",
    label: "Website Not Converting",
    query: "My website gets traffic but zero inquiries or orders. Inspect my page, rewrite my headline and CTA, fix my trust section, and give me a 7-day plan to increase conversions.",
  },
  {
    id: "zero_budget",
    icon: "💰",
    label: "No Money for Marketing",
    query: "I have no money for paid advertising. Give me a 100% free and organic customer acquisition plan with ready-to-copy WhatsApp scripts, local SEO updates, and direct outreach.",
  },
  {
    id: "local_shop",
    icon: "📍",
    label: "Local Foot-Traffic & Inquiries",
    query: "I run a local business and need more walk-ins and phone calls. Create Google Business updates, genuine review request scripts, and a 7-day local visibility plan.",
  },
  {
    id: "export_b2b",
    icon: "🌍",
    label: "B2B & Export Inquiries",
    query: "We manufacture and want wholesale B2B buyers overseas. Write a high-converting B2B cold email, clarify our export offer, and give us an outreach plan for foreign buyers.",
  },
];

export const HomeView: React.FC<HomeViewProps> = ({ setActiveTab, onSaveItem }) => {
  const { t, language, languageInfo } = useLanguage();
  
  // Single-input state
  const [problemQuery, setProblemQuery] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [showWebsiteField, setShowWebsiteField] = useState(false);
  
  // Execution & Output state
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [solutionPack, setSolutionPack] = useState<SolutionPack | null>(null);
  const [practicalResult, setPracticalResult] = useState<PracticalProblemSolverResult | null>(null);
  
  // Interactive Tracker & Copy state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [completedDays, setCompletedDays] = useState<Record<number, boolean>>({});
  const [hasSavedToVault, setHasSavedToVault] = useState(false);
  const [activeMaterialTab, setActiveMaterialTab] = useState<
    "headlines" | "whatsapp" | "email" | "offer" | "cta" | "faq"
  >("headlines");

  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleDayComplete = (day: number) => {
    setCompletedDays((prev) => ({
      ...prev,
      [day]: !prev[day],
    }));
  };

  const handleSolveProblem = async (overrideQuery?: string, overrideUrl?: string) => {
    const queryToUse = (overrideQuery ?? problemQuery).trim();
    const urlToUse = (overrideUrl ?? websiteUrl).trim();

    if (!queryToUse) {
      setErrorMessage("Please describe your business problem in a few words before clicking Solve My Problem.");
      return;
    }

    if (isLoading) return;

    setIsLoading(true);
    setErrorMessage(null);
    setSolutionPack(null);
    setPracticalResult(null);
    setHasSavedToVault(false);
    setCompletedDays({});
    setLoadingStep(1);

    const stepTimer1 = setTimeout(() => setLoadingStep(2), 1200);
    const stepTimer2 = setTimeout(() => setLoadingStep(3), 2800);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55000);

    try {
      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ 
          query: queryToUse,
          websiteUrl: urlToUse || undefined,
          doItForMe: true,
          language: languageInfo.code,
          languageName: `${languageInfo.nativeName} (${languageInfo.name})`,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        const text = await res.text();
        const snippet = text.slice(0, 140).replace(/<[^>]*>/g, "").trim();
        throw new Error(snippet ? `Server response error: ${snippet}` : `Unexpected response (HTTP ${res.status}).`);
      }

      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(normalizeErrorMessage(data?.error || data?.message, "Problem solver is temporarily busy. Please retry."));
      }

      const payload = data.data || data;

      const practical: PracticalProblemSolverResult | null = payload.practicalResult || (payload.solutionPack ? {
        understood: payload.solutionPack.diagnosis?.summary || "Understood your business problem.",
        real_problem: payload.solutionPack.diagnosis?.main_problem || "Friction in customer acquisition and conversion.",
        immediate_action: payload.solutionPack.next_action || "Deploy the new headline and send the ready outreach script.",
        ready_materials: {
          main_script: payload.solutionPack.ready_materials?.whatsapp_scripts?.[0] || "Hi, thank you for reaching out...",
          headline_or_offer: payload.solutionPack.ready_materials?.headline_options?.[0] || payload.solutionPack.ready_materials?.offer_or_pricing || "High-converting commercial offer",
          cta: payload.solutionPack.ready_materials?.cta_examples?.[0] || "Chat on WhatsApp",
          extra_material: payload.solutionPack.ready_materials?.email_or_dm_scripts?.[0] || "Follow-up message template",
        },
        action_plan: payload.solutionPack.seven_day_plan?.map((d: any) => ({
          day: d.day,
          task: d.tasks?.[0] || d.title,
        })) || [],
        expected_result: payload.solutionPack.expected_outcome || "Realistic buyer conversations within 5-7 days.",
        next_one_thing: payload.solutionPack.next_action || "Deploy the ready outreach script today.",
        website_data: payload.solutionPack.website_data,
      } : null);

      setPracticalResult(practical);

      const pack: SolutionPack = payload.solutionPack || {
        diagnosis: {
          main_problem: practical?.real_problem || payload.answer || "Bottleneck identified",
          root_causes: [practical?.real_problem || "Conversion friction"],
          severity: "High",
          summary: practical?.understood || payload.diagnosis?.summary || payload.answer || "Diagnosis completed.",
        },
        ready_materials: {
          headline_options: practical?.ready_materials?.headline_or_offer ? [practical.ready_materials.headline_or_offer] : (payload.readyMaterials?.filter((m: any) => m.category === "headline_cta").map((m: any) => m.content) || ["High-Converting Business Headline"]),
          whatsapp_scripts: practical?.ready_materials?.main_script ? [practical.ready_materials.main_script] : (payload.readyMaterials?.filter((m: any) => m.category === "whatsapp_message").map((m: any) => m.content) || ["Hi, thank you for reaching out..."]),
          email_or_dm_scripts: practical?.ready_materials?.extra_material ? [practical.ready_materials.extra_material] : (payload.readyMaterials?.filter((m: any) => m.category === "email_sequence").map((m: any) => m.content) || ["Hi, I noticed your business..."]),
          offer_or_pricing: practical?.ready_materials?.headline_or_offer || payload.readyMaterials?.find((m: any) => m.category === "offer_positioning")?.content || "Clear commercial value offer",
          cta_examples: practical?.ready_materials?.cta ? [practical.ready_materials.cta] : ["Chat on WhatsApp", "Get Instant Quote"],
          faqs: payload.readyMaterials?.filter((m: any) => m.category === "faq").map((m: any) => ({ question: m.title, answer: m.content })) || [],
        },
        seven_day_plan: practical?.action_plan ? practical.action_plan.map((d: any) => ({
          day: d.day,
          title: d.task.slice(0, 30),
          tasks: [d.task],
          time_required: "30-45 mins",
        })) : (payload.sevenDayPlan?.map((d: any, idx: number) => ({
          day: idx + 1,
          title: d.focus || `Day ${idx + 1} Action`,
          tasks: [d.action],
          time_required: d.materialSnippet || "30-45 mins",
        })) || []),
        growth_roadmap: {
          day_30: payload.actionPlan?.next30Days?.[0] || "Consistent inbound inquiries established",
          day_60: payload.actionPlan?.next60Days?.[0] || "Repeat buyer relationships and referral engine running",
          day_90: payload.actionPlan?.next90Days?.[0] || "Scaling sales to new channels or territories",
        },
        expected_outcome: practical?.expected_result || payload.nextSteps?.[1] || "3-8 qualified buyer conversations within 7-14 days.",
        next_action: practical?.next_one_thing || practical?.immediate_action || payload.nextAction?.actionText || "Deploy the new headline and direct WhatsApp CTA immediately.",
        website_data: practical?.website_data || payload.websiteCrawlData,
      };

      setSolutionPack(pack);

      // AUTO-SAVE FULL SOLUTION PACK TO DASHBOARD / VAULT
      const reportTitle = queryToUse.length > 40 
        ? `${queryToUse.slice(0, 38)}...` 
        : queryToUse;

      onSaveItem({
        type: "assistant",
        title: `Solution Pack: ${reportTitle}`,
        summary: `Problem: ${practical?.real_problem || pack.diagnosis.main_problem}. Next Action: ${practical?.next_one_thing || pack.next_action}`,
        content: payload.content || JSON.stringify({ practicalResult: practical, solutionPack: pack }),
        category: "Solution Pack",
        tags: ["Problem Solver", "7-Day Plan", "Ready Materials"],
        context: `Query: ${queryToUse} ${urlToUse ? `| Website: ${urlToUse}` : ""}`,
      });

      setHasSavedToVault(true);

      // Scroll smoothly to output
      setTimeout(() => {
        document.getElementById("solution-pack-output")?.scrollIntoView({ behavior: "smooth" });
      }, 150);
    } catch (err: unknown) {
      console.error("Problem solver error:", err);
      let msg = "Failed to solve problem.";
      if (err instanceof Error && err.name === "AbortError") {
        msg = "Request timed out after 55 seconds. Please try with a slightly shorter problem description.";
      } else {
        msg = normalizeErrorMessage(err, "Problem solver is temporarily unavailable. Please retry.");
      }
      setErrorMessage(msg);
      setSolutionPack(null);
    } finally {
      setIsLoading(false);
      setLoadingStep(1);
    }
  };

  const activePlan = solutionPack?.seven_day_plan || practicalResult?.action_plan?.map((d) => ({
    day: d.day,
    title: d.task.slice(0, 30),
    tasks: [d.task],
    time_required: "30-45 mins",
  })) || [];
  const completedCount = Object.values(completedDays).filter(Boolean).length;
  const totalDays = activePlan.length || 7;
  const progressPercent = totalDays > 0 ? Math.round((completedCount / totalDays) * 100) : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* ============================================================== */}
      {/* 1. HERO SECTION: SINGLE-PROMPT COMMAND CENTER                 */}
      {/* ============================================================== */}
      <section className="text-center pt-2 sm:pt-4 space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>All-in-One Problem Solver & Growth Coach</span>
        </div>
        
        <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
          What is holding your business back today?
        </h1>
        
        <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
          Describe your problem in plain words (English, Bangla, Hindi, or mixed). We diagnose what is broken, inspect your website if provided, and generate your ready-to-use execution pack.
        </p>
      </section>

      {/* ============================================================== */}
      {/* 2. THE ONE INPUT BOX                                          */}
      {/* ============================================================== */}
      <section className="p-4 sm:p-6 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-cyan-500/40 shadow-2xl shadow-cyan-950/40 relative">
        <div className="space-y-3.5">
          {/* AI Response Language Selection (inside the AI feature) */}
          <AILanguageSelector label="Which language should I use for your AI response?" />

          <div className="flex items-center justify-between text-xs pt-1">
            <label htmlFor="problem-input" className="font-bold text-slate-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              Describe Your Business Problem
            </label>
            <span className="text-[11px] text-cyan-400 font-mono">
              Ready in {languageInfo.nativeName}
            </span>
          </div>

          {/* Central Problem Textarea */}
          <textarea
            id="problem-input"
            rows={4}
            value={problemQuery}
            onChange={(e) => setProblemQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSolveProblem();
              }
            }}
            placeholder="e.g. 'I sell handcrafted ceramics online. 400 people visit my store each week, but zero sales happen. Visitors leave immediately. What is broken?' or 'Mera Kolkata me boutique hai, local foot-traffic nahi aa raha hai.'"
            className="w-full rounded-2xl bg-slate-950 border border-slate-700/80 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 text-white placeholder-slate-500 p-4 text-xs sm:text-sm leading-relaxed resize-none outline-none transition-all"
          />

          {/* Optional Website URL Toggle & Input */}
          <div className="pt-0.5">
            {!showWebsiteField && !websiteUrl ? (
              <button
                type="button"
                onClick={() => setShowWebsiteField(true)}
                className="text-xs text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1.5 transition-colors cursor-pointer py-1"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>+ Include Website URL for live crawler inspection (finds conversion leaks)</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus-within:border-cyan-400 transition-colors">
                <Globe className="w-4 h-4 text-cyan-400 shrink-0" />
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://yourwebsite.com (we crawl observable headlines, CTAs, and trust signals)"
                  className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-slate-500 outline-none"
                />
                {websiteUrl && (
                  <button
                    type="button"
                    onClick={() => setWebsiteUrl("")}
                    className="text-slate-500 hover:text-white text-xs px-1.5 py-0.5"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Quick Pre-fill Scenario Chips */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-semibold text-slate-400 block">
              Or tap a common business scenario to test:
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none">
              {COMMON_SCENARIOS.map((scen) => (
                <button
                  key={scen.id}
                  type="button"
                  onClick={() => {
                    setProblemQuery(scen.query);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-800 hover:border-cyan-500/40 text-[11px] font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <span>{scen.icon}</span>
                  <span>{scen.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Stepped Loading Animation */}
          {isLoading && (
            <div className="p-4 rounded-2xl bg-slate-950/90 border border-cyan-500/40 space-y-2.5 animate-in fade-in">
              <div className="flex items-center justify-between text-cyan-300 text-xs font-semibold">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                  Diagnosing bottleneck & building Solution Pack...
                </span>
                <span className="font-mono text-[11px]">Step {loadingStep} of 3</span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>1. Inspecting problem context & customer buying barriers</span>
                </div>
                <div className={`flex items-center gap-2 ${loadingStep >= 2 ? "text-slate-300" : "text-slate-600"}`}>
                  {loadingStep >= 2 ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-700 shrink-0" />}
                  <span>2. Crawling website & formulating root-cause diagnosis</span>
                </div>
                <div className={`flex items-center gap-2 ${loadingStep >= 3 ? "text-slate-300" : "text-slate-600"}`}>
                  {loadingStep >= 3 ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-700 shrink-0" />}
                  <span>3. Generating ready-to-copy materials & 7-Day Day-by-Day Action Plan</span>
                </div>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block">Problem Solver Notice</span>
                <p className="mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Primary CTA: "Solve My Problem" */}
          <div className="pt-2">
            <button
              id="btn-solve-my-problem-main"
              onClick={() => handleSolveProblem()}
              disabled={isLoading || !problemQuery.trim()}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-cyan-400 via-teal-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 active:scale-98 text-slate-950 font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/25 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-slate-950" />
                  <span>Diagnosing & Generating Solution Pack...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-slate-950 fill-slate-950" />
                  <span>🚀 Solve My Problem</span>
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 3. DYNAMIC PRACTICAL SOLUTION & EXECUTION PACK OUTPUT          */}
      {/* ============================================================== */}
      {(practicalResult || solutionPack) && (
        <section id="solution-pack-output" className="space-y-5 animate-in fade-in duration-300">
          {/* Top Sticky Bar: Immediate Next Action & Vault Status */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-cyan-950 via-slate-900 to-indigo-950 border-2 border-cyan-500/60 shadow-2xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-cyan-800/40">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-cyan-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                  START HERE • NEXT ONE THING TODAY
                </span>
                <span className="text-xs text-slate-300">The single most important step right now:</span>
              </div>
              
              {hasSavedToVault && (
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className="px-2.5 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Saved in Vault</span>
                </button>
              )}
            </div>

            <p className="text-xs sm:text-sm font-bold text-white leading-relaxed">
              {practicalResult?.next_one_thing || solutionPack?.next_action}
            </p>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
              <span className="text-slate-400 text-[11px] italic">
                I prepared everything inside the app. You only need to copy, send, or publish it.
              </span>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(practicalResult?.next_one_thing || solutionPack?.next_action || "", "next-action-copy")}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-700/60 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedKey === "next-action-copy" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === "next-action-copy" ? "Copied!" : "Copy Action"}</span>
                </button>
                <button
                  onClick={() => {
                    toggleDayComplete(1);
                    document.getElementById("seven-day-plan")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/20"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Start Day 1</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section 1: Honest Root-Cause Diagnosis */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-bold text-white">1. Problem Diagnosis & Bottlenecks</h2>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                (solutionPack?.diagnosis.severity === "High" || !solutionPack)
                  ? "bg-rose-950 text-rose-300 border border-rose-800/60"
                  : "bg-amber-950 text-amber-300 border border-amber-800/60"
              }`}>
                Severity: {solutionPack?.diagnosis.severity || "High"}
              </span>
            </div>

            {/* Understood banner */}
            {practicalResult?.understood && (
              <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs text-cyan-200 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-cyan-300 block">Understood:</span>
                  <span>{practicalResult.understood}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono text-amber-400 uppercase font-semibold block">
                  ⚠️ What Is Actually Wrong (Real Problem)
                </span>
                <p className="text-white font-medium leading-relaxed">
                  {practicalResult?.real_problem || solutionPack?.diagnosis.main_problem}
                </p>
                {solutionPack?.diagnosis.summary && (
                  <p className="text-slate-400 text-[11px] leading-relaxed pt-1">
                    {solutionPack.diagnosis.summary}
                  </p>
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-emerald-400 uppercase font-semibold block">
                    ⚡ Immediate Action (Do Right Now)
                  </span>
                  <button
                    onClick={() => handleCopy(practicalResult?.immediate_action || solutionPack?.next_action || "", "immediate-action-copy")}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    {copiedKey === "immediate-action-copy" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === "immediate-action-copy" ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <p className="text-white font-medium leading-relaxed">
                  {practicalResult?.immediate_action || solutionPack?.next_action}
                </p>
              </div>
            </div>

            {/* Crawled Webpage Evidence if Available */}
            {(practicalResult?.website_data || solutionPack?.website_data) && (
              <div className="p-3 rounded-xl bg-slate-950/90 border border-cyan-500/30 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-cyan-300 font-mono">
                  <span>Crawled Webpage: {(practicalResult?.website_data || solutionPack?.website_data)?.url}</span>
                  <span>Health Score: {(practicalResult?.website_data || solutionPack?.website_data)?.score || 0}/100</span>
                </div>
                <div className="text-[11px] text-slate-300">
                  <strong className="text-white">Observed Title: </strong>
                  <span>{(practicalResult?.website_data || solutionPack?.website_data)?.detectedTitle || "None"}</span>
                </div>
                {(practicalResult?.website_data || solutionPack?.website_data)?.observableIssues && (practicalResult?.website_data || solutionPack?.website_data)!.observableIssues!.length > 0 && (
                  <div className="text-[11px] text-slate-400">
                    <strong className="text-amber-400">Conversion Leaks: </strong>
                    <span>{(practicalResult?.website_data || solutionPack?.website_data)!.observableIssues!.join("; ")}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 2: Ready-to-Copy Materials Vault */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Copy className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-bold text-white">2. Ready-to-Copy Materials Vault</h2>
              </div>
              <span className="text-[11px] text-slate-400">
                1-click copy & paste directly into your site, WhatsApp, or messages
              </span>
            </div>

            {/* Instant 4 Practical Materials Quick Cards */}
            {practicalResult?.ready_materials && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {/* 1. Main WhatsApp / DM Script */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-emerald-400 uppercase font-semibold flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                      💬 Main WhatsApp / DM Script
                    </span>
                    <button
                      onClick={() => handleCopy(practicalResult.ready_materials.main_script, "quick-wa")}
                      className="px-2.5 py-1 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === "quick-wa" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === "quick-wa" ? "Copied" : "Copy Message"}</span>
                    </button>
                  </div>
                  <pre className="text-slate-200 font-sans whitespace-pre-wrap leading-relaxed text-xs bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    {practicalResult.ready_materials.main_script}
                  </pre>
                </div>

                {/* 2. New Headline or Offer */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-cyan-500/30 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-cyan-400 uppercase font-semibold flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-cyan-400" />
                      🏷️ New Headline or Offer
                    </span>
                    <button
                      onClick={() => handleCopy(practicalResult.ready_materials.headline_or_offer, "quick-hl")}
                      className="px-2.5 py-1 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === "quick-hl" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === "quick-hl" ? "Copied" : "Copy Offer"}</span>
                    </button>
                  </div>
                  <pre className="text-slate-200 font-sans whitespace-pre-wrap leading-relaxed text-xs bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    {practicalResult.ready_materials.headline_or_offer}
                  </pre>
                </div>

                {/* 3. Call-to-Action (CTA) */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-blue-500/30 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-blue-400 uppercase font-semibold flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-blue-400" />
                      🔘 Call-to-Action (CTA)
                    </span>
                    <button
                      onClick={() => handleCopy(practicalResult.ready_materials.cta, "quick-cta")}
                      className="px-2.5 py-1 rounded-lg bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === "quick-cta" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === "quick-cta" ? "Copied" : "Copy CTA"}</span>
                    </button>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                    <span className="text-white font-bold">"{practicalResult.ready_materials.cta}"</span>
                    <span className="text-[10px] text-slate-400">High-intent conversion</span>
                  </div>
                </div>

                {/* 4. Extra Material (Bio / Email / Caption) */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-purple-500/30 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-purple-400 uppercase font-semibold flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-purple-400" />
                      ✉️ Extra Material (Bio / Follow-up / Email)
                    </span>
                    <button
                      onClick={() => handleCopy(practicalResult.ready_materials.extra_material, "quick-extra")}
                      className="px-2.5 py-1 rounded-lg bg-purple-950 hover:bg-purple-900 text-purple-300 border border-purple-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === "quick-extra" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === "quick-extra" ? "Copied" : "Copy Extra"}</span>
                    </button>
                  </div>
                  <pre className="text-slate-200 font-sans whitespace-pre-wrap leading-relaxed text-xs bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    {practicalResult.ready_materials.extra_material}
                  </pre>
                </div>
              </div>
            )}

            {/* Extended Variations Tabs (if solutionPack has extra headlines/faqs) */}
            {solutionPack && (
              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 block">
                  Extended Materials & Variations:
                </span>

            {/* Material Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              <button
                onClick={() => setActiveMaterialTab("headlines")}
                className={`px-3 py-1.5 rounded-xl border font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  activeMaterialTab === "headlines"
                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50"
                    : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                }`}
              >
                🏷️ Headlines ({solutionPack.ready_materials.headline_options?.length || 0})
              </button>
              <button
                onClick={() => setActiveMaterialTab("whatsapp")}
                className={`px-3 py-1.5 rounded-xl border font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  activeMaterialTab === "whatsapp"
                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50"
                    : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                }`}
              >
                💬 WhatsApp Scripts ({solutionPack.ready_materials.whatsapp_scripts?.length || 0})
              </button>
              <button
                onClick={() => setActiveMaterialTab("email")}
                className={`px-3 py-1.5 rounded-xl border font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  activeMaterialTab === "email"
                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50"
                    : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                }`}
              >
                ✉️ Cold Outreach / DM
              </button>
              <button
                onClick={() => setActiveMaterialTab("offer")}
                className={`px-3 py-1.5 rounded-xl border font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  activeMaterialTab === "offer"
                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50"
                    : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                }`}
              >
                💡 Offer & Pricing
              </button>
              <button
                onClick={() => setActiveMaterialTab("cta")}
                className={`px-3 py-1.5 rounded-xl border font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  activeMaterialTab === "cta"
                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50"
                    : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                }`}
              >
                🔘 CTAs
              </button>
              <button
                onClick={() => setActiveMaterialTab("faq")}
                className={`px-3 py-1.5 rounded-xl border font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  activeMaterialTab === "faq"
                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50"
                    : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                }`}
              >
                ❓ FAQs ({solutionPack.ready_materials.faqs?.length || 0})
              </button>
            </div>

            {/* Tab 1: Headlines */}
            {activeMaterialTab === "headlines" && (
              <div className="space-y-2">
                {solutionPack.ready_materials.headline_options?.map((hl, i) => (
                  <div key={i} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono text-cyan-400 uppercase font-semibold">Option {i + 1}</span>
                      <p className="text-white font-medium">{hl}</p>
                    </div>
                    <button
                      onClick={() => handleCopy(hl, `headline-${i}`)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-700/60 text-xs font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      {copiedKey === `headline-${i}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === `headline-${i}` ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 2: WhatsApp Scripts */}
            {activeMaterialTab === "whatsapp" && (
              <div className="space-y-2.5">
                {solutionPack.ready_materials.whatsapp_scripts?.map((script, i) => (
                  <div key={i} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-emerald-400 uppercase font-semibold">
                        WhatsApp Script {i + 1} (Inbound / Follow-Up)
                      </span>
                      <button
                        onClick={() => handleCopy(script, `wa-${i}`)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === `wa-${i}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === `wa-${i}` ? "Copied" : "Copy Message"}</span>
                      </button>
                    </div>
                    <pre className="text-slate-200 font-sans whitespace-pre-wrap leading-relaxed text-xs bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                      {script}
                    </pre>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 3: Email / DM Script */}
            {activeMaterialTab === "email" && (
              <div className="space-y-2">
                {solutionPack.ready_materials.email_or_dm_scripts?.map((email, i) => (
                  <div key={i} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-cyan-400 uppercase font-semibold">
                        Outreach Script {i + 1}
                      </span>
                      <button
                        onClick={() => handleCopy(email, `email-${i}`)}
                        className="px-2.5 py-1 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === `email-${i}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === `email-${i}` ? "Copied" : "Copy Script"}</span>
                      </button>
                    </div>
                    <pre className="text-slate-200 font-sans whitespace-pre-wrap leading-relaxed text-xs bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                      {email}
                    </pre>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 4: Offer & Pricing */}
            {activeMaterialTab === "offer" && (
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-purple-400 uppercase font-semibold">
                    Offer & Pricing Framework
                  </span>
                  <button
                    onClick={() => handleCopy(solutionPack.ready_materials.offer_or_pricing, "offer-copy")}
                    className="px-2.5 py-1 rounded-lg bg-purple-950 hover:bg-purple-900 text-purple-300 border border-purple-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === "offer-copy" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === "offer-copy" ? "Copied" : "Copy Offer"}</span>
                  </button>
                </div>
                <div className="text-slate-200 leading-relaxed whitespace-pre-wrap bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
                  {solutionPack.ready_materials.offer_or_pricing}
                </div>
              </div>
            )}

            {/* Tab 5: CTAs */}
            {activeMaterialTab === "cta" && (
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {solutionPack.ready_materials.cta_examples?.map((cta, i) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
                      <span className="text-white font-medium">"{cta}"</span>
                      <button
                        onClick={() => handleCopy(cta, `cta-${i}`)}
                        className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-800 text-xs font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        {copiedKey === `cta-${i}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey === `cta-${i}` ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 6: FAQs */}
            {activeMaterialTab === "faq" && (
              <div className="space-y-2 text-xs">
                {solutionPack.ready_materials.faqs?.map((faq, i) => (
                  <div key={i} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-white">Q: {faq.question}</span>
                      <button
                        onClick={() => handleCopy(`Q: ${faq.question}\nA: ${faq.answer}`, `faq-${i}`)}
                        className="text-slate-400 hover:text-cyan-300 p-1 cursor-pointer"
                        title="Copy Q&A"
                      >
                        {copiedKey === `faq-${i}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      A: {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            )}
              </div>
            )}
          </div>

          {/* Section 3: Exact 7-Day Action Plan */}
          <div id="seven-day-plan" className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-bold text-white">3. Exact 7-Day Action Plan</h2>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400">
                {completedCount} of {totalDays} Completed ({progressPercent}%)
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="space-y-2.5 pt-1">
              {activePlan.map((dayItem) => {
                const isChecked = Boolean(completedDays[dayItem.day]);
                return (
                  <div
                    key={dayItem.day}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isChecked 
                        ? "bg-emerald-950/20 border-emerald-500/40 text-emerald-200" 
                        : "bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <button
                          type="button"
                          onClick={() => toggleDayComplete(dayItem.day)}
                          className="mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center cursor-pointer transition-colors shrink-0"
                          style={{
                            borderColor: isChecked ? "#10b981" : "#475569",
                            backgroundColor: isChecked ? "#064e3b" : "transparent"
                          }}
                          aria-label={`Mark Day ${dayItem.day} completed`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                        </button>
                        
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] font-mono font-bold text-cyan-400">
                              DAY {dayItem.day}
                            </span>
                            <span className={`text-xs sm:text-sm font-bold ${isChecked ? "line-through text-slate-500" : "text-white"}`}>
                              {dayItem.title}
                            </span>
                          </div>

                          <ul className="space-y-1 text-xs text-slate-300 list-disc list-inside">
                            {dayItem.tasks.map((task, tIdx) => (
                              <li key={tIdx} className={isChecked ? "text-slate-500" : ""}>
                                {task}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {dayItem.time_required}
                        </span>
                        <button
                          onClick={() => handleCopy(dayItem.tasks.join("\n"), `day-${dayItem.day}`)}
                          className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer"
                        >
                          {copiedKey === `day-${dayItem.day}` ? "Copied!" : "Copy Task"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 4: 30 / 60 / 90-Day Growth Roadmap */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-white">4. 30 / 60 / 90-Day Growth Roadmap</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase block">
                  Month 1 (30 Days)
                </span>
                <p className="text-slate-200 font-medium leading-relaxed">
                  {solutionPack?.growth_roadmap?.day_30 || "Consistent inbound inquiries established"}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono text-blue-400 font-bold uppercase block">
                  Month 2 (60 Days)
                </span>
                <p className="text-slate-200 font-medium leading-relaxed">
                  {solutionPack?.growth_roadmap?.day_60 || "Repeat buyer relationships and referral engine running"}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono text-purple-400 font-bold uppercase block">
                  Month 3 (90 Days)
                </span>
                <p className="text-slate-200 font-medium leading-relaxed">
                  {solutionPack?.growth_roadmap?.day_90 || "Scaling sales to new channels or territories"}
                </p>
              </div>
            </div>
          </div>

          {/* Section 5: Realistic Expected Outcome */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-950 to-slate-950 border border-emerald-500/40 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Expected Realistic Outcome</span>
            </div>
            
            <p className="text-xs sm:text-sm font-medium text-slate-100 leading-relaxed">
              If you follow this 7-day plan: <strong className="text-emerald-300">{practicalResult?.expected_result || solutionPack?.expected_outcome || "3-8 qualified buyer conversations within 7-14 days."}</strong>
            </p>
            
            <p className="text-[11px] text-slate-400 pt-1">
              Test and measure every action over 7-14 days. We don't make fake guarantees of 100 sales — this plan focuses on real customer conversations and removing conversion friction.
            </p>
          </div>
        </section>
      )}

      {/* ============================================================== */}
      {/* 4. DEEP-DIVE PLATFORM HUBS SHORTCUTS                           */}
      {/* ============================================================== */}
      <section className="pt-2 space-y-2">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block px-1">
          Specialized Growth Hubs
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <button
            onClick={() => setActiveTab("seo")}
            className="p-3 rounded-2xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/40 text-left transition-all active:scale-95 cursor-pointer"
          >
            <Search className="w-4 h-4 text-cyan-400 mb-1" />
            <span className="font-bold text-white block">SEO Crawler</span>
            <span className="text-[10px] text-slate-400">Live Website Audits</span>
          </button>

          <button
            onClick={() => setActiveTab("social")}
            className="p-3 rounded-2xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-purple-500/40 text-left transition-all active:scale-95 cursor-pointer"
          >
            <Smartphone className="w-4 h-4 text-purple-400 mb-1" />
            <span className="font-bold text-white block">Social Engine</span>
            <span className="text-[10px] text-slate-400">30-Day Calendars</span>
          </button>

          <button
            onClick={() => setActiveTab("export")}
            className="p-3 rounded-2xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-blue-500/40 text-left transition-all active:scale-95 cursor-pointer"
          >
            <Globe className="w-4 h-4 text-blue-400 mb-1" />
            <span className="font-bold text-white block">Export Hub</span>
            <span className="text-[10px] text-slate-400">Foreign B2B Buyers</span>
          </button>

          <button
            onClick={() => setActiveTab("business")}
            className="p-3 rounded-2xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/40 text-left transition-all active:scale-95 cursor-pointer"
          >
            <Briefcase className="w-4 h-4 text-emerald-400 mb-1" />
            <span className="font-bold text-white block">Business Tools</span>
            <span className="text-[10px] text-slate-400">Margin & Calculators</span>
          </button>
        </div>
      </section>
    </div>
  );
};

import React, { useState, useEffect } from "react";
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
  Briefcase,
  Users,
  Megaphone,
  Sliders,
  DollarSign,
  Layers,
  ChevronDown,
  ChevronUp,
  FileText,
  Share2,
  PhoneCall,
  Activity,
  Compass
} from "lucide-react";
import { 
  ActiveTab, 
  SavedItem, 
  SolutionPack, 
  PracticalProblemSolverResult, 
  BusinessProfile 
} from "../types";
import { normalizeErrorMessage } from "../utils/errorUtils";
import { useLanguage } from "../i18n/LanguageContext";
import { AILanguageSelector } from "./AILanguageSelector";
import { MultiLinkPresenceAnalyzer } from "./MultiLinkPresenceAnalyzer";

interface HomeViewProps {
  setActiveTab: (tab: ActiveTab) => void;
  onSaveItem: (item: Omit<SavedItem, "id" | "createdAt">) => void;
  savedItemIds: string[];
}

// 1. BUSINESS PROBLEM OPTIONS (As specified in brief)
const PROBLEM_OPTIONS = [
  { id: "customers", label: "Get More Customers", query: "My business needs more paying customers. Diagnose my customer bottleneck and create ready outreach, headline fixes, and a 7-day turnaround plan." },
  { id: "leads", label: "Get More Leads", query: "I need more qualified inquiries and leads. Create a lead capture offer, WhatsApp hook, and outreach sequence." },
  { id: "sales", label: "Increase Sales", query: "My sales are low. Diagnose why people don't purchase, rewrite my core offer, and provide objection-handling sales scripts." },
  { id: "website", label: "Improve Website", query: "My website gets visitors but no customers. Analyze my conversion path, rewrite the headline and CTA, and fix trust signals." },
  { id: "seo", label: "Improve SEO", query: "I want free organic Google search traffic. Find high-intent search keywords, on-page fixes, and an organic visibility checklist." },
  { id: "ads", label: "Run Ads", query: "I want to run Google or Meta ads. Recommend the right platform, target audience, budget, ad copy, and landing page structure." },
  { id: "local", label: "Get Local Customers", query: "I run a local shop/service and need more walk-ins and phone calls. Optimize my Google Business Profile and create local referral scripts." },
  { id: "b2b", label: "Get B2B Customers", query: "I sell B2B/wholesale and need corporate or export clients. Write high-converting cold email scripts and a B2B prospecting plan." },
  { id: "social", label: "Improve Social Media", query: "My Instagram and Facebook get likes but zero customer inquiries. Create high-converting content hooks, captions, and a 7-day calendar." },
  { id: "prospects", label: "Find Prospects", query: "I need 100 relevant prospects for my business. Build a target profile, directory discovery channels, and outreach messages." },
  { id: "conversion", label: "Improve Conversion", query: "My conversion rate is low. Audit friction points, rewrite offer positioning, and generate instant WhatsApp follow-up scripts." },
  { id: "plan", label: "Build Marketing Plan", query: "I need a complete marketing plan with zero or low budget. Provide free organic methods, referral systems, and a 30-day roadmap." },
  { id: "expand", label: "Expand Business", query: "I want to expand my business to a new city or audience. Diagnose expansion risks, pricing, and launch campaigns." },
  { id: "export", label: "Export / International Growth", query: "I want international buyers for my products. Build an export value offer, foreign buyer cold outreach, and trade compliance steps." },
  { id: "other", label: "Other Problem", query: "" },
];

const LOCAL_STORAGE_PROFILE_KEY = "biz_growth_os_profile_v2";

export const HomeView: React.FC<HomeViewProps> = ({ 
  setActiveTab, 
  onSaveItem, 
  savedItemIds = [] 
}) => {
  const { t, language, languageInfo } = useLanguage();
  
  // Problem input state
  const [activeToolMode, setActiveToolMode] = useState<"problem" | "presence">("problem");
  const [problemQuery, setProblemQuery] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  // Business Profile Drawer State
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_PROFILE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Save profile to localStorage whenever changed
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(businessProfile));
    } catch {
      // ignore
    }
  }, [businessProfile]);
  
  // Execution & Output state
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [practicalResult, setPracticalResult] = useState<PracticalProblemSolverResult | null>(null);
  const [solutionPack, setSolutionPack] = useState<SolutionPack | null>(null);
  
  // Interactive UI state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [completedDays, setCompletedDays] = useState<Record<number, boolean>>({});
  const [hasSavedToVault, setHasSavedToVault] = useState(false);
  const [activeEngineTab, setActiveEngineTab] = useState<
    "overview" | "materials" | "plan" | "website" | "acquisition" | "sales" | "ads" | "local" | "optimization"
  >("overview");
  const [activeMaterialCategory, setActiveMaterialCategory] = useState<
    "all" | "whatsapp" | "headline" | "sales" | "email" | "faq"
  >("all");

  // Interactive Optimization Experiment Analyzer
  const [optSpend, setOptSpend] = useState("");
  const [optClicks, setOptClicks] = useState("");
  const [optLeads, setOptLeads] = useState("");
  const [optSales, setOptSales] = useState("");
  const [customOptResult, setCustomOptResult] = useState<string | null>(null);

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

  const handleSelectOption = (option: typeof PROBLEM_OPTIONS[0]) => {
    setSelectedOptionId(option.id);
    if (option.query) {
      setProblemQuery(option.query);
    }
  };

  const handleSolveProblem = async (overrideQuery?: string, overrideUrl?: string) => {
    const queryToUse = (overrideQuery ?? problemQuery).trim();
    const urlToUse = (overrideUrl ?? websiteUrl).trim();

    if (!queryToUse) {
      setErrorMessage("Please describe your business problem or choose an option before clicking Solve My Problem.");
      return;
    }

    if (isLoading) return;

    setIsLoading(true);
    setErrorMessage(null);
    setPracticalResult(null);
    setSolutionPack(null);
    setHasSavedToVault(false);
    setCompletedDays({});
    setLoadingStep(1);
    setCustomOptResult(null);

    const stepTimer1 = setTimeout(() => setLoadingStep(2), 1200);
    const stepTimer2 = setTimeout(() => setLoadingStep(3), 2800);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 58000);

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
          businessProfile: Object.keys(businessProfile).length > 0 ? businessProfile : undefined,
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
      const practical: PracticalProblemSolverResult = payload.practicalResult || {
        understood: payload.understood || "Understood your business problem.",
        real_problem: payload.real_problem || payload.diagnosis?.summary || "Bottleneck identified in buyer acquisition.",
        immediate_action: payload.immediate_action || payload.next_action || "Deploy the new headline and send the ready outreach script.",
        ready_materials: {
          main_script: payload.ready_materials?.main_script || "Hi, thank you for reaching out...",
          headline_or_offer: payload.ready_materials?.headline_or_offer || "High-Converting Offer",
          cta: payload.ready_materials?.cta || "Chat on WhatsApp",
          extra_material: payload.ready_materials?.extra_material || "Follow-up message",
        },
        action_plan: payload.action_plan || [
          { day: 1, task: "Deploy new headline & WhatsApp CTA", time_required: "30 mins" },
          { day: 2, task: "Send main outreach script to 15 warm prospects", time_required: "45 mins" },
          { day: 3, task: "Follow up with warm inquiries", time_required: "30 mins" }
        ],
        expected_result: payload.expected_result || "Realistic 3-8 qualified buyer conversations within 7-14 days.",
        next_one_thing: payload.next_one_thing || "Deploy the new offer headline today.",
        website_data: payload.website_data || payload.websiteCrawlData,
      };

      setPracticalResult(practical);

      const pack: SolutionPack = payload.solutionPack || {
        diagnosis: {
          main_problem: practical.real_problem,
          root_causes: practical.root_cause_diagnosis?.secondary_problems || [practical.real_problem],
          severity: "High",
          summary: practical.understood + " " + practical.real_problem,
        },
        ready_materials: {
          headline_options: [practical.ready_materials.headline_or_offer],
          whatsapp_scripts: [practical.ready_materials.main_script, practical.sales_strategy?.whatsapp_sales_script].filter(Boolean) as string[],
          email_or_dm_scripts: [practical.ready_materials.extra_material, practical.sales_strategy?.email_sales_script].filter(Boolean) as string[],
          offer_or_pricing: practical.ready_materials.headline_or_offer,
          cta_examples: [practical.ready_materials.cta],
          faqs: practical.website_analysis?.faq || [],
        },
        seven_day_plan: practical.action_plan.map((d: any) => ({
          day: d.day,
          title: d.task.slice(0, 35),
          tasks: [d.task],
          time_required: d.time_required || "30-45 mins",
        })),
        growth_roadmap: practical.growth_roadmap || {
          day_30: "Consistent inbound inquiries established",
          day_60: "Repeat orders and referral engine running",
          day_90: "Scaling to new geographic regions or product categories",
        },
        expected_outcome: practical.expected_result,
        next_action: practical.next_one_thing,
        website_data: practical.website_data,
      };

      setSolutionPack(pack);

      // AUTO-SAVE FULL SOLUTION PACK TO DASHBOARD / VAULT
      const reportTitle = queryToUse.length > 40 
        ? `${queryToUse.slice(0, 38)}...` 
        : queryToUse;

      onSaveItem({
        type: "assistant",
        title: `Growth OS: ${reportTitle}`,
        summary: `Problem: ${practical.real_problem}. Next Action: ${practical.next_one_thing}`,
        content: payload.content || JSON.stringify({ practicalResult: practical, solutionPack: pack }),
        category: "Business Growth OS",
        tags: ["Problem Solver", "7-Day Plan", "Growth OS", "Ready Materials"],
        context: `Query: ${queryToUse} ${urlToUse ? `| Website: ${urlToUse}` : ""}`,
      });

      setHasSavedToVault(true);

      // Scroll smoothly to output
      setTimeout(() => {
        document.getElementById("growth-os-output")?.scrollIntoView({ behavior: "smooth" });
      }, 150);
    } catch (err: unknown) {
      console.error("Problem solver error:", err);
      let msg = "Failed to solve problem.";
      if (err instanceof Error && err.name === "AbortError") {
        msg = "Request timed out after 58 seconds. Please try with a slightly more concise inquiry.";
      } else {
        msg = normalizeErrorMessage(err, "Problem solver is temporarily unavailable. Please retry.");
      }
      setErrorMessage(msg);
      setPracticalResult(null);
      setSolutionPack(null);
    } finally {
      setIsLoading(false);
      setLoadingStep(1);
    }
  };

  const handleAnalyzeNumbers = () => {
    const spend = Number(optSpend) || 0;
    const clicks = Number(optClicks) || 0;
    const leads = Number(optLeads) || 0;
    const sales = Number(optSales) || 0;

    let analysis = "";
    if (clicks > 0 && leads === 0) {
      analysis = `⚠️ ${clicks} visitors but 0 leads indicates a severe LEAK on your headline, offer, or CTA. People are curious enough to click, but immediately bounce because they don't see an irresistible reason to inquire. Replace your headline with the Recommended Headline and put a direct WhatsApp CTA button!`;
    } else if (leads > 0 && sales === 0) {
      const cpl = spend > 0 ? (spend / leads).toFixed(1) : "0";
      analysis = `⚠️ You got ${leads} leads (CPL: $${cpl}), but 0 sales. The bottleneck is SALES CLOSING & OBJECTIONS, not traffic. Deploy the Word-for-Word Objection Handling Script and follow up within 5 minutes of each inquiry!`;
    } else if (sales > 0) {
      const cpa = spend > 0 ? (spend / sales).toFixed(1) : "0";
      const convRate = leads > 0 ? ((sales / leads) * 100).toFixed(1) : "N/A";
      analysis = `✅ Great traction! You closed ${sales} sales (Lead-to-Sale Conversion: ${convRate}%, CPA: $${cpa}). Recommendation: KEEP the current headline & WhatsApp script. TEST doubling outreach volume or increasing daily ad spend by 20% to scale.`;
    } else {
      analysis = `Start by running the 7-day action plan. Log your daily contacts and inquiries, then return here to analyze what to Keep, Change, Pause, Test, and Improve!`;
    }

    setCustomOptResult(analysis);
  };

  const activePlan = practicalResult?.action_plan || solutionPack?.seven_day_plan?.map(d => ({
    day: d.day,
    task: d.tasks[0] || d.title,
    time_required: d.time_required,
  })) || [];
  const completedCount = Object.values(completedDays).filter(Boolean).length;
  const totalDays = activePlan.length || 7;
  const progressPercent = totalDays > 0 ? Math.round((completedCount / totalDays) * 100) : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* ============================================================== */}
      {/* 1. BUSINESS GROWTH CENTER HEADER                               */}
      {/* ============================================================== */}
      <section className="text-center pt-2 sm:pt-4 space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>AI Business Growth Operating System</span>
        </div>
        
        <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
          What's stopping your business from growing?
        </h1>
        
        <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
          From zero customers to website leaks, ad campaigns, and sales scripts — we diagnose the root cause, inspect your website, and prepare ready-to-use materials you can copy and paste immediately.
        </p>
      </section>

      {/* ============================================================== */}
      {/* 2. THE BUSINESS PROBLEM CENTER & OPTIONS                       */}
      {/* ============================================================== */}
      <section className="p-4 sm:p-6 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-cyan-500/40 shadow-2xl shadow-cyan-950/40 relative space-y-4">
        {/* Embedded AI Response Language Selection (Compact & Professional) */}
        <AILanguageSelector label="Which language should I use for your AI response?" />

        {/* Operating System Tool Mode Switcher */}
        <div className="flex items-center p-1 rounded-2xl bg-slate-950/80 border border-slate-800 shadow-inner">
          <button
            type="button"
            onClick={() => setActiveToolMode("problem")}
            className={`flex-1 py-2 sm:py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeToolMode === "problem"
                ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Business Problem Solver</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveToolMode("presence")}
            id="nav-presence-analyzer-tab"
            className={`flex-1 py-2 sm:py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeToolMode === "presence"
                ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Analyze My Business Presence</span>
            <span className="hidden sm:inline-block text-[9px] uppercase px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/50">
              Multi-Link
            </span>
          </button>
        </div>

        {activeToolMode === "presence" ? (
          <MultiLinkPresenceAnalyzer
            onSaveReport={onSaveItem}
            savedItemIds={savedItemIds}
          />
        ) : (
          <div className="space-y-4">
            {/* Rapid Problem Chips */}
            <div className="space-y-1.5 pt-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Select Your Primary Challenge:
          </span>
          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
            {PROBLEM_OPTIONS.map((opt) => {
              const isSelected = selectedOptionId === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectOption(opt)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected 
                      ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-sm shadow-cyan-500/20" 
                      : "bg-slate-950/80 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700"
                  }`}
                >
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Problem Textarea */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="problem-textarea" className="font-bold text-slate-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              Describe your problem
            </label>
            <span className="text-[11px] text-cyan-400 font-mono">
              In any language • Answers in {languageInfo.nativeName}
            </span>
          </div>

          <textarea
            id="problem-textarea"
            rows={3}
            value={problemQuery}
            onChange={(e) => setProblemQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSolveProblem();
              }
            }}
            placeholder='e.g. "My interior design business is not getting enough customers from Kolkata." or "Website gets 500 visitors but 0 orders. People bounce immediately."'
            className="w-full rounded-2xl bg-slate-950 border border-slate-700/80 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 text-white placeholder-slate-500 p-3.5 text-xs sm:text-sm leading-relaxed resize-none outline-none transition-all"
          />
        </div>

        {/* Website URL Input */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>Website or Store URL (Optional — Live crawler detects conversion leaks):</span>
          </label>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus-within:border-cyan-400 transition-colors">
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://yourbusiness.com"
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
        </div>

        {/* Collapsible Business Profile Drawer */}
        <div className="border border-slate-800/80 rounded-2xl bg-slate-950/60 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowProfileDrawer(!showProfileDrawer)}
            className="w-full p-3 flex items-center justify-between text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <span className="font-semibold flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>Business Profile (Optional — Tailor solution to your exact niche)</span>
              {Object.values(businessProfile).filter(Boolean).length > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 text-[10px] font-mono border border-cyan-800">
                  {Object.values(businessProfile).filter(Boolean).length} fields saved
                </span>
              )}
            </span>
            {showProfileDrawer ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {showProfileDrawer && (
            <div className="p-3.5 pt-1 border-t border-slate-800/80 space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] text-slate-400 font-mono">Business Name</label>
                  <input
                    type="text"
                    value={businessProfile.businessName || ""}
                    onChange={(e) => setBusinessProfile({ ...businessProfile, businessName: e.target.value })}
                    placeholder="e.g. Apex Interior Studio"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white placeholder-slate-600 text-xs outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-mono">Business Type / Industry</label>
                  <input
                    type="text"
                    value={businessProfile.businessType || ""}
                    onChange={(e) => setBusinessProfile({ ...businessProfile, businessType: e.target.value, industry: e.target.value })}
                    placeholder="e.g. Interior Design / Home Renovation"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white placeholder-slate-600 text-xs outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-mono">City / Country</label>
                  <input
                    type="text"
                    value={businessProfile.city || ""}
                    onChange={(e) => setBusinessProfile({ ...businessProfile, city: e.target.value })}
                    placeholder="e.g. Kolkata, India"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white placeholder-slate-600 text-xs outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-mono">Service Area / Target Radius</label>
                  <input
                    type="text"
                    value={businessProfile.serviceArea || ""}
                    onChange={(e) => setBusinessProfile({ ...businessProfile, serviceArea: e.target.value, targetArea: e.target.value })}
                    placeholder="e.g. Greater Kolkata + 25km radius"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white placeholder-slate-600 text-xs outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-mono">Products / Services Offered</label>
                  <input
                    type="text"
                    value={businessProfile.productsServices || ""}
                    onChange={(e) => setBusinessProfile({ ...businessProfile, productsServices: e.target.value, products: e.target.value, services: e.target.value })}
                    placeholder="e.g. 2BHK/3BHK Turnkey Interior, Modular Kitchens"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white placeholder-slate-600 text-xs outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-mono">Price Range / Average Deal</label>
                  <input
                    type="text"
                    value={businessProfile.priceRange || ""}
                    onChange={(e) => setBusinessProfile({ ...businessProfile, priceRange: e.target.value })}
                    placeholder="e.g. ₹3,50,000 - ₹12,00,000 per project"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white placeholder-slate-600 text-xs outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-mono">Target Customer</label>
                  <input
                    type="text"
                    value={businessProfile.targetCustomers || ""}
                    onChange={(e) => setBusinessProfile({ ...businessProfile, targetCustomers: e.target.value, targetCustomer: e.target.value })}
                    placeholder="e.g. New flat owners, busy working couples"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white placeholder-slate-600 text-xs outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-mono">Current Customer Source</label>
                  <input
                    type="text"
                    value={businessProfile.currentCustomerSource || ""}
                    onChange={(e) => setBusinessProfile({ ...businessProfile, currentCustomerSource: e.target.value })}
                    placeholder="e.g. Word of mouth only / None right now"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white placeholder-slate-600 text-xs outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-mono">Monthly Marketing Budget</label>
                  <input
                    type="text"
                    value={businessProfile.marketingBudget || ""}
                    onChange={(e) => setBusinessProfile({ ...businessProfile, marketingBudget: e.target.value, monthlyMarketingBudget: e.target.value })}
                    placeholder="e.g. ₹0 (Free organic only) or ₹10,000/mo"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white placeholder-slate-600 text-xs outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-mono">Main Goal & Time Period</label>
                  <input
                    type="text"
                    value={businessProfile.mainGoal || ""}
                    onChange={(e) => setBusinessProfile({ ...businessProfile, mainGoal: e.target.value, timePeriod: "30 days" })}
                    placeholder="e.g. 5 signed projects in the next 30 days"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white placeholder-slate-600 text-xs outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                <span>Profile auto-saves to your device & cloud vault.</span>
                <button
                  type="button"
                  onClick={() => setShowProfileDrawer(false)}
                  className="text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer"
                >
                  Done with profile
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Stepped Loading Animation */}
        {isLoading && (
          <div className="p-4 rounded-2xl bg-slate-950/90 border border-cyan-500/40 space-y-2.5 animate-in fade-in">
            <div className="flex items-center justify-between text-cyan-300 text-xs font-semibold">
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                Executing AI Business Growth Operating System...
              </span>
              <span className="font-mono text-[11px]">Step {loadingStep} of 3</span>
            </div>
            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>1. Investigating root-cause bottlenecks & buying barriers</span>
              </div>
              <div className={`flex items-center gap-2 ${loadingStep >= 2 ? "text-slate-300" : "text-slate-600"}`}>
                {loadingStep >= 2 ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-700 shrink-0" />}
                <span>2. Crawling live website & formulating exact conversion replacements</span>
              </div>
              <div className={`flex items-center gap-2 ${loadingStep >= 3 ? "text-slate-300" : "text-slate-600"}`}>
                {loadingStep >= 3 ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-700 shrink-0" />}
                <span>3. Generating ready materials, sales scripts, ads strategy & 7-day checklist</span>
              </div>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block">Notice</span>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Primary Action Button */}
        <div>
          <button
            id="btn-solve-my-problem-main"
            onClick={() => handleSolveProblem()}
            disabled={isLoading || !problemQuery.trim()}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-cyan-400 via-teal-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 active:scale-98 text-slate-950 font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/25 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-slate-950" />
                <span>Running Business Growth OS...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-slate-950 fill-slate-950" />
                <span>🚀 Solve My Business Problem</span>
              </>
            )}
          </button>
        </div>
      </div>
    )}
  </section>

      {/* ============================================================== */}
      {/* 3. BUSINESS GROWTH OPERATING SYSTEM OUTPUT                     */}
      {/* ============================================================== */}
      {practicalResult && (
        <section id="growth-os-output" className="space-y-4 animate-in fade-in duration-300">
          {/* Top Priority Banner: Next One Thing Today */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-cyan-950 via-slate-900 to-indigo-950 border-2 border-cyan-500/60 shadow-2xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-cyan-800/40">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-cyan-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                  START HERE • NEXT ONE THING TODAY
                </span>
                <span className="text-xs text-slate-300">The single most important action right now:</span>
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
              {practicalResult.next_one_thing}
            </p>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
              <span className="text-slate-400 text-[11px] italic">
                I prepared everything below. You only need to copy, send, or publish it.
              </span>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(practicalResult.next_one_thing, "next-action-copy")}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-700/60 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedKey === "next-action-copy" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === "next-action-copy" ? "Copied!" : "Copy Action"}</span>
                </button>
                <button
                  onClick={() => {
                    toggleDayComplete(1);
                    setActiveEngineTab("plan");
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/20"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Start Day 1</span>
                </button>
              </div>
            </div>
          </div>

          {/* Engine Navigation Sub-Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            {[
              { id: "overview", label: "🔍 Diagnosis & Root Cause", icon: Target },
              { id: "materials", label: "📦 Ready Materials (Copy-Paste)", icon: Copy },
              { id: "plan", label: "📅 7-Day & 90-Day Plan", icon: Calendar },
              { id: "website", label: "🌐 Website Conversion Audit", icon: Globe },
              { id: "acquisition", label: "👥 Acquisition & 100 Prospects", icon: Users },
              { id: "sales", label: "💼 Sales Scripts & Objections", icon: MessageSquare },
              { id: "ads", label: "📢 Ads Engine (Google/Meta)", icon: Megaphone },
              { id: "local", label: "📍 Local & Organic Engine", icon: Compass },
              { id: "optimization", label: "📈 Tracking & Result Analyzer", icon: Activity },
            ].map((tab) => {
              const isActive = activeEngineTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveEngineTab(tab.id as any)}
                  className={`px-3 py-2 rounded-xl border font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                    isActive 
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/60 shadow-sm"
                      : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                  }`}
                >
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* ============================================================== */}
          {/* SUB-ENGINE 1: OVERVIEW & ROOT-CAUSE DIAGNOSIS                 */}
          {/* ============================================================== */}
          {activeEngineTab === "overview" && (
            <div className="space-y-4">
              {/* Understood Banner */}
              <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 text-xs text-cyan-200 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-cyan-300 block text-sm">Understood Problem:</span>
                  <p className="mt-0.5 leading-relaxed">{practicalResult.understood}</p>
                </div>
              </div>

              {/* Core Root-Cause Box */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <h2 className="text-sm font-bold text-white">Root-Cause Engine Diagnosis</h2>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-950 text-rose-300 text-[10px] font-bold border border-rose-800">
                    Fix This First: {practicalResult.root_cause_diagnosis?.fix_this_first ? "Identified" : "Urgent"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-[10px] font-mono text-amber-400 uppercase font-semibold block">
                      ⚠️ Primary Problem / Bottleneck
                    </span>
                    <p className="text-white font-medium leading-relaxed">
                      {practicalResult.root_cause_diagnosis?.primary_problem || practicalResult.real_problem}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-[10px] font-mono text-emerald-400 uppercase font-semibold block">
                      🎯 Fix This First (#1 Priority)
                    </span>
                    <p className="text-white font-medium leading-relaxed">
                      {practicalResult.root_cause_diagnosis?.fix_this_first || practicalResult.immediate_action}
                    </p>
                  </div>
                </div>

                {/* Secondary Bottlenecks & Evidence */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                    <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold block">
                      Secondary Bottlenecks
                    </span>
                    <ul className="text-slate-300 space-y-1 list-disc list-inside">
                      {practicalResult.root_cause_diagnosis?.secondary_problems?.map((p, i) => (
                        <li key={i}>{p}</li>
                      )) || <li>Delayed response to inquiries</li>}
                    </ul>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                    <span className="text-[10px] font-mono text-purple-400 uppercase font-bold block">
                      Confirmed Facts & Evidence
                    </span>
                    <ul className="text-slate-300 space-y-1 list-disc list-inside">
                      {practicalResult.root_cause_diagnosis?.evidence?.map((e, i) => (
                        <li key={i}>{e}</li>
                      )) || <li>User inquiry symptoms validated</li>}
                    </ul>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                    <span className="text-[10px] font-mono text-blue-400 uppercase font-bold block">
                      Missing Information to Test
                    </span>
                    <ul className="text-slate-300 space-y-1 list-disc list-inside">
                      {practicalResult.root_cause_diagnosis?.missing_information?.map((m, i) => (
                        <li key={i}>{m}</li>
                      )) || <li>Exact inquiry-to-close ratio</li>}
                    </ul>
                  </div>
                </div>

                {/* Crawled Webpage Evidence if Available */}
                {practicalResult.website_data && (
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-cyan-500/30 text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-cyan-300 font-mono">
                      <span>Observed Website: {practicalResult.website_data.url}</span>
                      <span>Health Score: {practicalResult.website_data.score || 0}/100</span>
                    </div>
                    <div className="text-[11px] text-slate-300">
                      <strong className="text-white">Observed Page Title: </strong>
                      <span>{practicalResult.website_data.detectedTitle || "None detected"}</span>
                    </div>
                    {practicalResult.website_data.observableIssues && practicalResult.website_data.observableIssues.length > 0 && (
                      <div className="text-[11px] text-slate-400">
                        <strong className="text-amber-400">Conversion Leaks: </strong>
                        <span>{practicalResult.website_data.observableIssues.join("; ")}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* SUB-ENGINE 2: READY MATERIALS (ONE-CLICK COPY)                 */}
          {/* ============================================================== */}
          {activeEngineTab === "materials" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs px-1">
                <span className="text-slate-400">
                  Ready-to-use exact copy. Tap any card to copy instantly:
                </span>
                <span className="text-[10px] font-mono text-cyan-400">
                  All written in {languageInfo.nativeName}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* 1. Main WhatsApp / DM Script */}
                <div className="p-4 rounded-2xl bg-slate-900 border border-emerald-500/30 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-emerald-400 uppercase font-semibold flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                      💬 Main WhatsApp / DM Script
                    </span>
                    <button
                      onClick={() => handleCopy(practicalResult.ready_materials.main_script, "mat-wa")}
                      className="px-2.5 py-1 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === "mat-wa" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === "mat-wa" ? "Copied" : "Copy Message"}</span>
                    </button>
                  </div>
                  <pre className="text-slate-200 font-sans whitespace-pre-wrap leading-relaxed text-xs bg-slate-950 p-3 rounded-xl border border-slate-800">
                    {practicalResult.ready_materials.main_script}
                  </pre>
                </div>

                {/* 2. New Headline & Offer */}
                <div className="p-4 rounded-2xl bg-slate-900 border border-cyan-500/30 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-cyan-400 uppercase font-semibold flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-cyan-400" />
                      🏷️ High-Converting Headline or Offer
                    </span>
                    <button
                      onClick={() => handleCopy(practicalResult.ready_materials.headline_or_offer, "mat-hl")}
                      className="px-2.5 py-1 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === "mat-hl" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === "mat-hl" ? "Copied" : "Copy Offer"}</span>
                    </button>
                  </div>
                  <pre className="text-slate-200 font-sans whitespace-pre-wrap leading-relaxed text-xs bg-slate-950 p-3 rounded-xl border border-slate-800">
                    {practicalResult.ready_materials.headline_or_offer}
                  </pre>
                </div>

                {/* 3. Call-to-Action (CTA) */}
                <div className="p-4 rounded-2xl bg-slate-900 border border-blue-500/30 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-blue-400 uppercase font-semibold flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-blue-400" />
                      🔘 Action-Driven CTA
                    </span>
                    <button
                      onClick={() => handleCopy(practicalResult.ready_materials.cta, "mat-cta")}
                      className="px-2.5 py-1 rounded-lg bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === "mat-cta" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === "mat-cta" ? "Copied" : "Copy CTA"}</span>
                    </button>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <span className="text-white font-bold text-sm">"{practicalResult.ready_materials.cta}"</span>
                    <span className="text-[10px] text-slate-400 font-mono">Use on buttons & bio</span>
                  </div>
                </div>

                {/* 4. Extra Follow-Up Script / Bio / Email */}
                <div className="p-4 rounded-2xl bg-slate-900 border border-purple-500/30 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-purple-400 uppercase font-semibold flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-purple-400" />
                      ✉️ Extra Follow-up / Email / Bio Script
                    </span>
                    <button
                      onClick={() => handleCopy(practicalResult.ready_materials.extra_material, "mat-extra")}
                      className="px-2.5 py-1 rounded-lg bg-purple-950 hover:bg-purple-900 text-purple-300 border border-purple-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === "mat-extra" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === "mat-extra" ? "Copied" : "Copy Extra"}</span>
                    </button>
                  </div>
                  <pre className="text-slate-200 font-sans whitespace-pre-wrap leading-relaxed text-xs bg-slate-950 p-3 rounded-xl border border-slate-800">
                    {practicalResult.ready_materials.extra_material}
                  </pre>
                </div>
              </div>

              {/* FAQs if available */}
              {practicalResult.website_analysis?.faq && practicalResult.website_analysis.faq.length > 0 && (
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-cyan-400" />
                    <span>Conversion FAQs to paste on your site or quote docs</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    {practicalResult.website_analysis.faq.map((f, i) => (
                      <div key={i} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-white">Q: {f.question}</span>
                          <button
                            onClick={() => handleCopy(`Q: ${f.question}\nA: ${f.answer}`, `faq-${i}`)}
                            className="text-slate-400 hover:text-cyan-300 p-1"
                          >
                            {copiedKey === `faq-${i}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                        <p className="text-slate-300 text-[11px] leading-relaxed">A: {f.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* SUB-ENGINE 3: 7-DAY & 90-DAY EXECUTION PLAN                    */}
          {/* ============================================================== */}
          {activeEngineTab === "plan" && (
            <div className="space-y-4">
              {/* 7-Day Plan Box */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-cyan-400" />
                    <h2 className="text-sm font-bold text-white">Exact 7-Day Action Plan</h2>
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

                <div className="space-y-2 pt-1">
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
                                  {dayItem.task}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                              <Clock className="w-3 h-3 text-slate-500" />
                              {dayItem.time_required || "30m"}
                            </span>
                            <button
                              onClick={() => handleCopy(dayItem.task, `plan-day-${dayItem.day}`)}
                              className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer"
                            >
                              {copiedKey === `plan-day-${dayItem.day}` ? "Copied" : "Copy"}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 30 / 60 / 90 Day Growth Roadmap */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  <h2 className="text-sm font-bold text-white">30 / 60 / 90-Day Growth Roadmap</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase block">
                      Month 1 (30 Days)
                    </span>
                    <p className="text-slate-200 font-medium leading-relaxed">
                      {practicalResult.growth_roadmap?.day_30 || "Consistent inbound inquiries established"}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-[10px] font-mono text-blue-400 font-bold uppercase block">
                      Month 2 (60 Days)
                    </span>
                    <p className="text-slate-200 font-medium leading-relaxed">
                      {practicalResult.growth_roadmap?.day_60 || "Repeat buyer relationships and referral loop active"}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-[10px] font-mono text-purple-400 font-bold uppercase block">
                      Month 3 (90 Days)
                    </span>
                    <p className="text-slate-200 font-medium leading-relaxed">
                      {practicalResult.growth_roadmap?.day_90 || "Scaling sales to new channels or territories"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Realistic Expected Outcome */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-950 to-slate-950 border border-emerald-500/40 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Realistic Expected Result</span>
                </div>
                
                <p className="text-xs sm:text-sm font-medium text-slate-100 leading-relaxed">
                  If you follow this plan: <strong className="text-emerald-300">{practicalResult.expected_result}</strong>
                </p>
                
                <p className="text-[11px] text-slate-400 pt-1">
                  We don't sell get-rich-quick fantasies. This plan directly eliminates conversion friction and opens real buyer conversations.
                </p>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* SUB-ENGINE 4: WEBSITE & CONVERSION AUDIT                       */}
          {/* ============================================================== */}
          {activeEngineTab === "website" && (
            <div className="space-y-4">
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3.5">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Globe className="w-4 h-4 text-cyan-400" />
                    <span>Website & Conversion Leaks Audit</span>
                  </h2>
                  <span className="text-[11px] text-slate-400">Live comparison</span>
                </div>

                {/* What I Found / Why It Matters / What to Change */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold block">WHAT I FOUND</span>
                    <p className="text-slate-300 leading-relaxed">{practicalResult.website_analysis?.what_found}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-[10px] font-mono text-amber-400 uppercase font-bold block">WHY IT MATTERS</span>
                    <p className="text-slate-300 leading-relaxed">{practicalResult.website_analysis?.why_it_matters}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold block">WHAT TO CHANGE</span>
                    <p className="text-slate-300 leading-relaxed">{practicalResult.website_analysis?.what_to_change}</p>
                  </div>
                </div>

                {/* EXACT REPLACEMENT CARDS */}
                <div className="space-y-3 pt-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider block">
                    Exact Copy Replacements (Old vs Recommended)
                  </span>

                  {/* Headline Replacement */}
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-400 uppercase">HEADLINE COMPARISON</span>
                      <button
                        onClick={() => handleCopy(practicalResult.website_analysis?.exact_replacement?.recommended_headline || "", "rec-hl")}
                        className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
                      >
                        {copiedKey === "rec-hl" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>Copy Recommended</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="p-2.5 rounded-lg bg-rose-950/20 border border-rose-900/40">
                        <span className="text-[10px] text-rose-400 font-bold block">CURRENT / WEAK:</span>
                        <p className="text-slate-400 mt-0.5">{practicalResult.website_analysis?.exact_replacement?.current_headline || "Generic tagline without buyer benefit"}</p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/40">
                        <span className="text-[10px] text-emerald-400 font-bold block">RECOMMENDED REPLACEMENT:</span>
                        <p className="text-emerald-200 mt-0.5 font-bold">{practicalResult.website_analysis?.exact_replacement?.recommended_headline}</p>
                      </div>
                    </div>
                  </div>

                  {/* CTA Replacement */}
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-400 uppercase">CALL-TO-ACTION (CTA) COMPARISON</span>
                      <button
                        onClick={() => handleCopy(practicalResult.website_analysis?.exact_replacement?.recommended_cta || "", "rec-cta")}
                        className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
                      >
                        {copiedKey === "rec-cta" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>Copy Recommended</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="p-2.5 rounded-lg bg-rose-950/20 border border-rose-900/40">
                        <span className="text-[10px] text-rose-400 font-bold block">CURRENT / GENERIC:</span>
                        <p className="text-slate-400 mt-0.5">{practicalResult.website_analysis?.exact_replacement?.current_cta || "Contact Us / Submit"}</p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/40">
                        <span className="text-[10px] text-emerald-400 font-bold block">RECOMMENDED REPLACEMENT:</span>
                        <p className="text-emerald-200 mt-0.5 font-bold">{practicalResult.website_analysis?.exact_replacement?.recommended_cta}</p>
                      </div>
                    </div>
                  </div>

                  {/* Ready Copy Blocks */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold">Homepage Hero Copy</span>
                        <button onClick={() => handleCopy(practicalResult.website_analysis?.homepage_copy || "", "hp-copy")} className="text-slate-400 hover:text-cyan-300">
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-slate-300 text-xs leading-relaxed">{practicalResult.website_analysis?.homepage_copy}</p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold">Service Section Copy</span>
                        <button onClick={() => handleCopy(practicalResult.website_analysis?.service_copy || "", "serv-copy")} className="text-slate-400 hover:text-cyan-300">
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-slate-300 text-xs leading-relaxed">{practicalResult.website_analysis?.service_copy}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* SUB-ENGINE 5: CUSTOMER ACQUISITION & 100 PROSPECTS             */}
          {/* ============================================================== */}
          {activeEngineTab === "acquisition" && (
            <div className="space-y-4">
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3.5">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-cyan-400" />
                    <span>Customer Acquisition Channels</span>
                  </h2>
                  <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold">
                    Free / Low-Cost First
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {practicalResult.customer_acquisition?.summary}
                </p>

                {/* Free / Organic Methods */}
                <div className="space-y-2 pt-1">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                    1. Free & Organic Channels (Start Here)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    {practicalResult.customer_acquisition?.free_organic_channels?.map((ch, i) => (
                      <div key={i} className="p-3 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-1">
                        <span className="font-bold text-white block">{ch.channel}</span>
                        <p className="text-slate-300 text-[11px] leading-relaxed">{ch.how_to_execute}</p>
                        <span className="text-[10px] text-cyan-400 font-mono block pt-0.5">Target: {ch.target_reach}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 100 Relevant Prospects Plan */}
                {practicalResult.customer_acquisition?.hundred_prospects_plan && (
                  <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/40 space-y-3 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-cyan-400" />
                        <span>100 Relevant Prospects Plan</span>
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">Target: 100 contacts</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-1">
                      <span className="font-bold text-white">Ideal Prospect Profile: </span>
                      <span>{practicalResult.customer_acquisition.hundred_prospects_plan.target_profile.industry} in {practicalResult.customer_acquisition.hundred_prospects_plan.target_profile.location} needing "{practicalResult.customer_acquisition.hundred_prospects_plan.target_profile.core_need}"</span>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-slate-400 uppercase block">Where to Find Them:</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {practicalResult.customer_acquisition.hundred_prospects_plan.channels.map((c, i) => (
                          <div key={i} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                            <div className="flex items-center justify-between text-white font-bold">
                              <span>{c.channel}</span>
                              <span className="text-cyan-400 font-mono">{c.activity_target} prospects</span>
                            </div>
                            <p className="text-[11px] text-slate-300">{c.action_method}</p>
                            <span className="text-[10px] text-slate-500 block font-mono">Criteria: {c.qualification_criteria}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Ready Outreach Script */}
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold">
                          Ready Prospecting Script (WhatsApp / DM / Email)
                        </span>
                        <button
                          onClick={() => handleCopy(practicalResult.customer_acquisition?.hundred_prospects_plan?.outreach_script || "", "100-script")}
                          className="text-cyan-400 hover:text-cyan-300 text-xs font-semibold flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy Script</span>
                        </button>
                      </div>
                      <pre className="text-slate-200 font-sans whitespace-pre-wrap leading-relaxed text-xs">
                        {practicalResult.customer_acquisition.hundred_prospects_plan.outreach_script}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* SUB-ENGINE 6: SALES STRATEGY & OBJECTIONS                      */}
          {/* ============================================================== */}
          {activeEngineTab === "sales" && (
            <div className="space-y-4">
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3.5">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-cyan-400" />
                    <span>Sales Strategy & Objection Handling</span>
                  </h2>
                  <span className="text-[10px] font-mono text-purple-400 uppercase font-bold">
                    Turn Inquiries into Paid Sales
                  </span>
                </div>

                {/* 30-Second Pitch */}
                {practicalResult.sales_strategy?.sales_pitch && (
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold">
                        30-Second Elevator Pitch
                      </span>
                      <button onClick={() => handleCopy(practicalResult.sales_strategy?.sales_pitch || "", "sp-pitch")} className="text-slate-400 hover:text-cyan-300">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-slate-200 text-xs leading-relaxed italic">
                      "{practicalResult.sales_strategy.sales_pitch}"
                    </p>
                  </div>
                )}

                {/* Word-for-Word Objection Handling */}
                <div className="space-y-2 pt-1">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                    Word-for-Word Objection Handling
                  </span>
                  <div className="space-y-2 text-xs">
                    {practicalResult.sales_strategy?.objection_handling?.map((obj, i) => (
                      <div key={i} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-rose-400 font-bold">Buyer Objection: "{obj.objection}"</span>
                          <button
                            onClick={() => handleCopy(obj.response, `obj-${i}`)}
                            className="text-cyan-400 hover:text-cyan-300 text-xs font-semibold flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" />
                            <span>Copy Response</span>
                          </button>
                        </div>
                        <p className="text-emerald-200 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800/80 leading-relaxed">
                          "{obj.response}"
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Closing Questions */}
                {practicalResult.sales_strategy?.closing_questions && (
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                    <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold block">
                      Direct Closing Questions
                    </span>
                    <ul className="space-y-1 text-slate-200 list-disc list-inside">
                      {practicalResult.sales_strategy.closing_questions.map((q, i) => (
                        <li key={i}>"{q}"</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Follow-up Sequence */}
                {practicalResult.sales_strategy?.follow_up_sequence && (
                  <div className="space-y-2 pt-1">
                    <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block">
                      Follow-up Cadence (Day 0 to Day 5)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      {practicalResult.sales_strategy.follow_up_sequence.map((seq, i) => (
                        <div key={i} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                          <div className="flex items-center justify-between text-cyan-400 font-bold font-mono text-[11px]">
                            <span>{seq.timing} ({seq.channel})</span>
                            <button onClick={() => handleCopy(seq.message_copy, `seq-${i}`)} className="text-slate-400 hover:text-cyan-300">
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                          <span className="text-[10px] text-slate-400 block font-semibold">{seq.subject_or_hook}</span>
                          <p className="text-slate-200 text-[11px] leading-relaxed bg-slate-900 p-2 rounded">{seq.message_copy}</p>
                          <span className="text-[10px] text-emerald-400 block">CTA: {seq.cta}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* SUB-ENGINE 7: ADS ENGINE (GOOGLE & META)                       */}
          {/* ============================================================== */}
          {activeEngineTab === "ads" && (
            <div className="space-y-4">
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3.5">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-cyan-400" />
                    <span>Paid Ads Engine (Google & Meta/Instagram)</span>
                  </h2>
                  <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 text-[10px] font-bold border border-blue-800">
                    {practicalResult.ads_strategy?.recommended_platform || "Google Search / Meta"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold">Recommended Budget</span>
                    <p className="text-white font-bold text-sm">{practicalResult.ads_strategy?.budget_plan?.daily_budget || "$5 - $10 / day"}</p>
                    <span className="text-[10px] text-slate-400 block">Bidding: {practicalResult.ads_strategy?.budget_plan?.bidding_strategy}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold">Target Audience</span>
                    <p className="text-slate-200">{practicalResult.ads_strategy?.target_audience?.demographics}</p>
                    <span className="text-[10px] text-slate-400 block">Area: {practicalResult.ads_strategy?.target_audience?.location}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-[10px] font-mono text-rose-400 uppercase font-bold">Negative Keywords</span>
                    <p className="text-slate-300 text-[11px]">{practicalResult.ads_strategy?.target_audience?.negative_keywords?.join(", ") || "free, cheap, jobs, diy"}</p>
                    <span className="text-[10px] text-slate-500 block">Blocks wasted clicks</span>
                  </div>
                </div>

                {/* Ad Copy */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold">Ready Ad Copy</span>
                    <button
                      onClick={() => handleCopy(`${practicalResult.ads_strategy?.ad_copy?.headlines?.join(" | ")}\n${practicalResult.ads_strategy?.ad_copy?.descriptions?.join("\n")}`, "ads-copy")}
                      className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy All Ad Text</span>
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase block">Headlines (30 chars max):</span>
                      <div className="flex flex-wrap gap-1.5">
                        {practicalResult.ads_strategy?.ad_copy?.headlines?.map((h, i) => (
                          <span key={i} className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-white font-semibold">
                            {h}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] text-slate-400 uppercase block">Descriptions (90 chars max):</span>
                      {practicalResult.ads_strategy?.ad_copy?.descriptions?.map((d, i) => (
                        <p key={i} className="p-2 rounded bg-slate-900 text-slate-200 text-xs">{d}</p>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Creative Direction & Video Script */}
                {practicalResult.ads_strategy?.creative_direction && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                      <span className="text-[10px] font-mono text-purple-400 uppercase font-bold">Image Ad Brief</span>
                      <p className="text-slate-300 leading-relaxed">{practicalResult.ads_strategy.creative_direction.image_brief}</p>
                    </div>
                    {practicalResult.ads_strategy.creative_direction.video_script && (
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                        <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold">15-Second Video Hook</span>
                        <p className="text-white font-bold text-[11px]">Hook: "{practicalResult.ads_strategy.creative_direction.video_script.hook}"</p>
                        <p className="text-slate-300 text-[11px]">Body: {practicalResult.ads_strategy.creative_direction.video_script.body}</p>
                        <p className="text-cyan-400 text-[11px]">CTA: {practicalResult.ads_strategy.creative_direction.video_script.cta}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* SUB-ENGINE 8: ORGANIC & LOCAL ENGINE                           */}
          {/* ============================================================== */}
          {activeEngineTab === "local" && (
            <div className="space-y-4">
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3.5">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Compass className="w-4 h-4 text-cyan-400" />
                    <span>Local & Organic Foot-Traffic Engine</span>
                  </h2>
                  <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold">
                    Zero Ad Spend Required
                  </span>
                </div>

                {/* Google Business Profile Plan */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                  <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold block">
                    Google Business Profile (Maps) Optimization
                  </span>
                  <p className="text-slate-300 leading-relaxed">
                    {practicalResult.organic_local_strategy?.gbp_plan?.description}
                  </p>
                  
                  {/* Photo checklist */}
                  {practicalResult.organic_local_strategy?.gbp_plan?.photo_checklist && (
                    <div className="pt-1">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Photos to upload this week:</span>
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {practicalResult.organic_local_strategy.gbp_plan.photo_checklist.map((p, i) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 text-[11px]">
                            📷 {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Review Request Template */}
                  {practicalResult.organic_local_strategy?.gbp_plan?.review_request_template && (
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-emerald-400 font-bold uppercase">Genuine 5-Star Review Request Message</span>
                        <button
                          onClick={() => handleCopy(practicalResult.organic_local_strategy?.gbp_plan?.review_request_template || "", "rev-req")}
                          className="text-cyan-400 hover:text-cyan-300 text-[11px] font-semibold flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </button>
                      </div>
                      <p className="text-slate-200 text-[11px] italic">"{practicalResult.organic_local_strategy.gbp_plan.review_request_template}"</p>
                    </div>
                  )}
                </div>

                {/* Referral Program */}
                {practicalResult.organic_local_strategy?.referral_system && (
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-purple-400 uppercase font-bold">Customer Referral Engine</span>
                      <button
                        onClick={() => handleCopy(practicalResult.organic_local_strategy?.referral_system?.request_script || "", "ref-req")}
                        className="text-cyan-400 hover:text-cyan-300 text-[11px] font-semibold flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copy Script</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="p-2.5 rounded-lg bg-slate-900">
                        <span className="text-[10px] text-slate-400 font-bold block">REFERRAL INCENTIVE:</span>
                        <p className="text-white mt-0.5">{practicalResult.organic_local_strategy.referral_system.offer}</p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-900">
                        <span className="text-[10px] text-slate-400 font-bold block">ASK SCRIPT:</span>
                        <p className="text-slate-300 mt-0.5 italic">"{practicalResult.organic_local_strategy.referral_system.request_script}"</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* SUB-ENGINE 9: TRACKING & INTERACTIVE RESULT ANALYZER           */}
          {/* ============================================================== */}
          {activeEngineTab === "optimization" && (
            <div className="space-y-4">
              {/* Metrics to Track */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3.5">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <span>Metrics to Track & Benchmarks</span>
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  {practicalResult.tracking_and_metrics?.map((m, i) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                      <span className="font-bold text-white block">{m.metric}</span>
                      <span className="text-emerald-400 font-mono text-[11px] block">Target: {m.target_baseline}</span>
                      <span className="text-slate-400 text-[10px] block">Measure: {m.how_to_measure}</span>
                    </div>
                  ))}
                </div>

                {/* Keep / Change / Pause / Test Matrix */}
                {practicalResult.optimization_guidance && (
                  <div className="space-y-2 pt-2">
                    <span className="text-xs font-bold text-white uppercase tracking-wider block">
                      Optimization Decision Matrix
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-1">
                        <span className="text-[10px] font-mono text-emerald-400 font-bold block">✅ KEEP</span>
                        <p className="text-slate-300 text-[11px]">{practicalResult.optimization_guidance.keep?.[0] || "Direct chat channel"}</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-1">
                        <span className="text-[10px] font-mono text-amber-400 font-bold block">🔄 CHANGE</span>
                        <p className="text-slate-300 text-[11px]">{practicalResult.optimization_guidance.change?.[0] || "Weak headline"}</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-500/30 space-y-1">
                        <span className="text-[10px] font-mono text-rose-400 font-bold block">⏸️ PAUSE</span>
                        <p className="text-slate-300 text-[11px]">{practicalResult.optimization_guidance.pause?.[0] || "Unfocused posting"}</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/30 space-y-1">
                        <span className="text-[10px] font-mono text-purple-400 font-bold block">🧪 TEST</span>
                        <p className="text-slate-300 text-[11px]">{practicalResult.optimization_guidance.test?.[0] || "New offer headline"}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Interactive Result Analyzer (Enter your real numbers) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-cyan-500/40 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-cyan-400" />
                    <span>Interactive Experiment Analyzer</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Test real numbers</span>
                </div>
                <p className="text-xs text-slate-300">
                  Input your actual weekly performance numbers below to get instant diagnostic feedback on where your funnel is leaking:
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-400 font-mono">Ad Spend / Budget ($ or ₹)</label>
                    <input
                      type="number"
                      value={optSpend}
                      onChange={(e) => setOptSpend(e.target.value)}
                      placeholder="e.g. 50"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-mono">Clicks / Store Visitors</label>
                    <input
                      type="number"
                      value={optClicks}
                      onChange={(e) => setOptClicks(e.target.value)}
                      placeholder="e.g. 240"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-mono">Inquiries / Leads</label>
                    <input
                      type="number"
                      value={optLeads}
                      onChange={(e) => setOptLeads(e.target.value)}
                      placeholder="e.g. 8"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-mono">Sales Closed</label>
                    <input
                      type="number"
                      value={optSales}
                      onChange={(e) => setOptSales(e.target.value)}
                      placeholder="e.g. 2"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAnalyzeNumbers}
                  className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-md"
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Analyze My Funnel Numbers</span>
                </button>

                {customOptResult && (
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-cyan-500/40 text-xs text-slate-200 leading-relaxed animate-in fade-in">
                    {customOptResult}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ============================================================== */}
      {/* 4. SPECIALIZED GROWTH HUBS SHORTCUTS                           */}
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

import React, { useState, useEffect, useRef } from "react";
import { 
  BarChart3, 
  TrendingDown, 
  Upload, 
  Sparkles, 
  Search, 
  Youtube, 
  Globe, 
  Smartphone, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  HelpCircle, 
  ArrowRight, 
  Copy, 
  Check, 
  ExternalLink, 
  Layers, 
  Zap, 
  Wrench, 
  ShieldCheck, 
  FileText, 
  Filter,
  Eye,
  Camera,
  Loader2,
  RefreshCw,
  Target,
  Megaphone
} from "lucide-react";
import { SavedItem, TrafficFunnelItem, TrafficSourceItem, DiagnosticCardItem, ScreenshotAnalysisResult, VisualAnnotation } from "../types";
import { useCredits } from "../context/CreditsContext";
import { useLanguage } from "../i18n/LanguageContext";
import { AILanguageSelector } from "./AILanguageSelector";

interface TrafficPerformanceViewProps {
  onSaveItem?: (item: Omit<SavedItem, "id" | "createdAt">) => void;
}

type TabType = "overview" | "screenshot" | "website" | "gsc" | "youtube" | "social" | "app_store" | "acquisition" | "ads";

export const TrafficPerformanceView: React.FC<TrafficPerformanceViewProps> = ({ onSaveItem }) => {
  const { canPerformAIAction, consumeCredit, openSignupModal, openLimitModal } = useCredits();
  const { language, languageInfo, isRtl } = useLanguage();

  // Active section tab
  const [activeSubTab, setActiveSubTab] = useState<TabType>("overview");

  // In-tool Response Language
  const selectedLanguage = languageInfo?.name || language || "English";

  // Simple Language explanation toggle for beginners
  const [showSimpleLanguage, setShowSimpleLanguage] = useState<boolean>(true);

  // Real Integration statuses
  const [integrations, setIntegrations] = useState<Array<{
    service: string;
    name: string;
    connected: boolean;
    message: string;
    setupGuideUrl: string;
    availableMetrics: string[];
  }>>([]);
  const [isLoadingStatus, setIsLoadingStatus] = useState<boolean>(false);

  // Live Inspector Inputs
  const [inspectUrl, setInspectUrl] = useState<string>("");
  const [isInspecting, setIsInspecting] = useState<boolean>(false);
  const [websiteSignals, setWebsiteSignals] = useState<any | null>(null);

  // Live YouTube Inspector
  const [ytUrl, setYtUrl] = useState<string>("");
  const [isInspectingYt, setIsInspectingYt] = useState<boolean>(false);
  const [ytResult, setYtResult] = useState<any | null>(null);

  // Live App Store Inspector
  const [appUrl, setAppUrl] = useState<string>("");
  const [isInspectingApp, setIsInspectingApp] = useState<boolean>(false);
  const [appResult, setAppResult] = useState<any | null>(null);

  // Diagnostic Data (Funnel, Priority Cards, Sources)
  const [funnel, setFunnel] = useState<TrafficFunnelItem[]>([]);
  const [sources, setSources] = useState<TrafficSourceItem[]>([]);
  const [cards, setCards] = useState<DiagnosticCardItem[]>([]);
  const [selectedSourceDetail, setSelectedSourceDetail] = useState<TrafficSourceItem | null>(null);

  // Screenshot Upload & Multimodal Analysis State
  const [screenshotBase64, setScreenshotBase64] = useState<string | null>(null);
  const [screenshotMime, setScreenshotMime] = useState<string>("image/png");
  const [imageCategory, setImageCategory] = useState<string>("analytics");
  const [userScreenshotNotes, setUserScreenshotNotes] = useState<string>("");
  const [isAnalyzingImage, setIsAnalyzingImage] = useState<boolean>(false);
  const [imageAnalysisResult, setImageAnalysisResult] = useState<ScreenshotAnalysisResult | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  // Canvas ref for visual annotation overlay
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Fix Problem Modal / Drawer state
  const [activeFixProblem, setActiveFixProblem] = useState<DiagnosticCardItem | null>(null);
  const [isGeneratingFixPlan, setIsGeneratingFixPlan] = useState<boolean>(false);
  const [generatedFixPlan, setGeneratedFixPlan] = useState<any | null>(null);

  // Customer Acquisition Solver state
  const [acquisitionQuery, setAcquisitionQuery] = useState<string>("Customers kaise milega? Need a plan to reach 100 relevant prospects");
  const [isSolvingAcquisition, setIsSolvingAcquisition] = useState<boolean>(false);
  const [acquisitionResult, setAcquisitionResult] = useState<any | null>(null);

  // Ads Solver state
  const [adsPlatform, setAdsPlatform] = useState<"Google Ads" | "Meta Ads" | "Instagram Ads" | "YouTube Ads">("Google Ads");
  const [adsProduct, setAdsProduct] = useState<string>("");
  const [adsLocation, setAdsLocation] = useState<string>("");
  const [isCreatingAds, setIsCreatingAds] = useState<boolean>(false);
  const [adsResult, setAdsResult] = useState<any | null>(null);

  // Copied state indicator
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Fetch real integration statuses on mount
  useEffect(() => {
    fetchIntegrationStatus();
    runDiagnosis(null, null);
  }, []);

  const fetchIntegrationStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const res = await fetch("/api/analytics/status");
      const json = await res.json();
      if (json.success && Array.isArray(json.integrations)) {
        setIntegrations(json.integrations);
      }
    } catch (err) {
      console.error("Could not fetch analytics integration status:", err);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const runDiagnosis = async (siteSignals: any, ytData: any) => {
    try {
      const res = await fetch("/api/analytics/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteTracking: siteSignals,
          youtubeData: ytData,
        }),
      });
      const json = await res.json();
      if (json.success && json.diagnosis) {
        setFunnel(json.diagnosis.funnel || []);
        setSources(json.diagnosis.sources || []);
        setCards(json.diagnosis.diagnosticCards || []);
      }
    } catch (err) {
      console.error("Failed to run real diagnosis:", err);
    }
  };

  // Website live tag inspection
  const handleInspectWebsite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectUrl.trim()) return;

    setIsInspecting(true);
    setWebsiteSignals(null);

    try {
      const res = await fetch("/api/analytics/website-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: inspectUrl }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setWebsiteSignals(json.data);
        runDiagnosis(json.data, ytResult);
      }
    } catch (err) {
      console.error("Website inspection failed:", err);
    } finally {
      setIsInspecting(false);
    }
  };

  // YouTube live inspection
  const handleInspectYouTube = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ytUrl.trim()) return;

    setIsInspectingYt(true);
    setYtResult(null);

    try {
      const res = await fetch("/api/analytics/youtube-inspect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: ytUrl }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setYtResult(json.data);
        runDiagnosis(websiteSignals, json.data);
      }
    } catch (err) {
      console.error("YouTube inspection failed:", err);
    } finally {
      setIsInspectingYt(false);
    }
  };

  // App Store live inspection
  const handleInspectApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appUrl.trim()) return;

    setIsInspectingApp(true);
    setAppResult(null);

    try {
      const res = await fetch("/api/analytics/app-inspect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: appUrl }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setAppResult(json.data);
      }
    } catch (err) {
      console.error("App Store inspection failed:", err);
    } finally {
      setIsInspectingApp(false);
    }
  };

  // File upload handler for screenshots
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setImageError("Please upload an image file (PNG, JPG, WebP).");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setImageError("Image file size exceeds 8MB. Please choose a smaller image.");
      return;
    }

    setImageError(null);
    setScreenshotMime(file.type);

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setScreenshotBase64(dataUrl);
      setImageAnalysisResult(null);
    };
    reader.readAsDataURL(file);
  };

  // Analyze Screenshot via multimodal AI
  const handleAnalyzeScreenshot = async () => {
    if (!screenshotBase64) return;

    const authCheck = canPerformAIAction();
    if (!authCheck.allowed) {
      if (authCheck.reason === "need_signup") openSignupModal();
      else openLimitModal();
      return;
    }

    setIsAnalyzingImage(true);
    setImageError(null);

    try {
      const res = await fetch("/api/ai/analyze-screenshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: screenshotBase64,
          imageMimeType: screenshotMime,
          imageType: imageCategory,
          language: selectedLanguage,
          userNotes: userScreenshotNotes,
        }),
      });

      const json = await res.json();
      if (json.success && json.analysis) {
        setImageAnalysisResult(json.analysis);
        consumeCredit();
      } else {
        setImageError(json.error || "Failed to analyze screenshot. Please try again.");
      }
    } catch (err: unknown) {
      setImageError(err instanceof Error ? err.message : "Error connecting to AI diagnostic server.");
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  // Draw overlay annotations on canvas when image and analysis are ready
  useEffect(() => {
    if (!imageAnalysisResult || !canvasRef.current || !imgRef.current) return;

    const canvas = canvasRef.current;
    const img = imgRef.current;

    const draw = () => {
      canvas.width = img.clientWidth;
      canvas.height = img.clientHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const annotations = imageAnalysisResult.annotations || [];
      annotations.forEach((ann, idx) => {
        if (!ann.box_2d || ann.box_2d.length !== 4) return;
        const [ymin, xmin, ymax, xmax] = ann.box_2d;

        const x = (xmin / 1000) * canvas.width;
        const y = (ymin / 1000) * canvas.height;
        const width = ((xmax - xmin) / 1000) * canvas.width;
        const height = ((ymax - ymin) / 1000) * canvas.height;

        const isCritical = ann.severity === "critical";
        const strokeColor = isCritical ? "#f43f5e" : ann.severity === "warning" ? "#f97316" : "#06b6d4";

        // Bounding box
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2.5;
        ctx.strokeRect(x, y, width, height);

        // Subtle fill tint
        ctx.fillStyle = isCritical ? "rgba(244, 63, 94, 0.12)" : "rgba(6, 182, 212, 0.12)";
        ctx.fillRect(x, y, width, height);

        // Badge pill with label
        const labelText = `${idx + 1}. ${ann.label}`;
        ctx.font = "bold 11px sans-serif";
        const textWidth = ctx.measureText(labelText).width;

        ctx.fillStyle = strokeColor;
        ctx.fillRect(x, Math.max(0, y - 20), textWidth + 12, 20);

        ctx.fillStyle = "#ffffff";
        ctx.fillText(labelText, x + 6, Math.max(14, y - 5));
      });
    };

    if (img.complete) {
      draw();
    } else {
      img.onload = draw;
    }
  }, [imageAnalysisResult]);

  // Handle [ FIX THIS PROBLEM ] action
  const handleOpenFixProblem = async (card: DiagnosticCardItem) => {
    setActiveFixProblem(card);
    setIsGeneratingFixPlan(true);
    setGeneratedFixPlan(null);

    const authCheck = canPerformAIAction();
    if (!authCheck.allowed) {
      if (authCheck.reason === "need_signup") openSignupModal();
      else openLimitModal();
      setIsGeneratingFixPlan(false);
      return;
    }

    try {
      const res = await fetch("/api/ai/fix-problem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemTitle: card.problem,
          observedData: card.observedData,
          businessContext: websiteSignals?.title || "Commercial Business",
          language: selectedLanguage,
        }),
      });
      const json = await res.json();
      if (json.success && json.fixPlan) {
        setGeneratedFixPlan(json.fixPlan);
        consumeCredit();
      }
    } catch (err) {
      console.error("Failed to generate fix plan:", err);
    } finally {
      setIsGeneratingFixPlan(false);
    }
  };

  // Handle Customer Acquisition Solver
  const handleSolveAcquisition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acquisitionQuery.trim()) return;

    const authCheck = canPerformAIAction();
    if (!authCheck.allowed) {
      if (authCheck.reason === "need_signup") openSignupModal();
      else openLimitModal();
      return;
    }

    setIsSolvingAcquisition(true);
    setAcquisitionResult(null);

    try {
      const res = await fetch("/api/ai/customer-acquisition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: acquisitionQuery,
          businessContext: websiteSignals?.title || "",
          language: selectedLanguage,
        }),
      });
      const json = await res.json();
      if (json.success && json.plan) {
        setAcquisitionResult(json.plan);
        consumeCredit();
      }
    } catch (err) {
      console.error("Acquisition solver failed:", err);
    } finally {
      setIsSolvingAcquisition(false);
    }
  };

  // Handle Ads Plan Creator
  const handleCreateAdsPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adsProduct.trim() || !adsLocation.trim()) return;

    const authCheck = canPerformAIAction();
    if (!authCheck.allowed) {
      if (authCheck.reason === "need_signup") openSignupModal();
      else openLimitModal();
      return;
    }

    setIsCreatingAds(true);
    setAdsResult(null);

    try {
      const res = await fetch("/api/ai/ads-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: adsPlatform,
          productService: adsProduct,
          targetLocation: adsLocation,
          language: selectedLanguage,
        }),
      });
      const json = await res.json();
      if (json.success && json.plan) {
        setAdsResult(json.plan);
        consumeCredit();
      }
    } catch (err) {
      console.error("Ads plan creation failed:", err);
    } finally {
      setIsCreatingAds(false);
    }
  };

  return (
    <div className={`space-y-6 ${isRtl ? "rtl" : "ltr"}`}>
      {/* Top Banner & Title Bar */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                <BarChart3 className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Traffic & Performance Center
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              Real analytics diagnostic system. Inspects live tracking tags, detects bottlenecks, reads analytics screenshots, and creates step-by-step fix action plans.
            </p>
          </div>

          {/* In-tool Response Language Selector ONLY (Strict user requirement) */}
          <div className="shrink-0 flex flex-col items-start sm:items-end gap-1.5">
            <AILanguageSelector compact={true} />
            <button
              onClick={() => setShowSimpleLanguage(!showSimpleLanguage)}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{showSimpleLanguage ? "Simple Explanations: Active" : "Enable Simple Explanations"}</span>
            </button>
          </div>
        </div>

        {/* Beginner-friendly Metric Glossary (Expandable) */}
        {showSimpleLanguage && (
          <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="font-bold text-cyan-300">CTR (Click Rate)</span>
              <p className="text-[10px] text-slate-400 mt-0.5">Kitne logon ne aapka link dekha aur usme se click kiya.</p>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="font-bold text-purple-300">Impressions</span>
              <p className="text-[10px] text-slate-400 mt-0.5">Kitni baar aapka result search ya screen par dikhaya gaya.</p>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="font-bold text-emerald-300">Traffic / Users</span>
              <p className="text-[10px] text-slate-400 mt-0.5">Kitne actual log website, channel ya app par aaye.</p>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="font-bold text-amber-300">Conversion</span>
              <p className="text-[10px] text-slate-400 mt-0.5">Kitne visitors ne call, WhatsApp, ya enquiry submit ki.</p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-800">
        {[
          { id: "overview" as const, label: "Overview & Funnel", icon: Layers },
          { id: "screenshot" as const, label: "📸 Screenshot Solver", icon: Camera },
          { id: "website" as const, label: "Website & GA4", icon: Globe },
          { id: "gsc" as const, label: "Google Search", icon: Search },
          { id: "youtube" as const, label: "YouTube Analytics", icon: Youtube },
          { id: "app_store" as const, label: "Play & App Store", icon: Smartphone },
          { id: "acquisition" as const, label: "Customer Acquisition", icon: Target },
          { id: "ads" as const, label: "Ads Solver", icon: Megaphone },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                isActive
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-900/30"
                  : "bg-slate-900/50 text-slate-400 hover:text-slate-200 border border-transparent"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* TAB 1: OVERVIEW & FUNNEL ("WHERE IS MY TRAFFIC LOW?")    */}
      {/* ======================================================== */}
      {activeSubTab === "overview" && (
        <div className="space-y-6">
          {/* Live Quick Website Inspector */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <h2 className="text-sm font-bold text-white mb-2 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span>Inspect Any Website's Live Tracking Tags</span>
            </h2>
            <form onSubmit={handleInspectWebsite} className="flex gap-2">
              <input
                type="text"
                value={inspectUrl}
                onChange={(e) => setInspectUrl(e.target.value)}
                placeholder="Enter your website URL (e.g. yourbusiness.com)"
                className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                disabled={isInspecting || !inspectUrl.trim()}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
              >
                {isInspecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                <span>Inspect Site</span>
              </button>
            </form>
          </div>

          {/* Section: "WHERE IS MY TRAFFIC LOW?" - Automatic Priority Cards */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-rose-400" />
                  <span>WHERE IS MY TRAFFIC LOW?</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Priority bottlenecks diagnosed strictly from real inspected signals.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {cards.map((card) => {
                const isCritical = card.category === "critical";
                const isAttention = card.category === "attention";
                const isOpportunity = card.category === "opportunity";
                const borderColor = isCritical 
                  ? "border-rose-500/40 bg-rose-950/20" 
                  : isAttention 
                  ? "border-amber-500/40 bg-amber-950/20" 
                  : isOpportunity 
                  ? "border-yellow-500/40 bg-yellow-950/20" 
                  : "border-emerald-500/40 bg-emerald-950/20";

                return (
                  <div key={card.id} className={`p-4 rounded-xl border ${borderColor} flex flex-col justify-between transition-all`}>
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>{card.categoryEmoji}</span>
                          <span>{card.categoryTitle}</span>
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                          {card.dataLabel}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <p className="text-slate-300 font-medium">
                          <span className="text-slate-500">Observed:</span> {card.observedData}
                        </p>
                        <p className="text-slate-200">
                          <span className="text-slate-500">Problem:</span> {card.problem}
                        </p>
                        <p className="text-slate-400 text-[11px]">
                          <span className="text-slate-500">Possible Cause:</span> {card.possibleCause}
                        </p>
                        <p className="text-slate-400 text-[11px]">
                          <span className="text-slate-500">Evidence:</span> {card.evidence}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-slate-500 truncate">
                        Monitor: {card.expectedMetricToMonitor}
                      </span>
                      {card.canFixWithAI && (
                        <button
                          onClick={() => handleOpenFixProblem(card)}
                          className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shrink-0"
                        >
                          <Wrench className="w-3.5 h-3.5" />
                          <span>FIX THIS PROBLEM</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: Visual Traffic Funnel (Real data or "Not connected" - NEVER fake 0) */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <div className="mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>TRAFFIC FUNNEL</span>
              </h2>
              <p className="text-xs text-slate-400">
                Shows verified numbers at each stage. If data is unintegrated, "Not connected" is explicitly shown.
              </p>
            </div>

            <div className="space-y-2.5">
              {funnel.map((stage, idx) => (
                <div key={stage.stageId} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-slate-900 text-slate-400 text-[11px] font-bold flex items-center justify-center border border-slate-800 shrink-0">
                      {idx + 1}
                    </span>
                    <div>
                      <span className="text-xs font-bold text-white block">
                        {stage.name}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {stage.hindiExplanation}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <span className={`text-xs font-mono font-bold px-2 py-1 rounded-lg border ${
                      stage.connected 
                        ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                        : "bg-slate-900 border-slate-800 text-slate-400"
                    }`}>
                      {stage.displayValue}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 px-1 py-0.5 rounded bg-slate-900 border border-slate-800/60">
                      {stage.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section: "WHERE PEOPLE ARE COMING FROM" (Traffic Sources) */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <div className="mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-400" />
                <span>WHERE PEOPLE ARE COMING FROM</span>
              </h2>
              <p className="text-xs text-slate-400">
                Click any channel to inspect meaning, current performance, bottlenecks, and recommended actions.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sources.map((src) => (
                <button
                  key={src.id}
                  onClick={() => setSelectedSourceDetail(src)}
                  className="p-3.5 rounded-xl bg-slate-950/70 hover:bg-slate-800/50 border border-slate-800 text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {src.source}
                    </span>
                    <span className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded border ${
                      src.connected 
                        ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                        : "bg-slate-900 border-slate-800 text-slate-400"
                    }`}>
                      {src.displayShare}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2">
                    {src.problem}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: MULTIMODAL SCREENSHOT PROBLEM SOLVER              */}
      {/* ======================================================== */}
      {activeSubTab === "screenshot" && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <div className="flex items-center gap-2 mb-2">
              <Camera className="w-5 h-5 text-cyan-400" />
              <h2 className="text-base font-bold text-white">
                Upload Screenshot / Image Problem Solver
              </h2>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Upload any Google Analytics, Search Console, YouTube, Instagram insights, website, or ad screenshot. Multimodal AI will visually read numbers, detect problem areas, and overlay visual annotations.
            </p>

            {/* Category Selector */}
            <div className="mb-4">
              <label className="text-xs font-medium text-slate-300 mb-1.5 block">
                Select Screenshot Type:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {[
                  { id: "analytics", label: "Google Analytics" },
                  { id: "search_console", label: "Search Console" },
                  { id: "youtube", label: "YouTube Analytics" },
                  { id: "instagram", label: "Instagram Insights" },
                  { id: "website", label: "Website Screenshot" },
                  { id: "ad", label: "Advertisement Screenshot" },
                  { id: "error", label: "Error Screenshot" },
                  { id: "dashboard", label: "Business Dashboard" },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setImageCategory(cat.id)}
                    className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                      imageCategory === cat.id
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Upload Area */}
            <div className="border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-xl p-6 text-center bg-slate-950/40 relative mb-4">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center justify-center gap-2 pointer-events-none">
                <Upload className="w-8 h-8 text-cyan-400" />
                <span className="text-xs font-semibold text-white">
                  {screenshotBase64 ? "Change Image" : "Drop your screenshot here or click to browse"}
                </span>
                <span className="text-[10px] text-slate-500">
                  PNG, JPG, or WebP up to 8MB. Analyzed strictly with zero fabricated data.
                </span>
              </div>
            </div>

            {/* User Notes Input */}
            <div className="mb-4">
              <label className="text-xs font-medium text-slate-300 mb-1 block">
                Optional note or question:
              </label>
              <input
                type="text"
                value={userScreenshotNotes}
                onChange={(e) => setUserScreenshotNotes(e.target.value)}
                placeholder="e.g. Why did traffic drop last week? Or how do I improve this ad hook?"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {screenshotBase64 && (
              <div className="flex justify-end">
                <button
                  onClick={handleAnalyzeScreenshot}
                  disabled={isAnalyzingImage}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-2 cursor-pointer transition-all shadow-lg shadow-cyan-950/40"
                >
                  {isAnalyzingImage ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Reading Visual Elements & Metrics...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>ANALYZE IMAGE & OVERLAY PROBLEM AREAS</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {imageError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{imageError}</span>
              </div>
            )}
          </div>

          {/* Image Preview & Visual Canvas Overlay */}
          {screenshotBase64 && (
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
              <h3 className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-cyan-400" />
                <span>Visual Inspection Overlay</span>
              </h3>
              <div className="relative inline-block max-w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                <img
                  ref={imgRef}
                  src={screenshotBase64}
                  alt="Uploaded business screenshot"
                  className="max-h-[460px] w-auto object-contain block"
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 pointer-events-none"
                />
              </div>
            </div>
          )}

          {/* Visual Analysis Results (WHAT I SEE, THE PROBLEM, WHY IT MATTERS, HOW TO FIX IT, NEXT STEP) */}
          {imageAnalysisResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Card 1: WHAT I SEE */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider block mb-1">
                    WHAT I SEE
                  </span>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    {imageAnalysisResult.whatISee}
                  </p>
                  {imageAnalysisResult.visibleNumbersAndMetrics?.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase block mb-1 font-bold">
                        Numbers Read From Image:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {imageAnalysisResult.visibleNumbersAndMetrics.map((num, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                            {num}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card 2: THE PROBLEM */}
                <div className="p-4 rounded-xl bg-slate-900 border border-rose-500/30 bg-rose-950/10">
                  <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider block mb-1">
                    THE PROBLEM
                  </span>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    {imageAnalysisResult.theProblem}
                  </p>
                </div>

                {/* Card 3: WHY IT MATTERS */}
                <div className="p-4 rounded-xl bg-slate-900 border border-amber-500/30 bg-amber-950/10">
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                    WHY IT MATTERS
                  </span>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    {imageAnalysisResult.whyItMatters}
                  </p>
                </div>

                {/* Card 4: HOW TO FIX IT */}
                <div className="p-4 rounded-xl bg-slate-900 border border-emerald-500/30 bg-emerald-950/10">
                  <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                    HOW TO FIX IT
                  </span>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    {imageAnalysisResult.howToFixIt}
                  </p>
                </div>
              </div>

              {/* NEXT STEP CALLOUT */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/60 to-blue-950/60 border border-cyan-500/40 flex items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-cyan-400 block tracking-wider">
                    RECOMMENDED IMMEDIATE NEXT STEP
                  </span>
                  <p className="text-xs font-semibold text-white mt-0.5">
                    {imageAnalysisResult.nextStep}
                  </p>
                </div>
                {onSaveItem && (
                  <button
                    onClick={() => {
                      onSaveItem({
                        type: "traffic",
                        title: `Image Diagnosis: ${imageCategory}`,
                        summary: imageAnalysisResult.theProblem,
                        content: imageAnalysisResult as unknown as Record<string, unknown>,
                      });
                    }}
                    className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs shrink-0 cursor-pointer hover:bg-cyan-400 transition-all"
                  >
                    Save to Vault
                  </button>
                )}
              </div>

              {/* Website UX Breakdown (if website screenshot) */}
              {imageAnalysisResult.websiteUxAnalysis && (
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider text-cyan-400">
                    Website UX & Conversion Breakdown
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 font-bold block mb-0.5">Hero & Heading:</span>
                      <span className="text-slate-200">{imageAnalysisResult.websiteUxAnalysis.heroSection}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 font-bold block mb-0.5">CTA & Action Button:</span>
                      <span className="text-slate-200">{imageAnalysisResult.websiteUxAnalysis.cta}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 font-bold block mb-0.5">Trust & Guarantees:</span>
                      <span className="text-slate-200">{imageAnalysisResult.websiteUxAnalysis.trustElements}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 font-bold block mb-0.5">Contact Options:</span>
                      <span className="text-slate-200">{imageAnalysisResult.websiteUxAnalysis.contactOptions}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Ad Teardown & "BETTER VERSION" (if ad screenshot) */}
              {imageAnalysisResult.adAnalysis?.betterVersion && (
                <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/40 space-y-3">
                  <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Megaphone className="w-4 h-4 text-indigo-400" />
                    <span>AD TEARDOWN: GENERATED BETTER VERSION</span>
                  </h4>
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">New Headline:</span>
                      <span className="text-emerald-300 font-bold text-sm">
                        {imageAnalysisResult.adAnalysis.betterVersion.newHeadline}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Primary Text:</span>
                      <p className="text-slate-200 mt-0.5">
                        {imageAnalysisResult.adAnalysis.betterVersion.primaryText}
                      </p>
                    </div>
                    <div className="flex gap-4">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Recommended CTA:</span>
                        <span className="text-cyan-300 font-semibold">{imageAnalysisResult.adAnalysis.betterVersion.cta}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Creative Direction:</span>
                        <span className="text-slate-300">{imageAnalysisResult.adAnalysis.betterVersion.creativeDirection}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 italic">
                    Disclaimer: This alternative ad is based on advertising best practices. Performance depends on creative asset quality and audience targeting.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: WEBSITE & GOOGLE ANALYTICS 4                      */}
      {/* ======================================================== */}
      {activeSubTab === "website" && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan-400" />
              <span>Google Analytics 4 & Website Readiness</span>
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Inspect your website HTML for active GA4 Measurement IDs (G-XXXXXXXXXX), Google Tag Manager (GTM-XXXXXX), and Search Console tags.
            </p>

            <form onSubmit={handleInspectWebsite} className="flex gap-2 mb-4">
              <input
                type="text"
                value={inspectUrl}
                onChange={(e) => setInspectUrl(e.target.value)}
                placeholder="https://yourwebsite.com"
                className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                disabled={isInspecting || !inspectUrl.trim()}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
              >
                {isInspecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                <span>Verify Tags</span>
              </button>
            </form>

            {websiteSignals ? (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="font-bold text-white">Inspected URL:</span>
                  <span className="font-mono text-cyan-300">{websiteSignals.url}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-300">GA4 Measurement Tag:</span>
                    <span className={`font-bold ${websiteSignals.hasGa4Tag ? "text-emerald-400" : "text-rose-400"}`}>
                      {websiteSignals.hasGa4Tag ? websiteSignals.ga4MeasurementIds.join(", ") : "Missing"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-300">Google Tag Manager:</span>
                    <span className={`font-bold ${websiteSignals.hasGtmTag ? "text-emerald-400" : "text-slate-400"}`}>
                      {websiteSignals.hasGtmTag ? websiteSignals.gtmContainerIds.join(", ") : "Not Found"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-300">XML Sitemap:</span>
                    <span className={`font-bold ${websiteSignals.hasSitemap ? "text-emerald-400" : "text-amber-400"}`}>
                      {websiteSignals.hasSitemap ? "Found /sitemap.xml" : "Not Found"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-300">Robots.txt:</span>
                    <span className={`font-bold ${websiteSignals.hasRobotsTxt ? "text-emerald-400" : "text-amber-400"}`}>
                      {websiteSignals.hasRobotsTxt ? "Accessible" : "Not Found"}
                    </span>
                  </div>
                </div>

                <div className="pt-2 text-[11px] text-slate-400">
                  <span>Detected Call to Action buttons: </span>
                  <span className="text-white font-medium">
                    {websiteSignals.detectedCtas?.length > 0 ? websiteSignals.detectedCtas.join(", ") : "No explicit CTA button text detected"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-400">
                Connect Google Analytics to see website traffic, or enter your URL above for instant live tag inspection.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: GOOGLE SEARCH / SEARCH CONSOLE                    */}
      {/* ======================================================== */}
      {activeSubTab === "gsc" && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Search className="w-4 h-4 text-cyan-400" />
              <span>Google Search Performance (Search Console)</span>
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Connect Search Console to see Google search performance, top queries, and high-impression low-CTR opportunities.
            </p>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-xs text-amber-300">
                <Info className="w-4 h-4 shrink-0" />
                <span>Status: Connect Search Console to see live search performance.</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Google Search Console provides verified Impressions, Clicks, CTR, and Average Position directly from Google search logs. Secrets and API keys are stored only server-side.
              </p>
              <div className="pt-2 flex gap-3">
                <a
                  href="https://search.google.com/search-console"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 text-xs font-semibold flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Official Google Search Console</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: YOUTUBE PERFORMANCE                               */}
      {/* ======================================================== */}
      {activeSubTab === "youtube" && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Youtube className="w-4 h-4 text-rose-400" />
              <span>YouTube Video & Channel Performance</span>
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Enter any public YouTube channel or video link. The live inspector uses official Google oEmbed and public metadata to audit performance.
            </p>

            <form onSubmit={handleInspectYouTube} className="flex gap-2 mb-4">
              <input
                type="text"
                value={ytUrl}
                onChange={(e) => setYtUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... or @channel"
                className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                disabled={isInspectingYt || !ytUrl.trim()}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
              >
                {isInspectingYt ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                <span>Inspect YouTube</span>
              </button>
            </form>

            {ytResult ? (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
                <div className="flex items-center gap-3">
                  {ytResult.thumbnailUrl && (
                    <img
                      src={ytResult.thumbnailUrl}
                      alt={ytResult.title}
                      className="w-20 h-14 object-cover rounded-lg border border-slate-800"
                    />
                  )}
                  <div>
                    <span className="font-bold text-white block text-sm">{ytResult.title || "Video"}</span>
                    <span className="text-slate-400 text-[11px]">Channel: {ytResult.authorName}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                  <div className="p-2 rounded-lg bg-slate-900">
                    <span className="text-[10px] text-slate-500 block">Observed Public Views:</span>
                    <span className="font-bold text-emerald-400">{ytResult.views || "Not publicly provided"}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900">
                    <span className="text-[10px] text-slate-500 block">Publish Date:</span>
                    <span className="font-bold text-slate-300">{ytResult.publishDate || "Not publicly provided"}</span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 italic mt-2">
                  {ytResult.limitationNotice}
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-400">
                Connect YouTube to see channel/video performance, or enter any YouTube link above for instant public audit.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 6: GOOGLE PLAY & APPLE APP STORE                     */}
      {/* ======================================================== */}
      {activeSubTab === "app_store" && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-cyan-400" />
              <span>Google Play & Apple App Store Public Audit</span>
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Enter any public store listing URL. Reads real ratings, review counts, downloads tier, and visible ASO signals.
            </p>

            <form onSubmit={handleInspectApp} className="flex gap-2 mb-4">
              <input
                type="text"
                value={appUrl}
                onChange={(e) => setAppUrl(e.target.value)}
                placeholder="https://play.google.com/store/apps/details?id=... or apps.apple.com"
                className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                disabled={isInspectingApp || !appUrl.trim()}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
              >
                {isInspectingApp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                <span>Inspect App</span>
              </button>
            </form>

            {appResult ? (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
                <span className="font-bold text-white block text-sm">
                  {appResult.title || "App Listing"}
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 rounded-lg bg-slate-900">
                    <span className="text-[10px] text-slate-500 block">Rating:</span>
                    <span className="font-bold text-amber-400">{appResult.rating || "N/A"}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900">
                    <span className="text-[10px] text-slate-500 block">Reviews:</span>
                    <span className="font-bold text-slate-300">{appResult.reviewsCount || "N/A"}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900">
                    <span className="text-[10px] text-slate-500 block">Downloads Tier:</span>
                    <span className="font-bold text-emerald-400">{appResult.downloadsTier || "Public tier only"}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-400">
                Enter your Google Play or iOS App Store listing link to verify public store metrics.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 7: CUSTOMER ACQUISITION SOLVER                       */}
      {/* ======================================================== */}
      {activeSubTab === "acquisition" && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Target className="w-4 h-4 text-cyan-400" />
              <span>Customer Acquisition Solver</span>
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Ask: "Client kaise aayega?", "100 customers chahiye", "Sales kaise badhegi?". Creates a realistic channel comparison (Google Search, Local, WhatsApp, Outreach) without fake guarantees.
            </p>

            <form onSubmit={handleSolveAcquisition} className="space-y-3 mb-4">
              <input
                type="text"
                value={acquisitionQuery}
                onChange={(e) => setAcquisitionQuery(e.target.value)}
                placeholder="Ask e.g.: Customers kaise milega? Need 100 clients for my services."
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSolvingAcquisition || !acquisitionQuery.trim()}
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-2 cursor-pointer transition-all"
                >
                  {isSolvingAcquisition ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>Generate Acquisition Strategy</span>
                </button>
              </div>
            </form>

            {acquisitionResult && (
              <div className="space-y-4 pt-3 border-t border-slate-800">
                <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs text-cyan-200">
                  <span className="font-bold">Interpretation: </span>
                  <span>{acquisitionResult.interpretationNotice}</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300 border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase">
                        <th className="py-2 pr-3">Channel</th>
                        <th className="py-2 pr-3">Why Use It</th>
                        <th className="py-2 pr-3">Cost Category</th>
                        <th className="py-2 pr-3">What To Do</th>
                        <th className="py-2">What To Measure</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {acquisitionResult.channels?.map((ch: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-950/40">
                          <td className="py-2.5 pr-3 font-bold text-white">{ch.channel}</td>
                          <td className="py-2.5 pr-3 text-slate-300">{ch.whyUseIt}</td>
                          <td className="py-2.5 pr-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-950 border border-slate-800 text-cyan-400">
                              {ch.costCategory}
                            </span>
                          </td>
                          <td className="py-2.5 pr-3 text-slate-300">{ch.whatToDo}</td>
                          <td className="py-2.5 font-mono text-emerald-400 text-[11px]">{ch.whatToMeasure}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {acquisitionResult.readyOutreachScript && (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-white">Ready-to-use Outreach Message:</span>
                      <button
                        onClick={() => handleCopy(acquisitionResult.readyOutreachScript, "outreach")}
                        className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                      >
                        {copiedKey === "outreach" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === "outreach" ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                    <pre className="text-xs text-slate-300 font-sans whitespace-pre-wrap bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                      {acquisitionResult.readyOutreachScript}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 8: ADS SOLVER                                        */}
      {/* ======================================================== */}
      {activeSubTab === "ads" && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-cyan-400" />
              <span>Ads Solver & Campaign Planner</span>
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Generate structured ad headlines, copy, creative direction, landing page requirements, and test plans for Google, Meta, Instagram, or YouTube Ads. Requires manual user review before launching.
            </p>

            <form onSubmit={handleCreateAdsPlan} className="space-y-3 mb-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300 mb-1 block">Platform:</label>
                  <select
                    value={adsPlatform}
                    onChange={(e: any) => setAdsPlatform(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Google Ads">Google Ads (Search)</option>
                    <option value="Meta Ads">Meta Ads (Facebook Feed)</option>
                    <option value="Instagram Ads">Instagram Ads (Reels / Feed)</option>
                    <option value="YouTube Ads">YouTube Ads</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-300 mb-1 block">Product / Service:</label>
                  <input
                    type="text"
                    value={adsProduct}
                    onChange={(e) => setAdsProduct(e.target.value)}
                    placeholder="e.g. Export Consulting or B2B Steel"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-300 mb-1 block">Target Location:</label>
                  <input
                    type="text"
                    value={adsLocation}
                    onChange={(e) => setAdsLocation(e.target.value)}
                    placeholder="e.g. Mumbai, India or Dubai"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isCreatingAds || !adsProduct.trim() || !adsLocation.trim()}
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-2 cursor-pointer transition-all"
                >
                  {isCreatingAds ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>Generate Ads Plan</span>
                </button>
              </div>
            </form>

            {adsResult && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
                <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-200">
                  <span className="font-bold">Safeguard Notice: </span>
                  <span>{adsResult.approvalSafeguardNotice}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Headline:</span>
                    <span className="text-white font-bold text-sm">{adsResult.adHeadline}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">CTA Button:</span>
                    <span className="text-cyan-300 font-bold">{adsResult.cta}</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Ad Primary Copy:</span>
                    <button
                      onClick={() => handleCopy(adsResult.adCopy, "adcopy")}
                      className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                    >
                      {copiedKey === "adcopy" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === "adcopy" ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <p className="text-slate-200 leading-relaxed">{adsResult.adCopy}</p>
                </div>

                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Creative Idea:</span>
                  <p className="text-slate-300">{adsResult.creativeIdea}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: [ FIX THIS PROBLEM ] ACTION PLAN GENERATOR        */}
      {/* ======================================================== */}
      {activeFixProblem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                  ACTION PLAN TO FIX PROBLEM
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">
                  {activeFixProblem.categoryEmoji} {activeFixProblem.problem}
                </h3>
              </div>
              <button
                onClick={() => setActiveFixProblem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {isGeneratingFixPlan ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                <span className="text-xs">Generating 7-step solution, tools, and ready-to-use materials...</span>
              </div>
            ) : generatedFixPlan ? (
              <div className="space-y-4 text-xs">
                {/* Steps List */}
                <div className="space-y-3">
                  {generatedFixPlan.steps?.map((step: any, sIdx: number) => (
                    <div key={sIdx} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-sm flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 text-xs flex items-center justify-center">
                            {step.stepNumber || sIdx + 1}
                          </span>
                          <span>{step.title}</span>
                        </span>
                        <span className="text-[10px] text-slate-400">{step.timeDifficulty}</span>
                      </div>
                      <p className="text-slate-300 leading-relaxed">{step.exactAction}</p>
                      <p className="text-slate-400 text-[11px]">{step.howToDoIt}</p>
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px]">
                        <span className="px-2 py-0.5 rounded bg-slate-900 text-cyan-300 border border-slate-800">
                          Free: {step.freeOption}
                        </span>
                        <span className="text-slate-500">Monitor: {step.metricToMonitor}</span>
                        {step.relevantOfficialSource && (
                          <a
                            href={step.relevantOfficialSource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-400 hover:underline flex items-center gap-0.5 ml-auto"
                          >
                            <span>{step.relevantOfficialSource.name}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Ready-to-copy material */}
                {generatedFixPlan.readyMaterial && (
                  <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-cyan-300">
                        Ready-to-use Material: {generatedFixPlan.readyMaterial.title}
                      </span>
                      <button
                        onClick={() => handleCopy(generatedFixPlan.readyMaterial.content, "readymat")}
                        className="px-2.5 py-1 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === "readymat" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === "readymat" ? "Copied" : "Copy Content"}</span>
                      </button>
                    </div>
                    <pre className="text-xs text-slate-200 font-sans whitespace-pre-wrap bg-slate-900 p-3 rounded-lg border border-slate-800">
                      {generatedFixPlan.readyMaterial.content}
                    </pre>
                    <span className="text-[10px] text-slate-500 block">
                      Where to use: {generatedFixPlan.readyMaterial.whereToPaste}
                    </span>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DRAWER: TRAFFIC SOURCE DRILL-DOWN                        */}
      {/* ======================================================== */}
      {selectedSourceDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <span>{selectedSourceDetail.source}</span>
              </h3>
              <button
                onClick={() => setSelectedSourceDetail(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">What It Means:</span>
                <span className="text-slate-200">{selectedSourceDetail.whatItMeans}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Current Performance:</span>
                <span className="text-cyan-300 font-medium">{selectedSourceDetail.currentPerformance}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Problem & Cause:</span>
                <span className="text-rose-300">{selectedSourceDetail.problem}</span>
                <p className="text-slate-400 text-[11px] mt-1">{selectedSourceDetail.possibleReason}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Recommended Action:</span>
                <span className="text-emerald-300">{selectedSourceDetail.recommendedAction}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

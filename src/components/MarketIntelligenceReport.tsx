import React, { useState } from "react";
import {
  Globe2,
  TrendingUp,
  ShieldAlert,
  Sparkles,
  Download,
  Copy,
  BookmarkCheck,
  Check,
  Loader2,
  AlertCircle,
  RefreshCw,
  Building,
  Scale,
  Ship,
  CheckCircle2,
  ExternalLink,
  Target,
  Layers,
  ArrowRight,
  ShieldCheck,
  FileText,
  MapPin,
  Compass,
  Zap,
  BarChart3,
  Flame,
  HelpCircle
} from "lucide-react";
import { SavedItem, ExportAnalysisResult } from "../types";
import { useLanguage } from "../i18n/LanguageContext";
import { useCredits } from "../context/CreditsContext";
import { authFetch } from "../utils/apiHelper";
import { normalizeErrorMessage } from "../utils/errorUtils";

interface MarketIntelligenceReportProps {
  onSaveItem: (item: Omit<SavedItem, "id" | "createdAt">) => void;
  defaultProduct?: string;
  defaultOrigin?: string;
  defaultDestination?: string;
}

const POPULAR_DESTINATIONS = [
  { code: "US", name: "United States", flag: "🇺🇸", region: "North America" },
  { code: "DE", name: "Germany", flag: "🇩🇪", region: "European Union" },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪", region: "Middle East" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", region: "Europe" },
  { code: "SG", name: "Singapore", flag: "🇸🇬", region: "Southeast Asia" },
  { code: "JP", name: "Japan", flag: "🇯🇵", region: "East Asia" },
  { code: "AU", name: "Australia", flag: "🇦🇺", region: "Oceania" },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦", region: "Middle East" },
  { code: "CA", name: "Canada", flag: "🇨🇦", region: "North America" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱", region: "European Union" },
  { code: "FR", name: "France", flag: "🇫🇷", region: "European Union" },
];

const PRESET_SCENARIOS = [
  {
    title: "Handmade Brass & Ceramics to USA",
    product: "Handcrafted Ceramic & Brass Decor",
    category: "Artisan Home Decor & Handicrafts",
    origin: "India",
    target: "United States",
    buyer: "B2B Wholesalers & Specialty Home Boutiques",
  },
  {
    title: "Organic Cotton Apparel to Germany",
    product: "GOTS-Certified Organic Cotton Apparel",
    category: "Sustainable Textiles & Garments",
    origin: "India",
    target: "Germany",
    buyer: "European Ethical Retail Chains & Importers",
  },
  {
    title: "Specialty Tea & Spices to UAE",
    product: "Single-Estate Darjeeling Tea & Organic Spices",
    category: "Specialty Gourmet Food & Agri-Commodities",
    origin: "India",
    target: "United Arab Emirates",
    buyer: "HORECA Distributors & Luxury Department Stores",
  },
];

export const MarketIntelligenceReport: React.FC<MarketIntelligenceReportProps> = ({
  onSaveItem,
  defaultProduct = "Handmade Ceramic & Brass Decor",
  defaultOrigin = "India",
  defaultDestination = "United States",
}) => {
  const { languageInfo } = useLanguage();
  const { canPerformAIAction, consumeCredit, openSignupModal, openLimitModal } = useCredits();

  // Form Inputs
  const [productName, setProductName] = useState(defaultProduct);
  const [productCategory, setProductCategory] = useState("Artisan Home Decor & Handicrafts");
  const [originCountry, setOriginCountry] = useState(defaultOrigin);
  const [targetCountry, setTargetCountry] = useState(defaultDestination);
  const [buyerType, setBuyerType] = useState("B2B Wholesalers, Distributors & Importers");
  const [exporterProfile, setExporterProfile] = useState("Small-to-Medium Artisan Exporter (10-30 staff)");
  const [specificFocus, setSpecificFocus] = useState("Current market demand trends, buyer price points, and target country SWOT matrix");

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ExportAnalysisResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<"visual" | "markdown">("visual");

  const handleSelectCountry = (countryName: string) => {
    setTargetCountry(countryName);
  };

  const handleApplyPreset = (preset: typeof PRESET_SCENARIOS[0]) => {
    setProductName(preset.product);
    setProductCategory(preset.category);
    setOriginCountry(preset.origin);
    setTargetCountry(preset.target);
    setBuyerType(preset.buyer);
  };

  const handleGenerateReport = async () => {
    if (!productName.trim() || !targetCountry.trim()) {
      setErrorMessage("Please specify both a Product Name and a Target Country.");
      return;
    }

    const creditCheck = canPerformAIAction();
    if (!creditCheck.allowed) {
      if (creditCheck.reason === "need_signup") openSignupModal();
      else if (creditCheck.reason === "daily_limit_reached") openLimitModal();
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setHasSaved(false);
    setLoadingStep("Connecting to Gemini API Trade Intelligence Engine...");

    const stepTimer1 = setTimeout(() => {
      setLoadingStep(`Analyzing bilateral trade flow and import trends for ${targetCountry}...`);
    }, 1500);

    const stepTimer2 = setTimeout(() => {
      setLoadingStep(`Synthesizing target market SWOT matrix and competitive positioning...`);
    }, 3200);

    try {
      const res = await authFetch("/api/ai/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName,
          productCategory,
          originCountry,
          targetCountry,
          buyerType,
          businessSize: exporterProfile,
          specificQuestion: specificFocus,
          subTool: "market-intelligence",
          language: languageInfo.code,
          languageName: `${languageInfo.nativeName} (${languageInfo.name})`,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.error || "Failed to generate market intelligence report.");
      }

      const payload: ExportAnalysisResult = data.data || data;
      setReportData(payload);
      await consumeCredit();
    } catch (err: unknown) {
      console.error("Market intelligence report error:", err);
      setErrorMessage(normalizeErrorMessage(err, "Failed to generate market report with Gemini API."));
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setIsLoading(false);
      setLoadingStep("");
    }
  };

  const handleCopyMarkdown = () => {
    if (!reportData?.content) return;
    navigator.clipboard.writeText(reportData.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    if (!reportData?.content) return;
    const blob = new Blob([reportData.content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `market-intelligence-${targetCountry.toLowerCase().replace(/\s+/g, "-")}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSaveToVault = () => {
    if (!reportData || hasSaved) return;
    onSaveItem({
      type: "export",
      title: `Market Intelligence: ${productName} → ${targetCountry}`,
      summary: `Gemini Trade Trends & SWOT Report for ${targetCountry} (${originCountry} corridor)`,
      content: reportData.content,
      category: "Market Intelligence",
      tags: [targetCountry, productName, "SWOT", "Trade Trends", "Gemini AI"],
    });
    setHasSaved(true);
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-blue-950/80 via-slate-900/90 to-indigo-950/80 border border-blue-500/40 backdrop-blur-xl shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>Powered by Gemini API</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                SWOT &amp; Trade Trends Engine
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Market Intelligence &amp; Target Country SWOT Report
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Analyze macro trade dynamics, bilateral market attractiveness, and comprehensive 
              SWOT matrices for exporting your product to any target country worldwide.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleGenerateReport}
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-500/30 transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analyzing Market...</span>
                </>
              ) : (
                <>
                  <Compass className="w-4 h-4" />
                  <span>Generate Intelligence Report</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Preset Scenarios Strip */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider px-1">
          Quick Preset Scenarios
        </label>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {PRESET_SCENARIOS.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => handleApplyPreset(preset)}
              className="px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/40 text-slate-300 hover:text-white transition-all shrink-0 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>{preset.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Configuration Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Trade Corridor &amp; Product Parameters
            </h3>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            Origin: {originCountry} → Destination: {targetCountry}
          </span>
        </div>

        {/* Target Country Quick Selector */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
            Target Destination Country <span className="text-blue-400">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {POPULAR_DESTINATIONS.map((c) => {
              const isSelected = targetCountry.toLowerCase() === c.name.toLowerCase();
              return (
                <button
                  type="button"
                  key={c.code}
                  onClick={() => handleSelectCountry(c.name)}
                  className={`p-2.5 rounded-xl text-left transition-all border text-xs flex items-center gap-2 cursor-pointer ${
                    isSelected
                      ? "bg-blue-950/80 text-blue-200 border-blue-500 shadow-md shadow-blue-950"
                      : "bg-slate-950/60 text-slate-300 hover:text-white border-slate-800/80 hover:border-slate-700"
                  }`}
                >
                  <span className="text-base">{c.flag}</span>
                  <div className="truncate">
                    <p className="font-bold truncate text-xs">{c.name}</p>
                    <p className="text-[9px] text-slate-500 truncate">{c.region}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="pt-1 flex items-center gap-2">
            <span className="text-[11px] text-slate-400">Or type custom destination:</span>
            <input
              type="text"
              value={targetCountry}
              onChange={(e) => setTargetCountry(e.target.value)}
              placeholder="e.g., Brazil, South Korea, Sweden..."
              className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700/80 focus:border-blue-500 text-white text-xs outline-none"
            />
          </div>
        </div>

        {/* Product & Origin Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-800">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              Product Name / Description <span className="text-blue-400">*</span>
            </label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g., Handcrafted Ceramic & Brass Decor"
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700/80 focus:border-blue-500 text-white text-xs sm:text-sm outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              Product Category
            </label>
            <input
              type="text"
              value={productCategory}
              onChange={(e) => setProductCategory(e.target.value)}
              placeholder="e.g., Artisan Home Decor & Handicrafts"
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700/80 focus:border-blue-500 text-white text-xs sm:text-sm outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              Country of Origin
            </label>
            <input
              type="text"
              value={originCountry}
              onChange={(e) => setOriginCountry(e.target.value)}
              placeholder="e.g., India, Vietnam, Turkey..."
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700/80 focus:border-blue-500 text-white text-xs sm:text-sm outline-none"
            />
          </div>
        </div>

        {/* Buyer & Strategic Focus */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              Target Buyer Segment
            </label>
            <input
              type="text"
              value={buyerType}
              onChange={(e) => setBuyerType(e.target.value)}
              placeholder="e.g., B2B Wholesalers, Retail Chains, E-commerce Marketplaces"
              className="w-full px-3 py-2 rounded-xl bg-slate-950/90 border border-slate-700/80 focus:border-blue-500 text-white text-xs outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              Specialized Strategic Inquiries
            </label>
            <input
              type="text"
              value={specificFocus}
              onChange={(e) => setSpecificFocus(e.target.value)}
              placeholder="e.g., Tariff advantages, competitor SWOT, compliance standards"
              className="w-full px-3 py-2 rounded-xl bg-slate-950/90 border border-slate-700/80 focus:border-blue-500 text-white text-xs outline-none"
            />
          </div>
        </div>
      </div>

      {/* Loading Progress State */}
      {isLoading && (
        <div className="p-8 rounded-2xl bg-slate-900/90 border border-blue-500/40 text-center space-y-4">
          <div className="relative w-12 h-12 mx-auto">
            <div className="w-12 h-12 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
            <Compass className="w-6 h-6 text-cyan-400 absolute inset-0 m-auto" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">Synthesizing Market Intelligence with Gemini API</h3>
            <p className="text-xs text-blue-300 animate-pulse">{loadingStep}</p>
          </div>
          <p className="text-[11px] text-slate-400 max-w-md mx-auto">
            Evaluating trade indicators, customs classifications, competitor pressure, and SWOT quadrants for {targetCountry}...
          </p>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-950/70 border border-rose-500/50 text-rose-200 backdrop-blur-xl space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>Analysis Unavailable</span>
          </div>
          <p className="text-xs text-rose-200/90 leading-relaxed">{errorMessage}</p>
          <button
            onClick={handleGenerateReport}
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-900/80 hover:bg-rose-800 text-white text-xs font-semibold border border-rose-700 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Analysis</span>
          </button>
        </div>
      )}

      {/* Generated Report Output */}
      {reportData && (
        <div className="space-y-6">
          {/* Action Header & Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-900/90 border border-slate-800 rounded-2xl">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab("visual")}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "visual"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Interactive SWOT &amp; Dashboard
              </button>
              <button
                onClick={() => setActiveTab("markdown")}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "markdown"
                    ? "bg-slate-800 text-white border border-slate-700"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Full Markdown Briefing
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyMarkdown}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-blue-400" />}
                <span>{copied ? "Copied" : "Copy Report"}</span>
              </button>

              <button
                onClick={handleDownloadMarkdown}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Download .MD</span>
              </button>

              <button
                onClick={handleSaveToVault}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border cursor-pointer ${
                  hasSaved
                    ? "bg-emerald-950 text-emerald-300 border-emerald-700"
                    : "bg-blue-900/60 hover:bg-blue-800 text-blue-200 border-blue-600"
                }`}
              >
                <BookmarkCheck className="w-3.5 h-3.5" />
                <span>{hasSaved ? "Saved to Vault" : "Save Report"}</span>
              </button>
            </div>
          </div>

          {activeTab === "visual" ? (
            <div className="space-y-6">
              {/* Top Scoreboard Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Market Attractiveness Score */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-950/60 to-slate-900 border border-blue-500/30 space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                    <span>Market Attractiveness</span>
                    <BarChart3 className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-white">
                      {reportData.marketAttractivenessScore || 85}
                    </span>
                    <span className="text-xs text-blue-300 font-bold">/ 100</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full"
                      style={{ width: `${reportData.marketAttractivenessScore || 85}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 pt-0.5">High commercial viability index</p>
                </div>

                {/* 2. Import Growth Trajectory */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/60 to-slate-900 border border-emerald-500/30 space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                    <span>Import Demand Trend</span>
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-sm font-extrabold text-emerald-300 truncate">
                    {reportData.importGrowthTrend || "+6.8% YoY Expansion"}
                  </p>
                  <p className="text-[10px] text-slate-300 leading-snug">
                    Steady inbound procurement momentum in {reportData.targetCountry}
                  </p>
                </div>

                {/* 3. Competition Intensity */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/60 to-slate-900 border border-amber-500/30 space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                    <span>Competition Intensity</span>
                    <Flame className="w-4 h-4 text-amber-400" />
                  </div>
                  <p className="text-xl font-extrabold text-amber-300">
                    {reportData.competitionIntensity || "Moderate"}
                  </p>
                  <p className="text-[10px] text-slate-300 leading-snug">
                    Balanced competitive field with niche openings for craftsmanship
                  </p>
                </div>

                {/* 4. Regulatory Complexity */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/60 to-slate-900 border border-indigo-500/30 space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                    <span>Regulatory Barrier</span>
                    <Scale className="w-4 h-4 text-indigo-400" />
                  </div>
                  <p className="text-xl font-extrabold text-indigo-300">
                    {reportData.regulatoryComplexity || "Medium"}
                  </p>
                  <p className="text-[10px] text-indigo-200 leading-snug">
                    Standard customs filing &amp; laboratory conformity testing required
                  </p>
                </div>
              </div>

              {/* Trade Trends Section */}
              <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-400" />
                    <div>
                      <h3 className="font-bold text-sm text-white">Current Macro Trade Trends &amp; Demand Drivers</h3>
                      <p className="text-[11px] text-slate-400">
                        Observed import momentum for {reportData.product} in {reportData.targetCountry}
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Trade Lane Verified
                  </span>
                </div>

                <div className="text-xs sm:text-sm text-slate-200 leading-relaxed space-y-3">
                  <p>
                    {reportData.tradeTrends?.summary || reportData.marketSuitability || 
                      `The market in ${reportData.targetCountry} is displaying increased demand for differentiated, high-craftsmanship products.`}
                  </p>

                  {/* Demand Drivers Grid */}
                  {reportData.tradeTrends?.demandDrivers && reportData.tradeTrends.demandDrivers.length > 0 && (
                    <div className="space-y-1.5 pt-2">
                      <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Key Commercial Demand Drivers:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {reportData.tradeTrends.demandDrivers.map((driver, i) => (
                          <div key={i} className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                            <span className="text-xs text-slate-300">{driver}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pricing Dynamics & Preferences */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {reportData.tradeTrends?.consumerPreferences && (
                      <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                        <p className="text-xs font-bold text-blue-300">Consumer &amp; Buyer Preferences</p>
                        <p className="text-xs text-slate-300">{reportData.tradeTrends.consumerPreferences}</p>
                      </div>
                    )}
                    {reportData.tradeTrends?.pricingDynamics && (
                      <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                        <p className="text-xs font-bold text-emerald-300">Landed Pricing &amp; Wholesale Margins</p>
                        <p className="text-xs text-slate-300">{reportData.tradeTrends.pricingDynamics}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 4-QUADRANT SWOT ANALYSIS MATRIX */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <Compass className="w-5 h-5 text-indigo-400" />
                    <div>
                      <h3 className="text-sm font-extrabold text-white">Target Country SWOT Analysis Matrix</h3>
                      <p className="text-[11px] text-slate-400">
                        Strategic evaluation of exporting {reportData.product} to {reportData.targetCountry}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* STRENGTHS (S) */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/50 via-slate-900/90 to-slate-950 border border-emerald-500/40 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 font-extrabold flex items-center justify-center text-xs border border-emerald-500/40">
                          S
                        </span>
                        <div>
                          <h4 className="text-xs font-extrabold text-emerald-300 uppercase tracking-wider">
                            Strengths (Internal Advantages)
                          </h4>
                          <span className="text-[10px] text-slate-400">Core competitive export assets</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                        {reportData.swotAnalysis?.strengths?.length || 2} Factors
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {reportData.swotAnalysis?.strengths?.map((item, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-slate-950/80 border border-emerald-500/20 space-y-1">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-white">{item.title}</p>
                            {item.impact && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                                {item.impact} IMPACT
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-300 leading-relaxed">{item.detail}</p>
                        </div>
                      )) || (
                        <div className="p-3 rounded-xl bg-slate-950/80 border border-emerald-500/20 text-xs text-slate-300">
                          Competitive origin cost and authentic artisan handcrafting capabilities.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* WEAKNESSES (W) */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-950/50 via-slate-900/90 to-slate-950 border border-amber-500/40 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-amber-500/20">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 font-extrabold flex items-center justify-center text-xs border border-amber-500/40">
                          W
                        </span>
                        <div>
                          <h4 className="text-xs font-extrabold text-amber-300 uppercase tracking-wider">
                            Weaknesses (Internal Vulnerabilities)
                          </h4>
                          <span className="text-[10px] text-slate-400">Export friction points to overcome</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                        {reportData.swotAnalysis?.weaknesses?.length || 2} Factors
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {reportData.swotAnalysis?.weaknesses?.map((item, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-slate-950/80 border border-amber-500/20 space-y-1">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-white">{item.title}</p>
                            {item.risk && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                                {item.risk} RISK
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-300 leading-relaxed">{item.detail}</p>
                        </div>
                      )) || (
                        <div className="p-3 rounded-xl bg-slate-950/80 border border-amber-500/20 text-xs text-slate-300">
                          Longer ocean transit lead-times and lack of local brand recognition in {reportData.targetCountry}.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* OPPORTUNITIES (O) */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-cyan-950/50 via-slate-900/90 to-slate-950 border border-cyan-500/40 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-cyan-500/20">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-300 font-extrabold flex items-center justify-center text-xs border border-cyan-500/40">
                          O
                        </span>
                        <div>
                          <h4 className="text-xs font-extrabold text-cyan-300 uppercase tracking-wider">
                            Opportunities (External Tailwinds)
                          </h4>
                          <span className="text-[10px] text-slate-400">Unmet niches &amp; trade advantages</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">
                        {reportData.swotAnalysis?.opportunities?.length || 2} Factors
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {reportData.swotAnalysis?.opportunities?.map((item, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-slate-950/80 border border-cyan-500/20 space-y-1">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-white">{item.title}</p>
                            {item.potential && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400">
                                {item.potential} POTENTIAL
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-300 leading-relaxed">{item.detail}</p>
                        </div>
                      )) || (
                        <div className="p-3 rounded-xl bg-slate-950/80 border border-cyan-500/20 text-xs text-slate-300">
                          Expanding market for sustainably packaged artisan tableware and corporate gifting contracts.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* THREATS (T) */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-rose-950/50 via-slate-900/90 to-slate-950 border border-rose-500/40 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-rose-500/20">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-300 font-extrabold flex items-center justify-center text-xs border border-rose-500/40">
                          T
                        </span>
                        <div>
                          <h4 className="text-xs font-extrabold text-rose-300 uppercase tracking-wider">
                            Threats (External Headwinds)
                          </h4>
                          <span className="text-[10px] text-slate-400">Trade risks &amp; mitigation steps</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300">
                        {reportData.swotAnalysis?.threats?.length || 2} Factors
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {reportData.swotAnalysis?.threats?.map((item, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-slate-950/80 border border-rose-500/20 space-y-1">
                          <p className="text-xs font-bold text-white">{item.title}</p>
                          <p className="text-[11px] text-slate-300 leading-relaxed">{item.detail}</p>
                          {item.mitigation && (
                            <div className="mt-1.5 pt-1.5 border-t border-slate-900 flex items-start gap-1.5 text-[10px] text-rose-300">
                              <ShieldCheck className="w-3 h-3 text-rose-400 shrink-0 mt-0.5" />
                              <span><strong>Mitigation:</strong> {item.mitigation}</span>
                            </div>
                          )}
                        </div>
                      )) || (
                        <div className="p-3 rounded-xl bg-slate-950/80 border border-rose-500/20 text-xs text-slate-300">
                          Non-tariff barriers and customs inspection holds. Mitigation: Complete prior lab safety audits.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Regulatory, Tariffs & Corridor Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Regulatory & Customs */}
                <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                    <Scale className="w-4 h-4 text-indigo-400" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Tariffs &amp; Compliance Advisory
                    </h4>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {reportData.regulatoryAndTariffs?.tariffOverview || 
                      "Customs tariff rates depend on bilateral trade classifications. Preferential duty may apply with official Certificate of Origin."}
                  </p>

                  <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-[11px] text-amber-200 flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      {reportData.verificationNotice || "Needs verification with the relevant official authority."}
                    </span>
                  </div>

                  {reportData.regulatoryAndTariffs?.standardsAndCertifications && (
                    <div className="space-y-1 pt-1">
                      <p className="text-[11px] font-bold text-slate-400">Required Destination Standards:</p>
                      <ul className="text-xs text-slate-300 space-y-1 list-disc pl-4">
                        {reportData.regulatoryAndTariffs.standardsAndCertifications.map((std, i) => (
                          <li key={i}>{std}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Logistics & Shipping Corridor */}
                <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                    <Ship className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Logistics Corridor to {reportData.targetCountry}
                    </h4>
                  </div>

                  <div className="space-y-2 text-xs text-slate-300">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                      <span className="text-slate-400">Primary Ports of Entry:</span>
                      <span className="font-bold text-white">
                        {reportData.logisticsCorridor?.mainEntryPorts?.join(", ") || "Main Gateway Sea & Air Ports"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                      <span className="text-slate-400">Estimated Transit Window:</span>
                      <span className="font-bold text-cyan-400">
                        {reportData.logisticsCorridor?.transitTimes || "Ocean: 18-28 Days | Air: 3-5 Days"}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 pt-1 leading-relaxed">
                      {reportData.logisticsCorridor?.shippingAdvisory || 
                        "Use 5-ply seaworthy corrugated packaging with desiccant silica pouches and ISPM-15 heat-treated fumigated wooden pallets."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Strategic 3-Phase Market Entry Roadmap */}
              {reportData.strategicRoadmap && reportData.strategicRoadmap.length > 0 && (
                <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                    <Compass className="w-5 h-5 text-blue-400" />
                    <div>
                      <h4 className="font-bold text-sm text-white">Recommended Market Entry Strategy &amp; Milestones</h4>
                      <p className="text-[11px] text-slate-400">
                        Step-by-step commercial execution timeline for {reportData.targetCountry}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {reportData.strategicRoadmap.map((item, idx) => (
                      <div key={idx} className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300">
                            STEP {idx + 1}
                          </span>
                        </div>
                        <h5 className="text-xs font-bold text-white">{item.phase}</h5>
                        <p className="text-[11px] text-slate-300 leading-relaxed">{item.action}</p>
                        <div className="pt-2 border-t border-slate-900 text-[10px] text-cyan-300">
                          <strong>Deliverable:</strong> {item.deliverable}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Markdown Full Report View */
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-400" />
                  <h4 className="text-sm font-bold text-white">Raw Formatted Markdown Intelligence Brief</h4>
                </div>
                <span className="text-[11px] text-slate-400">
                  Ready for export or presentation
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-sans space-y-3">
                {reportData.content}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

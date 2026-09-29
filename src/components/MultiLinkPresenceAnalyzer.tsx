import React, { useState } from "react";
import { 
  Globe, 
  Youtube, 
  Instagram, 
  Smartphone, 
  MapPin, 
  Share2, 
  Plus, 
  Trash2, 
  Search, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  Check, 
  ExternalLink, 
  Sparkles, 
  ArrowRight, 
  Layers, 
  ShieldCheck, 
  HelpCircle,
  Video,
  Radio,
  Bookmark
} from "lucide-react";
import { 
  MultiPresenceAnalysisResult, 
  BusinessUrlPlatform, 
  InformationReliabilityTag,
  ReliabilityItem,
  SavedItem 
} from "../types";
import { detectUrlPlatform } from "../utils/urlDetector";
import { useLanguage } from "../i18n/LanguageContext";
import { normalizeErrorMessage } from "../utils/errorUtils";

interface PresenceLinkItem {
  id: string;
  url: string;
  placeholder: string;
  defaultLabel: string;
}

interface MultiLinkPresenceAnalyzerProps {
  onSaveReport?: (item: Omit<SavedItem, "id" | "createdAt">) => void;
  savedItemIds?: string[];
}

export const MultiLinkPresenceAnalyzer: React.FC<MultiLinkPresenceAnalyzerProps> = ({
  onSaveReport,
  savedItemIds = [],
}) => {
  const { languageInfo } = useLanguage();

  // Links state
  const [links, setLinks] = useState<PresenceLinkItem[]>([
    { id: "link-website", url: "", placeholder: "https://example.com", defaultLabel: "Website URL" },
    { id: "link-youtube", url: "", placeholder: "https://youtube.com/@example or https://youtu.be/...", defaultLabel: "YouTube Channel or Video URL" },
    { id: "link-instagram", url: "", placeholder: "https://instagram.com/example", defaultLabel: "Instagram Business URL" },
    { id: "link-app", url: "", placeholder: "https://play.google.com/store/apps/... or apps.apple.com/...", defaultLabel: "App Store / Play Store URL" },
    { id: "link-gbp", url: "", placeholder: "https://maps.google.com/... or https://g.page/...", defaultLabel: "Google Business Profile URL" },
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<MultiPresenceAnalysisResult | null>(null);
  const [activeResultTab, setActiveResultTab] = useState<string>("unified");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [hasSaved, setHasSaved] = useState(false);

  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const updateLinkUrl = (id: string, newUrl: string) => {
    setLinks(prev => prev.map(l => l.id === id ? { ...l, url: newUrl } : l));
  };

  const removeLink = (id: string) => {
    setLinks(prev => prev.filter(l => l.id !== id));
  };

  const addExtraLink = () => {
    const newId = `link-custom-${Date.now()}`;
    setLinks(prev => [
      ...prev,
      { id: newId, url: "", placeholder: "https://...", defaultLabel: "Other Public Business URL" },
    ]);
  };

  const handleLoadExample = () => {
    setLinks([
      { id: "link-website", url: "https://stripe.com", placeholder: "https://example.com", defaultLabel: "Website URL" },
      { id: "link-youtube", url: "https://youtube.com/@stripe", placeholder: "https://youtube.com/@example", defaultLabel: "YouTube Channel URL" },
      { id: "link-instagram", url: "https://instagram.com/stripe", placeholder: "https://instagram.com/example", defaultLabel: "Instagram Business URL" },
      { id: "link-app", url: "https://play.google.com/store/apps/details?id=com.stripe.android.dashboard", placeholder: "App URL", defaultLabel: "App Store / Play Store URL" },
      { id: "link-gbp", url: "https://maps.google.com/?q=Stripe+Inc", placeholder: "Google Maps URL", defaultLabel: "Google Business Profile URL" },
    ]);
  };

  const handleClearAll = () => {
    setLinks(prev => prev.map(l => ({ ...l, url: "" })));
    setAnalysisResult(null);
    setErrorMessage(null);
  };

  const handleAnalyze = async () => {
    const activeLinks = links
      .map(l => ({ url: l.url.trim() }))
      .filter(l => l.url.length > 0);

    if (activeLinks.length === 0) {
      setErrorMessage("Please enter at least one public business URL to analyze.");
      return;
    }

    setIsLoading(true);
    setLoadingStep(1);
    setErrorMessage(null);
    setHasSaved(false);

    const stepTimer1 = setTimeout(() => setLoadingStep(2), 1500);
    const stepTimer2 = setTimeout(() => setLoadingStep(3), 3200);

    try {
      const res = await fetch("/api/ai/presence-analyzer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          links: activeLinks,
          language: languageInfo.code,
          languageName: `${languageInfo.nativeName} (${languageInfo.name})`,
        }),
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(normalizeErrorMessage(data?.error || data?.message, "Unable to complete omnichannel audit. Please check your URLs and try again."));
      }

      const result: MultiPresenceAnalysisResult = data.data;
      setAnalysisResult(result);

      // Default active tab to unified if available, else first analyzed section
      if (result.unified_diagnosis) {
        setActiveResultTab("unified");
      } else if (result.website_analysis) {
        setActiveResultTab("website");
      } else if (result.youtube_video_analysis) {
        setActiveResultTab("youtube_video");
      } else if (result.youtube_channel_analysis) {
        setActiveResultTab("youtube_channel");
      } else if (result.instagram_analysis) {
        setActiveResultTab("instagram");
      } else if (result.google_business_analysis) {
        setActiveResultTab("google_business");
      } else if (result.app_analysis) {
        setActiveResultTab("app");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred during omnichannel analysis.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderReliabilityBadge = (tag: InformationReliabilityTag) => {
    switch (tag) {
      case "OBSERVED":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 uppercase tracking-wider">
            <CheckCircle2 className="w-2.5 h-2.5" /> OBSERVED
          </span>
        );
      case "INFERRED":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-950/80 text-blue-300 border border-blue-500/40 uppercase tracking-wider">
            <Sparkles className="w-2.5 h-2.5" /> INFERRED
          </span>
        );
      case "USER PROVIDED":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-500/40 uppercase tracking-wider">
            USER PROVIDED
          </span>
        );
      case "RESEARCHED":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 uppercase tracking-wider">
            <ShieldCheck className="w-2.5 h-2.5" /> RESEARCHED
          </span>
        );
      case "NEEDS VERIFICATION":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-500/40 uppercase tracking-wider">
            <AlertTriangle className="w-2.5 h-2.5" /> NEEDS VERIFICATION
          </span>
        );
      default:
        return null;
    }
  };

  const getPlatformIcon = (platform: BusinessUrlPlatform) => {
    switch (platform) {
      case "website":
        return <Globe className="w-4 h-4 text-cyan-400" />;
      case "youtube_video":
        return <Video className="w-4 h-4 text-red-400" />;
      case "youtube_channel":
        return <Youtube className="w-4 h-4 text-red-500" />;
      case "instagram":
        return <Instagram className="w-4 h-4 text-pink-400" />;
      case "google_business":
        return <MapPin className="w-4 h-4 text-emerald-400" />;
      case "google_play":
      case "apple_app_store":
        return <Smartphone className="w-4 h-4 text-blue-400" />;
      default:
        return <Share2 className="w-4 h-4 text-slate-400" />;
    }
  };

  const filledCount = links.filter(l => l.url.trim().length > 0).length;

  return (
    <div className="space-y-6">
      {/* 1. Header Box */}
      <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-cyan-500/40 shadow-2xl shadow-cyan-950/30 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shadow-md">
              <Layers className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                Analyze My Business Presence
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-mono">
                  MULTI-LINK
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Provide your website, YouTube, Instagram, App, and Google Business links simultaneously.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLoadExample}
              className="text-xs px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
            >
              Fill Example Links
            </button>
            {filledCount > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-xs px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* 2. Links Input Grid with Automatic URL Detection */}
        <div className="space-y-3 pt-2">
          {links.map((linkItem, idx) => {
            const detected = linkItem.url.trim() ? detectUrlPlatform(linkItem.url) : null;

            return (
              <div
                key={linkItem.id}
                className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-slate-700/80 transition-colors space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    {detected ? getPlatformIcon(detected.platform) : <Share2 className="w-3.5 h-3.5 text-slate-500" />}
                    <span>{detected ? detected.label : linkItem.defaultLabel}</span>
                  </span>

                  {/* Automatic URL Detection Badge */}
                  {detected && (
                    <span className="text-[11px] font-bold text-cyan-400 flex items-center gap-1 font-mono">
                      {detected.badgeText}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={linkItem.url}
                    onChange={(e) => updateLinkUrl(linkItem.id, e.target.value)}
                    placeholder={linkItem.placeholder}
                    className="w-full bg-slate-900/90 rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 border border-slate-800 focus:border-cyan-400 outline-none transition-colors"
                  />
                  {links.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeLink(linkItem.id)}
                      className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition-colors cursor-pointer"
                      title="Remove Link"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add more link button & Action bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
          <button
            type="button"
            onClick={addExtraLink}
            className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-medium px-2 py-1 rounded-lg hover:bg-cyan-950/30 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Another Public Business Link</span>
          </button>

          <button
            type="button"
            disabled={isLoading || filledCount === 0}
            onClick={handleAnalyze}
            id="analyze-everything-btn"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-extrabold text-sm shadow-lg shadow-cyan-900/40 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-98"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                <span>
                  {loadingStep === 1 && "Crawling Public Observable Data..."}
                  {loadingStep === 2 && "Inspecting Store & Media Signals..."}
                  {loadingStep === 3 && "Synthesizing Omnichannel Plan..."}
                </span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>🔍 Analyze Everything ({filledCount} link{filledCount !== 1 ? "s" : ""})</span>
              </>
            )}
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* 3. Analysis Results Section */}
      {analysisResult && (
        <section className="space-y-4 animate-in fade-in duration-300" id="presence-analysis-results">
          {/* Results Navigation Bar */}
          <div className="p-2 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-1.5 overflow-x-auto">
            {analysisResult.unified_diagnosis && (
              <button
                type="button"
                onClick={() => setActiveResultTab("unified")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  activeResultTab === "unified"
                    ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                    : "text-slate-300 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Unified Diagnosis</span>
              </button>
            )}

            {analysisResult.website_analysis && (
              <button
                type="button"
                onClick={() => setActiveResultTab("website")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  activeResultTab === "website"
                    ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                    : "text-slate-300 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Website Analysis</span>
              </button>
            )}

            {analysisResult.youtube_video_analysis && (
              <button
                type="button"
                onClick={() => setActiveResultTab("youtube_video")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  activeResultTab === "youtube_video"
                    ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                    : "text-slate-300 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>YouTube Video</span>
              </button>
            )}

            {analysisResult.youtube_channel_analysis && (
              <button
                type="button"
                onClick={() => setActiveResultTab("youtube_channel")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  activeResultTab === "youtube_channel"
                    ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                    : "text-slate-300 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Youtube className="w-3.5 h-3.5" />
                <span>YouTube Channel</span>
              </button>
            )}

            {analysisResult.instagram_analysis && (
              <button
                type="button"
                onClick={() => setActiveResultTab("instagram")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  activeResultTab === "instagram"
                    ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                    : "text-slate-300 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Instagram className="w-3.5 h-3.5" />
                <span>Instagram Business</span>
              </button>
            )}

            {analysisResult.google_business_analysis && (
              <button
                type="button"
                onClick={() => setActiveResultTab("google_business")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  activeResultTab === "google_business"
                    ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                    : "text-slate-300 hover:text-white hover:bg-slate-800"
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Google Business</span>
              </button>
            )}

            {analysisResult.app_analysis && (
              <button
                type="button"
                onClick={() => setActiveResultTab("app")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  activeResultTab === "app"
                    ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                    : "text-slate-300 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>App Listing</span>
              </button>
            )}
          </div>

          {/* 4. Tab 1: Unified Multi-Channel Diagnosis */}
          {activeResultTab === "unified" && analysisResult.unified_diagnosis && (
            <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-cyan-500/40 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    UNIFIED MULTI-CHANNEL DIAGNOSIS
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {analysisResult.analyzed_links.length} Connected Touchpoints
                </span>
              </div>

              {/* Cross-Channel Consistency */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                  Cross-Channel Consistency
                </h4>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                  {analysisResult.unified_diagnosis.cross_channel_consistency}
                </p>
              </div>

              {/* Strongest Asset vs Weakest Link Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Strongest Conversion Asset</span>
                  </div>
                  <p className="text-xs text-slate-200">
                    {analysisResult.unified_diagnosis.strongest_conversion_asset}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Weakest Link in Ecosystem</span>
                  </div>
                  <p className="text-xs text-slate-200">
                    {analysisResult.unified_diagnosis.weakest_link_in_ecosystem}
                  </p>
                </div>
              </div>

              {/* Funnel Drop-Off Points */}
              {analysisResult.unified_diagnosis.funnel_drop_off_points?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400">
                    Funnel Drop-Off Points
                  </h4>
                  <div className="space-y-1.5">
                    {analysisResult.unified_diagnosis.funnel_drop_off_points.map((pt, i) => (
                      <div key={i} className="text-xs text-slate-300 flex items-start gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                        <span>{pt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Messaging Mismatches */}
              {analysisResult.unified_diagnosis.messaging_mismatches?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                    Messaging Mismatches (Cross-Platform)
                  </h4>
                  <div className="space-y-1.5">
                    {analysisResult.unified_diagnosis.messaging_mismatches.map((mm, i) => (
                      <div key={i} className="text-xs text-slate-300 flex items-start gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                        <span>{mm}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Unified Priority Action Plan */}
              {analysisResult.unified_diagnosis.unified_priority_action_plan?.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center justify-between">
                    <span>Unified Priority Action Plan (Top 5 Actions Across Platforms)</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(
                        analysisResult.unified_diagnosis!.unified_priority_action_plan
                          .map(a => `${a.priority}. [${a.platform}] ${a.action} (Impact: ${a.impact})`)
                          .join("\n"),
                        "copy-unified-plan"
                      )}
                      className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer font-normal normal-case"
                    >
                      {copiedKey === "copy-unified-plan" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Copy Plan</span>
                    </button>
                  </h4>
                  <div className="space-y-2">
                    {analysisResult.unified_diagnosis.unified_priority_action_plan.map((act) => (
                      <div key={act.priority} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-start gap-3">
                        <div className="w-6 h-6 rounded-lg bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-xs font-bold flex items-center justify-center shrink-0">
                          {act.priority}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-bold text-cyan-400 font-mono tracking-wide">
                              {act.platform}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                              Impact: {act.impact}
                            </span>
                          </div>
                          <p className="text-xs text-white leading-relaxed">
                            {act.action}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 5. Tab 2: Website Analysis (Strict Reliability Labels) */}
          {activeResultTab === "website" && analysisResult.website_analysis && (
            <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-cyan-500/40 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    WEBSITE OBSERVABLE AUDIT
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={analysisResult.website_analysis.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    <span>{analysisResult.website_analysis.url}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Reliability Legend */}
              <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
                <span className="font-bold text-slate-300">Data Integrity System:</span>
                {renderReliabilityBadge("OBSERVED")}
                {renderReliabilityBadge("INFERRED")}
                {renderReliabilityBadge("NEEDS VERIFICATION")}
              </div>

              {/* Observable Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Title */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">Page Title</span>
                    {renderReliabilityBadge(analysisResult.website_analysis.page_title.tag)}
                  </div>
                  <p className="text-xs text-white font-mono break-words">
                    {analysisResult.website_analysis.page_title.value || "None detected"}
                  </p>
                </div>

                {/* Meta Description */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">Meta Description</span>
                    {renderReliabilityBadge(analysisResult.website_analysis.meta_description.tag)}
                  </div>
                  <p className="text-xs text-slate-300 break-words">
                    {analysisResult.website_analysis.meta_description.value || "None detected"}
                  </p>
                </div>

                {/* H1 Headings */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">H1 Headings</span>
                    {renderReliabilityBadge(analysisResult.website_analysis.h1.tag)}
                  </div>
                  <div className="text-xs text-white space-y-1">
                    {analysisResult.website_analysis.h1.value?.length > 0 ? (
                      analysisResult.website_analysis.h1.value.map((h, i) => (
                        <div key={i} className="p-1 rounded bg-slate-900 font-mono text-[11px]">{h}</div>
                      ))
                    ) : (
                      <span className="text-slate-500">No H1 tags found</span>
                    )}
                  </div>
                </div>

                {/* WhatsApp & Contact Path */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">WhatsApp / Contact Path</span>
                    {renderReliabilityBadge(analysisResult.website_analysis.whatsapp_contact_path.tag)}
                  </div>
                  <p className="text-xs text-slate-300">
                    {analysisResult.website_analysis.whatsapp_contact_path.value}
                  </p>
                </div>

                {/* Technical SEO Signals */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">Technical SEO Signals</span>
                    {renderReliabilityBadge(analysisResult.website_analysis.technical_seo_signals.tag)}
                  </div>
                  <p className="text-xs text-slate-300">
                    {analysisResult.website_analysis.technical_seo_signals.value}
                  </p>
                </div>

                {/* Navigation & Images */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">Images & Navigation</span>
                    {renderReliabilityBadge(analysisResult.website_analysis.images_and_alt_text.tag)}
                  </div>
                  <p className="text-xs text-slate-300">
                    {analysisResult.website_analysis.images_and_alt_text.value} • {analysisResult.website_analysis.navigation_and_internal_links.value}
                  </p>
                </div>
              </div>

              {/* Conversion Friction (Inferred) */}
              {analysisResult.website_analysis.conversion_friction?.value?.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400">
                      Conversion Friction Points
                    </h4>
                    {renderReliabilityBadge(analysisResult.website_analysis.conversion_friction.tag)}
                  </div>
                  <div className="space-y-1.5">
                    {analysisResult.website_analysis.conversion_friction.value.map((f, i) => (
                      <div key={i} className="text-xs text-slate-300 flex items-start gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 6. Tab 3: YouTube Video Analyzer */}
          {activeResultTab === "youtube_video" && analysisResult.youtube_video_analysis && (
            <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-red-500/40 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Video className="w-5 h-5 text-red-400" />
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    YOUTUBE VIDEO ANALYZER
                  </h3>
                </div>
                <a
                  href={analysisResult.youtube_video_analysis.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                >
                  <span>Watch Video</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Video Meta Card */}
              {analysisResult.youtube_video_analysis.public_metadata && (
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-wrap sm:flex-nowrap items-center gap-3">
                  {analysisResult.youtube_video_analysis.public_metadata.thumbnail_url && (
                    <img
                      src={analysisResult.youtube_video_analysis.public_metadata.thumbnail_url}
                      alt="Thumbnail"
                      className="w-28 h-16 object-cover rounded-xl border border-slate-800 shrink-0"
                    />
                  )}
                  <div className="space-y-1 min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                      {analysisResult.youtube_video_analysis.public_metadata.title}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Channel: {analysisResult.youtube_video_analysis.public_metadata.author_name} • {analysisResult.youtube_video_analysis.public_metadata.statistics_notice}
                    </p>
                  </div>
                </div>
              )}

              {/* Title & Description Analysis */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-xs font-bold text-slate-300">TITLE ANALYSIS</span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {analysisResult.youtube_video_analysis.title_analysis}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-xs font-bold text-slate-300">DESCRIPTION ANALYSIS</span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {analysisResult.youtube_video_analysis.description_analysis}
                  </p>
                </div>
              </div>

              {/* Thumbnail / Hook & CTA */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-xs font-bold text-slate-300">THUMBNAIL / HOOK OBSERVATIONS</span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {analysisResult.youtube_video_analysis.thumbnail_hook_observations}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-xs font-bold text-slate-300">CTA ANALYSIS</span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {analysisResult.youtube_video_analysis.cta_analysis}
                  </p>
                </div>
              </div>

              {/* Ready Title Options */}
              {analysisResult.youtube_video_analysis.ready_title_options?.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-cyan-300 uppercase tracking-wide">
                    Ready High-CTR Title Options
                  </span>
                  <div className="space-y-1.5">
                    {analysisResult.youtube_video_analysis.ready_title_options.map((t, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white">
                        <span>{t}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(t, `yt-title-${i}`)}
                          className="text-slate-400 hover:text-white text-[11px] flex items-center gap-1 cursor-pointer"
                        >
                          {copiedKey === `yt-title-${i}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ready Description & CTA */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-300 uppercase">
                    Ready Description & Pinned CTA
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(
                      `${analysisResult.youtube_video_analysis!.ready_description}\n\nCTA: ${analysisResult.youtube_video_analysis!.ready_cta}`,
                      "yt-desc"
                    )}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === "yt-desc" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Copy</span>
                  </button>
                </div>
                <p className="text-xs text-slate-200 whitespace-pre-line font-mono bg-slate-900 p-3 rounded-xl border border-slate-800">
                  {analysisResult.youtube_video_analysis.ready_description}
                </p>
                <div className="p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-xs text-cyan-300">
                  <strong>Recommended Pinned Comment:</strong> {analysisResult.youtube_video_analysis.ready_cta}
                </div>
              </div>
            </div>
          )}

          {/* 7. Tab 4: YouTube Channel Analyzer */}
          {activeResultTab === "youtube_channel" && analysisResult.youtube_channel_analysis && (
            <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-red-500/40 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Youtube className="w-5 h-5 text-red-500" />
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    YOUTUBE CHANNEL AUDIT ({analysisResult.youtube_channel_analysis.channel_name})
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {analysisResult.youtube_channel_analysis.metrics_notice}
                </span>
              </div>

              {/* Channel Health & Content Positioning */}
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-xs font-bold text-cyan-400 uppercase">CHANNEL HEALTH & POSITIONING</span>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                    {analysisResult.youtube_channel_analysis.channel_health}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-xs font-bold text-amber-400 uppercase">TITLE & SEO ISSUES</span>
                    <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                      {analysisResult.youtube_channel_analysis.title_seo_issues.map((iss, i) => (
                        <li key={i}>{iss}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-xs font-bold text-amber-400 uppercase">CONTENT GAPS & CTA ISSUES</span>
                    <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                      {analysisResult.youtube_channel_analysis.content_gaps.concat(analysisResult.youtube_channel_analysis.cta_issues).map((iss, i) => (
                        <li key={i}>{iss}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Ready Improvements */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 uppercase">
                      READY-TO-USE CHANNEL IMPROVEMENTS
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(analysisResult.youtube_channel_analysis!.ready_to_use_improvements.join("\n"), "yt-chan-imp")}
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === "yt-chan-imp" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>Copy</span>
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {analysisResult.youtube_channel_analysis.ready_to_use_improvements.map((imp, i) => (
                      <div key={i} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                        <span>{imp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 8. Tab 5: Instagram Business Analyzer */}
          {activeResultTab === "instagram" && analysisResult.instagram_analysis && (
            <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-pink-500/40 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Instagram className="w-5 h-5 text-pink-400" />
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    INSTAGRAM BUSINESS AUDIT
                  </h3>
                </div>
                {analysisResult.instagram_analysis.access_limitation_notice && (
                  <span className="text-[11px] text-amber-400 font-mono">
                    {analysisResult.instagram_analysis.access_limitation_notice}
                  </span>
                )}
              </div>

              {/* Bio & Link-in-Bio Analysis */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-xs font-bold text-pink-300 uppercase">BIO & POSITIONING ANALYSIS</span>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    {analysisResult.instagram_analysis.bio_analysis}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-xs font-bold text-pink-300 uppercase">LINK-IN-BIO CONVERSION FRICTION</span>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    {analysisResult.instagram_analysis.link_in_bio_analysis}
                  </p>
                </div>
              </div>

              {/* Ready Bio Options */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-cyan-300 uppercase">
                  Ready Bio Improvements (Copy & Paste to Profile)
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {analysisResult.instagram_analysis.ready_bio_improvements.map((bio, i) => (
                    <div key={i} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Option {i + 1}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(bio, `ig-bio-${i}`)}
                          className="text-slate-400 hover:text-white text-xs flex items-center gap-1 cursor-pointer"
                        >
                          {copiedKey === `ig-bio-${i}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>Copy</span>
                        </button>
                      </div>
                      <p className="text-xs text-white whitespace-pre-line font-mono bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                        {bio}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 5 High-Converting Post Hooks */}
              {analysisResult.instagram_analysis.five_high_converting_post_hooks?.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-pink-400 uppercase">
                      5 High-Converting Post Hooks
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(analysisResult.instagram_analysis!.five_high_converting_post_hooks.join("\n"), "ig-hooks")}
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === "ig-hooks" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Copy All Hooks</span>
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {analysisResult.instagram_analysis.five_high_converting_post_hooks.map((hook, i) => (
                      <div key={i} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white flex items-center justify-between">
                        <span>"{hook}"</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(hook, `ig-hook-${i}`)}
                          className="text-slate-500 hover:text-white text-[11px] cursor-pointer"
                        >
                          {copiedKey === `ig-hook-${i}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3 Reel Concepts */}
              {analysisResult.instagram_analysis.three_reel_concepts?.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-purple-400 uppercase">
                    3 High-Retention Reel Concepts
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {analysisResult.instagram_analysis.three_reel_concepts.map((reel, i) => (
                      <div key={i} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                        <div className="text-[10px] font-bold text-purple-300 uppercase">Reel {i + 1}</div>
                        <div className="space-y-1 text-xs">
                          <p><strong>Hook:</strong> "{reel.hook}"</p>
                          <p className="text-slate-400"><strong>Body:</strong> {reel.body}</p>
                          <p className="text-cyan-300"><strong>CTA:</strong> {reel.cta}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 9. Tab 6: Google Business Profile Analyzer */}
          {activeResultTab === "google_business" && analysisResult.google_business_analysis && (
            <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-emerald-500/40 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    GOOGLE BUSINESS PROFILE AUDIT
                  </h3>
                </div>
                <span className="text-xs text-emerald-400 font-mono">
                  {analysisResult.google_business_analysis.category_primary_category}
                </span>
              </div>

              {/* Profile Completeness & Local Ranking */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-xs font-bold text-emerald-300 uppercase">PROFILE COMPLETENESS</span>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    {analysisResult.google_business_analysis.profile_completeness_observations}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-xs font-bold text-emerald-300 uppercase">SERVICE AREA & VISIBILITY</span>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    {analysisResult.google_business_analysis.service_area_address_visibility}
                  </p>
                </div>
              </div>

              {/* Action Checklist */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-300 uppercase">
                    High-Priority Action Checklist (Local Pack Dominance)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(analysisResult.google_business_analysis!.high_priority_action_checklist.join("\n"), "gbp-chk")}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === "gbp-chk" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Copy Checklist</span>
                  </button>
                </div>
                <div className="space-y-1.5">
                  {analysisResult.google_business_analysis.high_priority_action_checklist.map((chk, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                      <span>{chk}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 10. Tab 7: App Store Listing Analyzer */}
          {activeResultTab === "app" && analysisResult.app_analysis && (
            <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-blue-500/40 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-blue-400" />
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    APP STORE LISTING AUDIT ({analysisResult.app_analysis.app_title})
                  </h3>
                </div>
                <span className="text-xs text-blue-400 font-mono">
                  {analysisResult.app_analysis.category}
                </span>
              </div>

              {/* Description & Feature Positioning */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-xs font-bold text-blue-300 uppercase">FEATURE POSITIONING & ONBOARDING</span>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {analysisResult.app_analysis.visible_feature_positioning}
                </p>
              </div>

              {/* Screenshot Hook & ASO Keywords */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-xs font-bold text-cyan-300 uppercase">SCREENSHOT / HOOK REVIEW</span>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    {analysisResult.app_analysis.screenshot_hook_review}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-xs font-bold text-cyan-300 uppercase">ASO KEYWORD RECOMMENDATIONS</span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {analysisResult.app_analysis.aso_keyword_recommendations?.map((kw, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-cyan-400 font-mono">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Review & Conversion Strategy */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-xs font-bold text-emerald-400 uppercase">IN-APP REVIEW & DOWNLOAD CONVERSION</span>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {analysisResult.app_analysis.review_strategy}
                </p>
              </div>
            </div>
          )}

          {/* Save Presence Audit to Cloud / Local Reports */}
          {onSaveReport && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 to-blue-950/40 border border-cyan-500/30 flex items-center justify-between gap-3">
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white">Save Omnichannel Audit Report</h4>
                <p className="text-[11px] text-slate-400">Save this cross-platform diagnosis to your dashboard to track improvements over time.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onSaveReport({
                    type: "assistant",
                    title: `Omnichannel Presence Audit (${analysisResult.analyzed_links.length} Links)`,
                    summary: analysisResult.unified_diagnosis?.cross_channel_consistency?.slice(0, 140) || "Omnichannel presence diagnosis",
                    content: analysisResult as any,
                    tags: ["Presence", "Omnichannel", "Audit"],
                  });
                  setHasSaved(true);
                }}
                disabled={hasSaved}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all cursor-pointer disabled:opacity-60 flex items-center gap-1.5 shrink-0"
              >
                {hasSaved ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                <span>{hasSaved ? "Saved to Reports" : "Save Report"}</span>
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

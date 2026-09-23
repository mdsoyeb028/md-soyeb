import React, { useState } from "react";
import { 
  Search, 
  Globe, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  BookmarkCheck, 
  Loader2, 
  Gauge, 
  Code2, 
  FileSearch, 
  Sparkles,
  Info,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Zap,
  Layers
} from "lucide-react";
import { SavedItem, SeoAnalysisResult } from "../types";

interface SeoViewProps {
  onSaveItem: (item: Omit<SavedItem, "id" | "createdAt">) => void;
}

export const SeoView: React.FC<SeoViewProps> = ({ onSaveItem }) => {
  const [url, setUrl] = useState("https://md-soyeb.vercel.app");
  const [targetKeyword, setTargetKeyword] = useState("business growth export hub");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [seoData, setSeoData] = useState<SeoAnalysisResult | null>(null);
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [copiedDesc, setCopiedDesc] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  const handleAnalyzeSeo = async () => {
    if (!url.trim() || isLoading) return;
    setIsLoading(true);
    setErrorMessage(null);
    setHasSaved(false);

    try {
      const res = await fetch("/api/ai/seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), keyword: targetKeyword.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Server responded with status ${res.status}`);
      }

      setSeoData(data);
    } catch (err: unknown) {
      console.error("SEO Audit Error:", err);
      const msg = err instanceof Error ? err.message : "Failed to audit website. Please check the URL and try again.";
      setErrorMessage(msg);
      setSeoData(null); // Never replace failed real requests with fake data
    } finally {
      setIsLoading(false);
    }
  };

  const copyText = (text: string, type: "title" | "desc") => {
    navigator.clipboard.writeText(text);
    if (type === "title") {
      setCopiedTitle(true);
      setTimeout(() => setCopiedTitle(false), 2000);
    } else {
      setCopiedDesc(true);
      setTimeout(() => setCopiedDesc(false), 2000);
    }
  };

  const handleSave = () => {
    if (!seoData || hasSaved) return;
    onSaveItem({
      type: "seo",
      title: `Real SEO Audit: ${seoData.normalizedUrl || url}`,
      summary: `Health Score: ${seoData.score}/100. Response time: ${seoData.responseTimeMs || 0}ms.`,
      content: JSON.stringify(seoData, null, 2),
      category: "SEO Report",
      tags: [url, `Score: ${seoData.score}`, "Audit"],
    });
    setHasSaved(true);
  };

  return (
    <div className="space-y-5 pb-6">
      {/* Header Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/60 via-slate-900/80 to-blue-950/60 border border-cyan-500/30 backdrop-blur-xl">
        <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1">
          <Search className="w-4 h-4" />
          <span>Real-Time Website Audit Engine</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-white">
          Real SEO & Technical Health Audit
        </h1>
        <p className="text-xs text-slate-300 mt-1">
          Live webpage crawler detects real HTML metadata, H1/H2 tags, viewport, robots.txt, sitemap, SSL, and response speed with SSRF protection.
        </p>
      </div>

      {/* Input Form Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl space-y-3.5">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Website URL (Public HTTP/HTTPS)
          </label>
          <div className="relative">
            <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 focus:border-cyan-400 text-white text-xs sm:text-sm outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Target Niche / Focus Keyword (Optional)
          </label>
          <input
            type="text"
            value={targetKeyword}
            onChange={(e) => setTargetKeyword(e.target.value)}
            placeholder="e.g. handmade brass crafts, wholesale leather jackets"
            className="w-full px-3 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 focus:border-cyan-400 text-white text-xs sm:text-sm outline-none"
          />
        </div>

        <button
          id="analyze-seo-btn"
          onClick={handleAnalyzeSeo}
          disabled={isLoading || !url.trim()}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
              <span>Crawling Live Webpage & Auditing Elements...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Run Real SEO Audit</span>
            </>
          )}
        </button>
      </div>

      {/* Error Alert Banner */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-950/70 border border-rose-500/50 text-rose-200 backdrop-blur-xl space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>Audit Could Not Be Completed</span>
          </div>
          <p className="text-xs text-rose-200/90 leading-relaxed">
            {errorMessage}
          </p>
          <button
            onClick={handleAnalyzeSeo}
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-900/80 hover:bg-rose-800 text-white text-xs font-semibold border border-rose-700 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {/* Real SEO Results Display */}
      {seoData && (
        <div className="space-y-4">
          {/* Health Score Overview */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-cyan-500/40 backdrop-blur-xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Circular score gauge calculated from real detected data */}
              <div className="relative w-20 h-20 rounded-full flex items-center justify-center bg-slate-950 border-4 border-cyan-500/30 shadow-inner">
                <div 
                  className="absolute inset-0 rounded-full border-4 border-cyan-400 transition-all duration-700"
                  style={{
                    clipPath: `polygon(0 0, 100% 0, 100% ${seoData.score}%, 0 ${seoData.score}%)`
                  }}
                />
                <div className="text-center z-10">
                  <span className="text-2xl font-black text-white">{seoData.score}</span>
                  <span className="text-[10px] text-slate-400 block -mt-1">/100</span>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-white">Calculated SEO Score</h3>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                    seoData.score >= 80 
                      ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                      : seoData.score >= 60
                      ? "bg-cyan-950 text-cyan-300 border-cyan-800"
                      : "bg-amber-950 text-amber-300 border-amber-800"
                  }`}>
                    {seoData.score >= 80 ? "Optimal" : seoData.score >= 60 ? "Moderate" : "Needs Action"}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 max-w-sm">
                  {seoData.summary}
                </p>
              </div>
            </div>

            <button
              onClick={handleSave}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border cursor-pointer ${
                hasSaved
                  ? "bg-emerald-950 text-emerald-300 border-emerald-700"
                  : "bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border-cyan-700"
              }`}
            >
              <BookmarkCheck className="w-4 h-4" />
              <span>{hasSaved ? "Saved to Dashboard" : "Save Report"}</span>
            </button>
          </div>

          {/* Real Metrics Quick Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block">Response Time</span>
                <span className="font-bold text-white">{seoData.responseTimeMs} ms</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block">HTML Size</span>
                <span className="font-bold text-white">{seoData.pageSizeKb} KB</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2">
              {seoData.isHttps ? (
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <div>
                <span className="text-[10px] text-slate-400 block">Security</span>
                <span className={`font-bold ${seoData.isHttps ? "text-emerald-300" : "text-rose-400"}`}>
                  {seoData.isHttps ? "HTTPS SSL" : "HTTP Insecure"}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2">
              <Code2 className="w-4 h-4 text-purple-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block">HTTP Status</span>
                <span className="font-bold text-white">{seoData.httpStatus || 200} OK</span>
              </div>
            </div>
          </div>

          {/* Technical SEO & On-Page Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Technical SEO */}
            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2.5">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
                <Gauge className="w-4 h-4" />
                <span>Detected Technical Signals</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2 text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                  <span><strong>Mobile:</strong> {seoData.technicalSeo.mobile}</span>
                </div>
                <div className="flex items-start gap-2 text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                  <span><strong>Speed:</strong> {seoData.technicalSeo.speed}</span>
                </div>
                <div className="flex items-start gap-2 text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                  <span><strong>Security:</strong> {seoData.technicalSeo.ssl}</span>
                </div>
                <div className="flex items-start gap-2 text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                  <span><strong>Crawlability:</strong> {seoData.technicalSeo.crawlability}</span>
                </div>
              </div>
            </div>

            {/* On-Page SEO */}
            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2.5">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-wider">
                <Code2 className="w-4 h-4" />
                <span>Detected On-Page Architecture</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2 text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                  <span><strong>Headings:</strong> {seoData.onPageSeo.headings}</span>
                </div>
                <div className="flex items-start gap-2 text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                  <span><strong>Content Size:</strong> {seoData.onPageSeo.contentQuality}</span>
                </div>
                <div className="flex items-start gap-2 text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                  <span><strong>Link Flow:</strong> {seoData.onPageSeo.internalLinks}</span>
                </div>
                {seoData.detectedData && (
                  <div className="flex items-start gap-2 text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Image Alt Tags:</strong> {seoData.detectedData.imagesWithAlt} of {seoData.detectedData.totalImages} images have alt attributes ({seoData.detectedData.imagesMissingAlt} missing).
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Third-Party Data Transparency Notice */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-400 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-slate-300">Verification & Data Transparency Policy</p>
              <p className="text-[11px] leading-relaxed">
                {seoData.technicalSeo.coreWebVitalsNotice || "Real-user Core Web Vitals (LCP, CLS, INP) require Chrome UX Report (CrUX) or Google Search Console integration."}
              </p>
            </div>
          </div>

          {/* SERP Snippet Preview (Meta Title & Meta Description) */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <FileSearch className="w-4 h-4 text-cyan-400" />
                <span>Google Search Snippet Simulation (SERP)</span>
              </span>
              <span className="text-[10px] text-slate-400">Live Preview</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1 font-sans">
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <span>{seoData.normalizedUrl || url}</span>
                <span>› products</span>
              </div>
              <h4 className="text-sm font-semibold text-blue-400 hover:underline cursor-pointer">
                {seoData.metaTitle}
              </h4>
              <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                {seoData.metaDescription}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block">Recommended Meta Title</span>
                  <span className="text-slate-200 line-clamp-1">{seoData.metaTitle}</span>
                </div>
                <button
                  onClick={() => copyText(seoData.metaTitle, "title")}
                  className="px-2 py-1 rounded bg-slate-800 text-cyan-300 hover:bg-slate-700 transition-colors shrink-0 ml-2 cursor-pointer"
                  title="Copy Title"
                >
                  {copiedTitle ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block">Recommended Meta Description</span>
                  <span className="text-slate-200 line-clamp-1">{seoData.metaDescription}</span>
                </div>
                <button
                  onClick={() => copyText(seoData.metaDescription, "desc")}
                  className="px-2 py-1 rounded bg-slate-800 text-cyan-300 hover:bg-slate-700 transition-colors shrink-0 ml-2 cursor-pointer"
                  title="Copy Description"
                >
                  {copiedDesc ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>

          {/* Keywords Table Card */}
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Extracted On-Page Target Keywords
              </h3>
              <span className="text-[10px] text-slate-400">
                Based on actual crawl content
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                    <th className="pb-2">Keyword Phrase</th>
                    <th className="pb-2">Search Volume</th>
                    <th className="pb-2">Difficulty</th>
                    <th className="pb-2">Search Intent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {seoData.keywords.map((kw, i) => (
                    <tr key={i} className="hover:bg-slate-800/30">
                      <td className="py-2.5 font-medium text-white">{kw.term}</td>
                      <td className="py-2.5 text-slate-400 text-[11px]">{kw.volume}</td>
                      <td className="py-2.5 text-slate-400 text-[11px]">{kw.difficulty}</td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-cyan-300">
                          {kw.intent}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {seoData.keywordNotice && (
              <p className="text-[10px] text-slate-500 italic">
                {seoData.keywordNotice}
              </p>
            )}
          </div>

          {/* Prioritized Improvement Suggestions */}
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Real Detected Action Items ({seoData.suggestions.length})
            </h3>

            <div className="space-y-2">
              {seoData.suggestions.map((sug, i) => (
                <div 
                  key={i} 
                  className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-3 text-xs"
                >
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 mt-0.5 ${
                    sug.priority === "Critical"
                      ? "bg-rose-950 text-rose-300 border border-rose-800"
                      : sug.priority === "High"
                      ? "bg-amber-950 text-amber-300 border border-amber-800"
                      : "bg-blue-950 text-blue-300 border border-blue-800"
                  }`}>
                    {sug.priority}
                  </span>
                  <div>
                    <h4 className="font-semibold text-white">{sug.title}</h4>
                    <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                      {sug.action}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

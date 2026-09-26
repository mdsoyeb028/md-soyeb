import React, { useState } from "react";
import { 
  Briefcase, 
  Lightbulb, 
  FileSpreadsheet, 
  Target, 
  Calculator, 
  MessageSquare, 
  Tag, 
  Sparkles, 
  Swords, 
  ShoppingBag, 
  Copy, 
  BookmarkCheck, 
  Loader2,
  Check,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { SavedItem } from "../types";
import { BUSINESS_TOOLS_LIST } from "../data/mockData";
import { normalizeErrorMessage } from "../utils/errorUtils";
import { useLanguage } from "../i18n/LanguageContext";

interface BusinessViewProps {
  onSaveItem: (item: Omit<SavedItem, "id" | "createdAt">) => void;
}

export const BusinessView: React.FC<BusinessViewProps> = ({ onSaveItem }) => {
  const { t, languageInfo } = useLanguage();
  const [selectedToolId, setSelectedToolId] = useState("pricing-calc");

  // General form inputs
  const [inputField1, setInputField1] = useState("Handmade Brass Tableware");
  const [inputField2, setInputField2] = useState("Eco-luxury home goods boutique");
  const [inputField3, setInputField3] = useState("35"); // e.g. for cost or margin

  // Interactive live pricing calculator state
  const [unitCost, setUnitCost] = useState(24);
  const [targetMargin, setTargetMargin] = useState(45);
  const [wholesaleDiscount, setWholesaleDiscount] = useState(30);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resultText, setResultText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  // Live calculator computed numbers
  const retailPrice = (unitCost / (1 - targetMargin / 100)).toFixed(2);
  const retailProfit = (Number(retailPrice) - unitCost).toFixed(2);
  const wholesalePrice = (Number(retailPrice) * (1 - wholesaleDiscount / 100)).toFixed(2);
  const wholesaleProfit = (Number(wholesalePrice) - unitCost).toFixed(2);
  const fobExportPrice = (unitCost * 1.25).toFixed(2);

  const getToolMeta = () => {
    return BUSINESS_TOOLS_LIST.find((t) => t.id === selectedToolId) || BUSINESS_TOOLS_LIST[0];
  };

  const handleRunTool = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setResultText(null);
    setHasSaved(false);

    let inputData: Record<string, unknown> = {};

    if (selectedToolId === "pricing-calc") {
      inputData = {
        product: inputField1,
        cost: unitCost,
        margin: targetMargin,
        retailPrice,
        wholesalePrice,
        fobExportPrice,
      };
    } else {
      inputData = {
        title: inputField1,
        niche: inputField1,
        details: inputField2,
        extra: inputField3,
        tool: selectedToolId,
      };
    }

    try {
      const res = await fetch("/api/ai/business", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          toolType: selectedToolId,
          inputData,
          language: languageInfo.code,
          languageName: `${languageInfo.nativeName} (${languageInfo.name})`,
        }),
      });

      const contentTypeHeader = res.headers.get("content-type") || "";
      if (!contentTypeHeader.includes("application/json")) {
        const rawText = await res.text();
        const snippet = rawText.slice(0, 150).replace(/<[^>]*>/g, "").trim();
        throw new Error(
          `The server returned an unexpected response (HTTP ${res.status}). ${
            snippet ? `Detail: "${snippet}"` : "The business strategy API may be temporarily unreachable."
          }`
        );
      }

      const data = await res.json();
      if (!res.ok || data.success === false) {
        const rawError = data?.error || data?.message || data?.detail || `Business blueprint analysis failed (HTTP ${res.status}).`;
        const errorDetail = normalizeErrorMessage(rawError, `Server responded with status ${res.status}`);
        throw new Error(errorDetail);
      }

      const payload = data.data || data;
      setResultText(payload.content || data.content || "Business brief generated.");
    } catch (err: unknown) {
      console.error("Business tool error:", err);
      const msg = normalizeErrorMessage(err, "Failed to generate business blueprint.");
      setErrorMessage(msg);
      setResultText(null); // Never replace failed real requests with fake data
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!resultText) return;
    navigator.clipboard.writeText(resultText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    if (!resultText || hasSaved) return;
    const tool = getToolMeta();
    onSaveItem({
      type: "business",
      title: `${tool.name}: ${inputField1}`,
      summary: `Business Tool: ${tool.name}. Target: ${inputField2 || 'General'}`,
      content: resultText,
      category: "Business Strategy",
      tags: [tool.name, inputField1, "Business"],
    });
    setHasSaved(true);
  };

  const getIconForTool = (id: string) => {
    switch (id) {
      case "idea-gen": return Lightbulb;
      case "biz-plan": return FileSpreadsheet;
      case "mkt-plan": return Target;
      case "pricing-calc": return Calculator;
      case "customer-msg": return MessageSquare;
      case "brand-names": return Tag;
      case "tagline-gen": return Sparkles;
      case "competitor-analysis": return Swords;
      case "prod-desc": return ShoppingBag;
      default: return Briefcase;
    }
  };

  return (
    <div className="space-y-5 pb-6">
      {/* Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900/80 to-blue-950/60 border border-emerald-500/30 backdrop-blur-xl">
        <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
          <Briefcase className="w-4 h-4" />
          <span>Business Planning & Operations Suite</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-white">
          Business Growth Tools
        </h1>
        <p className="text-xs text-slate-300 mt-1">
          9 specialized commercial calculators, marketing plan creators, and strategic messaging generators for startups and exporters.
        </p>
      </div>

      {/* Tool Selector Carousel / Horizontal Scroll */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider px-1">
          Select Business Utility
        </label>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {BUSINESS_TOOLS_LIST.map((tool) => {
            const Icon = getIconForTool(tool.id);
            const isSelected = selectedToolId === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => {
                  setSelectedToolId(tool.id);
                  setResultText(null);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all border shrink-0 ${
                  isSelected
                    ? "bg-emerald-600/30 text-emerald-200 border-emerald-500/60 shadow-lg shadow-emerald-500/10"
                    : "bg-slate-900/60 text-slate-400 hover:text-slate-200 border-slate-800"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tool.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Tool Form */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
          {React.createElement(getIconForTool(selectedToolId), { className: "w-5 h-5 text-emerald-400" })}
          <div>
            <h2 className="text-sm font-bold text-white">{getToolMeta().name}</h2>
            <p className="text-[11px] text-slate-400">{getToolMeta().desc}</p>
          </div>
        </div>

        {/* Specialized Interactive UI for Pricing Calculator */}
        {selectedToolId === "pricing-calc" ? (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Product / Item Name
                </label>
                <input
                  type="text"
                  value={inputField1}
                  onChange={(e) => setInputField1(e.target.value)}
                  className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 p-2.5 text-white outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Unit Cost (COGS) ($)
                </label>
                <input
                  type="number"
                  value={unitCost}
                  onChange={(e) => setUnitCost(Math.max(1, Number(e.target.value)))}
                  className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 p-2.5 text-white outline-none focus:border-emerald-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Target Gross Margin: {targetMargin}%
                </label>
                <input
                  type="range"
                  min="15"
                  max="85"
                  value={targetMargin}
                  onChange={(e) => setTargetMargin(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400 mt-3"
                />
              </div>
            </div>

            {/* Live Interactive Margins Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block uppercase font-medium">B2C Retail Price</span>
                <span className="text-base font-extrabold text-emerald-400 font-mono">${retailPrice}</span>
                <span className="text-[10px] text-slate-500 block">Profit: +${retailProfit}/u</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Wholesale Price</span>
                <span className="text-base font-extrabold text-blue-400 font-mono">${wholesalePrice}</span>
                <span className="text-[10px] text-slate-500 block">Profit: +${wholesaleProfit}/u</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block uppercase font-medium">FOB Export Floor</span>
                <span className="text-base font-extrabold text-cyan-400 font-mono">${fobExportPrice}</span>
                <span className="text-[10px] text-slate-500 block">Container MOQ rate</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Markup Multiple</span>
                <span className="text-base font-extrabold text-purple-400 font-mono">
                  {(Number(retailPrice) / unitCost).toFixed(1)}x
                </span>
                <span className="text-[10px] text-slate-500 block">Of Cost Basis</span>
              </div>
            </div>
          </div>
        ) : (
          /* General dynamic inputs for other tools */
          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                {selectedToolId === "brand-names" && "Business Niche & Industry"}
                {selectedToolId === "biz-plan" && "Business Concept / Product"}
                {selectedToolId === "mkt-plan" && "Target Market & Product"}
                {selectedToolId === "customer-msg" && "Customer Message Objective (e.g. Order Update, Inquire, Review)"}
                {selectedToolId === "tagline-gen" && "Brand Name & Core Value"}
                {selectedToolId === "competitor-analysis" && "Your Product & Main Competitors"}
                {selectedToolId === "prod-desc" && "Product Name & Core Materials"}
                {selectedToolId === "idea-gen" && "Industry of Interest or Skillset"}
              </label>
              <input
                type="text"
                value={inputField1}
                onChange={(e) => setInputField1(e.target.value)}
                placeholder="Enter details..."
                className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 p-2.5 text-white outline-none focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                {selectedToolId === "brand-names" && "Preferred Brand Vibe (e.g. Luxury, Modern, Eco-friendly, Minimalist)"}
                {selectedToolId === "biz-plan" && "Target Demographics & Key Competitive Advantage"}
                {selectedToolId === "mkt-plan" && "Monthly Marketing Budget & Priority Channels"}
                {selectedToolId === "customer-msg" && "Key Information to Convey (Order ID, terms, discount)"}
                {selectedToolId === "tagline-gen" && "Target Customer & Emotion (Confidence, Elegance, Speed)"}
                {selectedToolId === "competitor-analysis" && "Pricing Tier & Market Region"}
                {selectedToolId === "prod-desc" && "Target Buyer Type (B2B Wholesaler vs Direct Consumer)"}
                {selectedToolId === "idea-gen" && "Starting Capital Budget Range"}
              </label>
              <input
                type="text"
                value={inputField2}
                onChange={(e) => setInputField2(e.target.value)}
                placeholder="e.g. Eco-conscious, high-grade, fast turnaround..."
                className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 p-2.5 text-white outline-none focus:border-emerald-400"
              />
            </div>
          </div>
        )}

        <button
          id="run-business-tool-btn"
          onClick={handleRunTool}
          disabled={isLoading || !inputField1.trim()}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-95 transition-all disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Generating Commercial Blueprint...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Generate {getToolMeta().name}</span>
            </>
          )}
        </button>
      </div>

      {/* Error Alert Banner */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-950/70 border border-rose-500/50 text-rose-200 backdrop-blur-xl space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>Commercial Strategy Unavailable</span>
          </div>
          <p className="text-xs text-rose-200/90 leading-relaxed">
            {errorMessage}
          </p>
          <button
            onClick={handleRunTool}
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-900/80 hover:bg-rose-800 text-white text-xs font-semibold border border-rose-700 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Operation</span>
          </button>
        </div>
      )}

      {/* Result Output Card */}
      {resultText && (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-emerald-500/40 backdrop-blur-xl shadow-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="font-bold text-sm text-white">{getToolMeta().name} Report</h3>
                <span className="text-[10px] text-emerald-300 font-medium">{inputField1}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleCopy}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-emerald-400" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
              <button
                onClick={handleSave}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border ${
                  hasSaved
                    ? "bg-emerald-950 text-emerald-300 border-emerald-700"
                    : "bg-teal-950 hover:bg-teal-900 text-teal-300 border-teal-700"
                }`}
              >
                <BookmarkCheck className="w-3.5 h-3.5" />
                <span>{hasSaved ? "Saved" : "Save"}</span>
              </button>
            </div>
          </div>

          <div className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-sans space-y-3">
            {resultText}
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from "react";
import { 
  Globe2, 
  Send, 
  Copy, 
  BookmarkCheck, 
  FileText, 
  CheckSquare, 
  Mail, 
  Search, 
  ShieldAlert, 
  Loader2,
  Package,
  Layers,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  AlertCircle,
  RefreshCw,
  Check,
  ShieldCheck,
  Truck,
  CreditCard,
  FileCheck2,
  HelpCircle
} from "lucide-react";
import { SavedItem, ExportAnalysisResult } from "../types";

interface ExportViewProps {
  onSaveItem: (item: Omit<SavedItem, "id" | "createdAt">) => void;
}

export const ExportView: React.FC<ExportViewProps> = ({ onSaveItem }) => {
  const [activeSubTool, setActiveSubTool] = useState<
    "opportunities" | "buyer-message" | "product-description" | "checklist" | "country-research" | "quotation-draft"
  >("opportunities");

  // Form states matching user requirements
  const [productName, setProductName] = useState("Handmade Ceramic & Brass Decor");
  const [productCategory, setProductCategory] = useState("Artisan Home Decor & Handicrafts");
  const [originCountry, setOriginCountry] = useState("India");
  const [targetCountry, setTargetCountry] = useState("United States");
  const [buyerType, setBuyerType] = useState("B2B Wholesalers & Specialty Home Decor Importers");
  const [businessSize, setBusinessSize] = useState("Small Artisan Exporter (10-25 Artisans)");
  const [specificQuestion, setSpecificQuestion] = useState("Incoterms FOB vs CIF, LC at sight payment terms, and seaworthy packaging requirements");
  const [budget, setBudget] = useState("$5,000 - $15,000");
  const [quantity, setQuantity] = useState("500 Units / Month");
  const [businessType, setBusinessType] = useState("Manufacturer / Artisan Exporter");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [exportData, setExportData] = useState<ExportAnalysisResult | null>(null);
  const [resultContent, setResultContent] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Interactive checklist state
  const [checklistItems, setChecklistItems] = useState([
    { id: 1, title: "Obtain Import Export Code (IEC / EORI)", detail: "Mandatory alphanumeric license issued by DGFT / customs for foreign shipments.", checked: true },
    { id: 2, title: "Determine 6-8 digit HS Tariff Classification", detail: "Harmonized System chapter classification - Needs verification with the relevant official authority.", checked: true },
    { id: 3, title: "Register with Export Promotion Council (RCMC)", detail: "Provides access to bilateral trade benefits, vetted buyer delegations, and export duty draw-backs.", checked: false },
    { id: 4, title: "Quality & Regulatory Compliance Certification", detail: "Ensure lab compliance with FDA, CE mark, REACH, or Prop 65 depending on material - Needs verification with official authority.", checked: false },
    { id: 5, title: "Formal Proforma Invoice with Standard Incoterms", detail: "State FOB/CIF pricing, payment terms (LC or Advance TT), lead time, and port of lading.", checked: false },
    { id: 6, title: "Export Packaging & Drop-Test Certification", detail: "5-ply corrugated seaworthy packaging with moisture barrier and ISPM-15 treated wooden pallets.", checked: false },
    { id: 7, title: "Engage Freight Forwarder & Customs Broker (CHA)", detail: "Book air cargo or 20ft/40ft container space and arrange Shipping Bill filing at port.", checked: false },
    { id: 8, title: "Certificate of Origin & Marine Cargo Insurance", detail: "Non-preferential or preferential Chamber certificate and Institute Cargo Clauses coverage.", checked: false },
  ]);

  const toggleChecklist = (id: number) => {
    setChecklistItems(prev => prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  };

  const handleRunExportAction = async (forcedTool?: string) => {
    if (!productName.trim()) {
      setErrorMessage("Please enter a product name before running export analysis.");
      return;
    }

    const toolToRun = forcedTool || activeSubTool;
    setIsLoading(true);
    setErrorMessage(null);
    setResultContent(null);
    setExportData(null);
    setSaved(false);

    try {
      const res = await fetch("/api/ai/export", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          productName: productName.trim(),
          productCategory: productCategory.trim(),
          originCountry: originCountry.trim(),
          targetCountry: targetCountry.trim(),
          buyerType: buyerType.trim(),
          businessSize: businessSize.trim(),
          specificQuestion: specificQuestion.trim(),
          budget: budget.trim(),
          quantity: quantity.trim(),
          businessType: businessType.trim(),
          subTool: toolToRun,
        }),
      });

      // Defensive check: Verify response content-type before parsing JSON to prevent HTML parsing errors
      const contentTypeHeader = res.headers.get("content-type") || "";
      if (!contentTypeHeader.includes("application/json")) {
        const rawText = await res.text();
        const snippet = rawText.slice(0, 100).replace(/<[^>]*>/g, "").trim();
        throw new Error(
          `The server returned a non-JSON response (HTTP ${res.status}). ${
            snippet ? `Detail: "${snippet}"` : "The export intelligence API may be temporarily unreachable."
          }`
        );
      }

      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.error || `Export intelligence analysis failed (HTTP ${res.status}).`);
      }

      const payload = data.data || data;
      setExportData(payload);
      setResultContent(payload.content || data.content || "Report generated successfully.");
    } catch (err: unknown) {
      console.error("Export Action Error:", err);
      const msg = err instanceof Error ? err.message : "Failed to generate export strategy.";
      setErrorMessage(msg);
      setResultContent(null);
      setExportData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!resultContent) return;
    navigator.clipboard.writeText(resultContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopySpecific = (text: string, sectionKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionKey);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleSave = () => {
    if (!resultContent || saved) return;
    onSaveItem({
      type: "export",
      title: `Export: ${productName} (${originCountry} → ${targetCountry})`,
      summary: `Sub-tool: ${activeSubTool}. Size: ${businessSize}. Customer: ${buyerType}.`,
      content: resultContent,
      category: "Export Research",
      tags: [productName, originCountry, targetCountry, "Export"],
    });
    setSaved(true);
  };

  return (
    <div className="space-y-5 pb-6">
      {/* Title banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/60 via-slate-900/80 to-indigo-950/60 border border-blue-500/30 backdrop-blur-xl">
        <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider mb-1">
          <Globe2 className="w-4 h-4" />
          <span>Global Trade & Export Gateway</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-white">
          Export Intelligence Dashboard
        </h1>
        <p className="text-xs text-slate-300 mt-1">
          Analyze international market suitability, review Incoterms & documentation, and draft compliant buyer outreach without fictional data.
        </p>
      </div>

      {/* Sub-tool navigation tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: "opportunities", label: "Market Suitability", icon: TrendingUp },
          { id: "buyer-message", label: "Buyer Message", icon: Mail },
          { id: "product-description", label: "Product Spec Sheet", icon: FileText },
          { id: "checklist", label: "Export Checklist", icon: CheckSquare },
          { id: "country-research", label: "Country & Tariffs", icon: Search },
          { id: "quotation-draft", label: "Quotation & Logistics", icon: DollarSign },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTool === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveSubTool(tab.id as typeof activeSubTool);
                if (tab.id !== "checklist") {
                  handleRunExportAction(tab.id);
                }
              }}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all border shrink-0 ${
                isActive
                  ? "bg-blue-600/30 text-blue-200 border-blue-500/60 shadow-lg shadow-blue-500/10"
                  : "bg-slate-900/60 text-slate-400 hover:text-slate-200 border-slate-800"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Interactive Export Checklist View */}
      {activeSubTool === "checklist" ? (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-cyan-400" />
                <span>Export Compliance & Readiness Checklist</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {checklistItems.filter(i => i.checked).length} of {checklistItems.length} steps completed
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
                {Math.round((checklistItems.filter(i => i.checked).length / checklistItems.length) * 100)}% Ready
              </span>
            </div>
          </div>

          <div className="space-y-2.5">
            {checklistItems.map((item) => (
              <div
                key={item.id}
                onClick={() => toggleChecklist(item.id)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                  item.checked
                    ? "bg-cyan-950/20 border-cyan-800/40 text-slate-200"
                    : "bg-slate-950/60 border-slate-800/80 hover:border-slate-700 text-slate-300"
                }`}
              >
                <div className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                  item.checked ? "bg-cyan-500 border-cyan-400 text-slate-950" : "border-slate-600 bg-slate-900"
                }`}>
                  {item.checked && <CheckSquare className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
                <div>
                  <h4 className={`text-xs sm:text-sm font-semibold ${item.checked ? "line-through text-slate-400" : "text-white"}`}>
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    {item.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => handleRunExportAction("checklist")}
            disabled={isLoading || !productName.trim()}
            className="w-full py-2.5 rounded-xl bg-blue-600/30 hover:bg-blue-600/40 text-blue-200 border border-blue-500/40 text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating Deep Country Compliance Briefing...</span>
              </>
            ) : (
              <>
                <span>Generate Deep Country-Specific Customs Checklist</span>
                <ArrowUpRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      ) : (
        /* Export Input Parameters Form */
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-400" />
              <span>Target Export Trade Parameters</span>
            </h2>
            <span className="text-[11px] text-slate-400 font-mono">Real Trade Intelligence</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Product Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g. Handmade Ceramic Tableware, Organic Turmeric..."
                className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 focus:border-blue-400 p-2.5 text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Product Category</label>
              <input
                type="text"
                value={productCategory}
                onChange={(e) => setProductCategory(e.target.value)}
                placeholder="e.g. Home Decor & Artisan Goods, Agricultural, Textiles..."
                className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 focus:border-blue-400 p-2.5 text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Country of Origin</label>
              <input
                type="text"
                value={originCountry}
                onChange={(e) => setOriginCountry(e.target.value)}
                placeholder="e.g. India, Vietnam, Bangladesh, Mexico..."
                className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 focus:border-blue-400 p-2.5 text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Target Destination Country</label>
              <input
                type="text"
                value={targetCountry}
                onChange={(e) => setTargetCountry(e.target.value)}
                placeholder="e.g. United States, Germany, UAE, Japan..."
                className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 focus:border-blue-400 p-2.5 text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Target Customer / Buyer Type</label>
              <input
                type="text"
                value={buyerType}
                onChange={(e) => setBuyerType(e.target.value)}
                placeholder="e.g. B2B Wholesalers, Department Store Importers, Direct Retailers..."
                className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 focus:border-blue-400 p-2.5 text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Business Size & Capacity</label>
              <input
                type="text"
                value={businessSize}
                onChange={(e) => setBusinessSize(e.target.value)}
                placeholder="e.g. Small Artisan Studio (5-20), Mid-size Producer (50+ staff)..."
                className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 focus:border-blue-400 p-2.5 text-white outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-slate-300 font-medium mb-1 flex items-center justify-between">
                <span>Specific Export Question or Inquiries</span>
                <span className="text-[10px] text-slate-400">Optional</span>
              </label>
              <input
                type="text"
                value={specificQuestion}
                onChange={(e) => setSpecificQuestion(e.target.value)}
                placeholder="e.g. Incoterms FOB vs CIF, LC payment security, and sea packaging standards..."
                className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 focus:border-blue-400 p-2.5 text-white outline-none"
              />
            </div>
          </div>

          <button
            id="find-export-opportunities-btn"
            onClick={() => handleRunExportAction()}
            disabled={isLoading || !productName.trim()}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Synthesizing International Trade Intelligence...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>
                  {activeSubTool === "opportunities" && "Analyze Market Suitability & Opportunities"}
                  {activeSubTool === "buyer-message" && "Generate Compliant Buyer Outreach Message"}
                  {activeSubTool === "product-description" && "Generate Export Product Spec Sheet"}
                  {activeSubTool === "country-research" && "Research Destination Country & Tariffs"}
                  {activeSubTool === "quotation-draft" && "Generate Formal Export Quotation & Logistics"}
                </span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Error Alert Banner */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-950/70 border border-rose-500/50 text-rose-200 backdrop-blur-xl space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>Export Intelligence Notice</span>
          </div>
          <p className="text-xs text-rose-200/90 leading-relaxed">
            {errorMessage}
          </p>
          <button
            onClick={() => handleRunExportAction()}
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-900/80 hover:bg-rose-800 text-white text-xs font-semibold border border-rose-700 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Action</span>
          </button>
        </div>
      )}

      {/* Results View Card */}
      {resultContent && (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-blue-500/40 backdrop-blur-xl shadow-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              <div>
                <h3 className="font-bold text-sm text-white">
                  Trade Analysis & Export Strategy
                </h3>
                <span className="text-[10px] text-blue-300 font-medium">
                  {productName} • {originCountry} → {targetCountry}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleCopy}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-blue-400" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
              <button
                onClick={handleSave}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border ${
                  saved
                    ? "bg-emerald-950 text-emerald-300 border-emerald-700"
                    : "bg-blue-950 hover:bg-blue-900 text-blue-300 border-blue-700"
                }`}
              >
                <BookmarkCheck className="w-3.5 h-3.5" />
                <span>{saved ? "Saved" : "Save"}</span>
              </button>
            </div>
          </div>

          {/* Mandatory Verification Badge */}
          <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 flex items-start gap-2.5 text-xs text-amber-200">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold uppercase tracking-wider text-[11px] block">Official Authority Notice:</span>
              <p className="text-[11px] text-amber-200/90 leading-relaxed mt-0.5">
                Needs verification with the relevant official authority. Tariffs, customs rules, and import permits vary by bilateral trade pacts and change periodically.
              </p>
            </div>
          </div>

          {/* Structured Intelligence Highlights if available */}
          {exportData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {/* HS Code Guidance */}
              {exportData.hsCodeGuidance && (
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-cyan-400 font-semibold text-[11px] uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5" />
                      HS-Code Research Guidance
                    </span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">{exportData.hsCodeGuidance}</p>
                  <span className="text-[10px] text-amber-400 font-mono block">Needs verification with the relevant official authority.</span>
                </div>
              )}

              {/* Incoterms Guidance */}
              {exportData.incotermsGuidance && (
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-blue-400 font-semibold text-[11px] uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Incoterms (Risk & Freight Allocation)
                    </span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">{exportData.incotermsGuidance}</p>
                </div>
              )}

              {/* Payment Guidance */}
              {exportData.paymentGuidance && (
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-emerald-400 font-semibold text-[11px] uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5" />
                      Secure Payment Methods
                    </span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">{exportData.paymentGuidance}</p>
                </div>
              )}

              {/* Logistics & Packaging */}
              {exportData.logisticsPackaging && (
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-purple-400 font-semibold text-[11px] uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5" />
                      Seaworthy Packaging & Logistics
                    </span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">{exportData.logisticsPackaging}</p>
                </div>
              )}

              {/* Required Documents */}
              {exportData.requiredDocuments && exportData.requiredDocuments.length > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5 md:col-span-2">
                  <div className="flex items-center justify-between text-indigo-400 font-semibold text-[11px] uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <FileCheck2 className="w-3.5 h-3.5" />
                      Required Export Shipping Documents
                    </span>
                  </div>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-slate-300">
                    {exportData.requiredDocuments.map((doc, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <CheckSquare className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                        <span>{doc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Buyer Outreach Draft */}
              {exportData.buyerOutreachDraft && (
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <span className="text-cyan-400 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" />
                      Compliant B2B Buyer Outreach Draft
                    </span>
                    <button
                      onClick={() => handleCopySpecific(exportData.buyerOutreachDraft || "", "outreach")}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 text-[11px]"
                    >
                      {copiedSection === "outreach" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSection === "outreach" ? "Copied" : "Copy Draft"}</span>
                    </button>
                  </div>
                  <div className="text-slate-200 whitespace-pre-wrap leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
                    {exportData.buyerOutreachDraft}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Full Briefing / Text Content */}
          <div className="pt-2 border-t border-slate-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Comprehensive Strategic Briefing
            </span>
            <div className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-sans space-y-3">
              {resultContent}
            </div>
          </div>

          {/* Transparent Research Disclaimer */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <p>
              <strong>Data Accuracy Notice:</strong> Market feasibility and trade insights are generated for strategic planning. We do not invent fictional buyers, fake contact details, or guaranteed prices. Needs verification with the relevant official authority for real-time customs tariffs, quarantine rules, and bi-lateral licenses.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};


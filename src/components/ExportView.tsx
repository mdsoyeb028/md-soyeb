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
  ArrowUpRight
} from "lucide-react";
import { SavedItem } from "../types";

interface ExportViewProps {
  onSaveItem: (item: Omit<SavedItem, "id" | "createdAt">) => void;
}

export const ExportView: React.FC<ExportViewProps> = ({ onSaveItem }) => {
  const [activeSubTool, setActiveSubTool] = useState<"opportunities" | "buyer-message" | "product-description" | "checklist" | "country-research">("opportunities");

  // Form states
  const [productName, setProductName] = useState("Handmade Brass Handicrafts");
  const [productCategory, setProductCategory] = useState("Home Decor & Artisan Goods");
  const [targetCountry, setTargetCountry] = useState("United States");
  const [budget, setBudget] = useState("$5,000 - $15,000");
  const [quantity, setQuantity] = useState("500 Units / Month");
  const [businessType, setBusinessType] = useState("Manufacturer / Artisan Exporter");

  const [isLoading, setIsLoading] = useState(false);
  const [resultContent, setResultContent] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  // Interactive checklist state
  const [checklistItems, setChecklistItems] = useState([
    { id: 1, title: "Obtain Import Export Code (IEC / EORI)", detail: "Mandatory alphanumeric license issued by DGFT / customs for foreign shipments.", checked: true },
    { id: 2, title: "Determine 6-8 digit HS Tariff Classification", detail: "Correct Harmonized System code determines duty rates and import permits in destination country.", checked: true },
    { id: 3, title: "Register with Export Promotion Council (RCMC)", detail: "Provides access to bilateral trade benefits, vetted buyer delegations, and export duty draw-backs.", checked: false },
    { id: 4, title: "Quality & Regulatory Compliance Certification", detail: "Ensure lab compliance with FDA, CE mark, REACH, or FSC depending on product material.", checked: false },
    { id: 5, title: "Formal Proforma Invoice with Standard Incoterms", detail: "State FOB/CIF pricing, payment terms (LC or Advance TT), lead time, and port of lading.", checked: false },
    { id: 6, title: "Export Packaging & Drop-Test Certification", detail: "5-ply corrugated seaworthy packaging with moisture barrier and international shipping marks.", checked: false },
    { id: 7, title: "Engage Freight Forwarder & Customs Broker (CHA)", detail: "Book air cargo or 20ft/40ft container space and arrange Shipping Bill filing at port.", checked: false },
    { id: 8, title: "Certificate of Origin & Marine Cargo Insurance", detail: "Non-preferential or preferential Chamber certificate and Institute Cargo Clauses coverage.", checked: false },
  ]);

  const toggleChecklist = (id: number) => {
    setChecklistItems(prev => prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  };

  const handleRunExportAction = async (forcedTool?: string) => {
    const toolToRun = forcedTool || activeSubTool;
    setIsLoading(true);
    setResultContent(null);
    setSaved(false);

    try {
      const res = await fetch("/api/ai/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName,
          productCategory,
          targetCountry,
          budget,
          quantity,
          businessType,
          subTool: toolToRun,
        }),
      });

      if (!res.ok) throw new Error("Export engine call failed");
      const data = await res.json();
      setResultContent(data.content || "Report generated successfully.");
    } catch (err) {
      console.error(err);
      setResultContent("Network error. Please try generating your export research again.");
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

  const handleSave = () => {
    if (!resultContent || saved) return;
    onSaveItem({
      type: "export",
      title: `Export: ${productName} → ${targetCountry}`,
      summary: `Sub-tool: ${activeSubTool}. Business: ${businessType}, Budget: ${budget}.`,
      content: resultContent,
      category: "Export Research",
      tags: [productName, targetCountry, "Export"],
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
          Analyze international market demand, draft B2B buyer inquiries, and review shipping documentation checklists.
        </p>
      </div>

      {/* Sub-tool navigation tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: "opportunities", label: "Market Opportunities", icon: TrendingUp },
          { id: "buyer-message", label: "Buyer Message", icon: Mail },
          { id: "product-description", label: "Product Spec Sheet", icon: FileText },
          { id: "checklist", label: "Export Checklist", icon: CheckSquare },
          { id: "country-research", label: "Country Research", icon: Search },
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
            onClick={() => handleRunExportAction("export-checklist")}
            className="w-full py-2.5 rounded-xl bg-blue-600/30 hover:bg-blue-600/40 text-blue-200 border border-blue-500/40 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <span>Generate Deep Country-Specific Customs Checklist</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        /* Export Input Parameters Form */
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-400" />
            <span>Target Export Trade Parameters</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Product Name</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g. Ceramic Tableware, Organic Spices..."
                className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 focus:border-blue-400 p-2.5 text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Product Category</label>
              <input
                type="text"
                value={productCategory}
                onChange={(e) => setProductCategory(e.target.value)}
                placeholder="e.g. Home Decor, Agricultural, Textiles..."
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
              <label className="block text-slate-300 font-medium mb-1">Estimated Trade Budget</label>
              <input
                type="text"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="e.g. $5,000 - $15,000"
                className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 focus:border-blue-400 p-2.5 text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Supply Capacity / Quantity</label>
              <input
                type="text"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 500 Pieces, 1 Container (20ft)..."
                className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 focus:border-blue-400 p-2.5 text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Business Setup / Type</label>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 focus:border-blue-400 p-2.5 text-white outline-none"
              >
                <option value="Manufacturer / Direct Producer">Manufacturer / Direct Producer</option>
                <option value="Merchant Exporter / Trader">Merchant Exporter / Trader</option>
                <option value="Artisan Cooperative / Craft Studio">Artisan Cooperative / Craft Studio</option>
                <option value="Early-Stage Startup / Brand Owner">Early-Stage Startup / Brand Owner</option>
              </select>
            </div>
          </div>

          <button
            id="find-export-opportunities-btn"
            onClick={() => handleRunExportAction()}
            disabled={isLoading || !productName.trim()}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all active:scale-95 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analyzing Global Trade Data...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>
                  {activeSubTool === "opportunities" && "Find Export Opportunities"}
                  {activeSubTool === "buyer-message" && "Generate Buyer Message"}
                  {activeSubTool === "product-description" && "Create Product Description"}
                  {activeSubTool === "country-research" && "Research Target Country"}
                </span>
              </>
            )}
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
                  {productName} • Destination: {targetCountry}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleCopy}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700"
              >
                <Copy className="w-3.5 h-3.5 text-blue-400" />
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

          <div className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-sans space-y-3">
            {resultContent}
          </div>

          {/* Transparent Research Disclaimer */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <p>
              <strong>Data Accuracy Notice:</strong> Market feasibility and trade insights are generated for strategic planning. We do not invent fictional buyers or guaranteed prices. Always check real-time HS tariffs on official national trade portals (e.g. US ITC, EU TARIC, or India Trade Portal).
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

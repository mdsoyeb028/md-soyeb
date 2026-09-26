import React, { useState } from "react";
import { User } from "firebase/auth";
import { 
  Bookmark, 
  Search, 
  Copy, 
  Trash2, 
  Download, 
  ExternalLink, 
  Check, 
  FolderPlus, 
  Globe2, 
  Calendar, 
  Briefcase, 
  SearchCode, 
  Smartphone, 
  Sparkles, 
  LogIn, 
  LogOut, 
  ShieldCheck, 
  AlertCircle, 
  Loader2, 
  FileText,
  Zap
} from "lucide-react";
import { SavedItem, ActiveTab } from "../types";
import { useLanguage } from "../i18n/LanguageContext";

interface DashboardViewProps {
  savedItems: SavedItem[];
  user: User | null;
  isLoading?: boolean;
  error?: string | null;
  onDeleteItem: (id: string) => Promise<void> | void;
  onSignIn?: () => Promise<void> | void;
  onSignOut?: () => Promise<void> | void;
  setActiveTab?: (tab: ActiveTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ 
  savedItems, 
  user,
  isLoading = false,
  error = null,
  onDeleteItem,
  onSignIn,
  onSignOut,
  setActiveTab
}) => {
  const { t } = useLanguage();
  const [selectedType, setSelectedType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeItemModal, setActiveItemModal] = useState<SavedItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Real Calculated Metrics (Zero fake/mock numbers)
  const totalReports = savedItems.length;
  const problemSolverReports = savedItems.filter((i) => 
    i.type === "assistant" || 
    i.type === "ai-assistant" || 
    i.category?.includes("Problem Solver") || 
    i.tags?.includes("Problem Solver") ||
    i.tags?.includes("7-Day Action Plan")
  ).length;
  const seoReports = savedItems.filter((i) => i.type === "seo").length;
  const socialReports = savedItems.filter((i) => i.type === "social").length;
  const exportReports = savedItems.filter((i) => i.type === "export").length;
  const businessReports = savedItems.filter((i) => i.type === "business").length;

  const typeFilters = [
    { id: "all", label: `${t("dashboard.filterAll", "All Reports")} (${totalReports})` },
    { id: "problem_solver", label: `⚡ Problem Solvers (${problemSolverReports})` },
    { id: "seo", label: `${t("dashboard.filterSeo", "SEO")} (${seoReports})` },
    { id: "social", label: `${t("dashboard.filterSocial", "Social")} (${socialReports})` },
    { id: "export", label: `${t("dashboard.filterExport", "Export")} (${exportReports})` },
    { id: "business", label: `${t("dashboard.filterBusiness", "Business Strategy")} (${businessReports})` },
  ];

  const filteredItems = savedItems.filter((item) => {
    const isProblemSolver = 
      item.type === "assistant" || 
      item.type === "ai-assistant" || 
      item.category?.includes("Problem Solver") || 
      item.tags?.includes("Problem Solver") ||
      item.tags?.includes("7-Day Action Plan");

    const matchesType = 
      selectedType === "all" || 
      (selectedType === "problem_solver" && isProblemSolver) ||
      (selectedType === item.type && !isProblemSolver) ||
      (selectedType === "business" && item.type === "business");

    const queryLower = searchQuery.toLowerCase();
    const matchesSearch = 
      !searchQuery.trim() ||
      item.title.toLowerCase().includes(queryLower) ||
      (item.summary && item.summary.toLowerCase().includes(queryLower)) ||
      (typeof item.content === "string" && item.content.toLowerCase().includes(queryLower)) ||
      (item.tags && item.tags.some((t) => t.toLowerCase().includes(queryLower)));

    return matchesType && matchesSearch;
  });

  const handleCopy = (item: SavedItem) => {
    const textToCopy = typeof item.content === "string" ? item.content : JSON.stringify(item.content, null, 2);
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = (item: SavedItem) => {
    const textContent = `# ${item.title}\nType: ${item.type.toUpperCase()}\nCategory: ${item.category || item.type}\nSaved Date: ${new Date(item.createdAt).toLocaleString()}\n\n---\n\n${
      typeof item.content === "string" ? item.content : JSON.stringify(item.content, null, 2)
    }`;
    const blob = new Blob([textContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${item.title.toLowerCase().replace(/[^a-z0-9]/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDeleteItem(id);
      if (activeItemModal?.id === id) {
        setActiveItemModal(null);
      }
    } finally {
      setDeletingId(null);
    }
  };

  const getTypeIcon = (type: string, category?: string) => {
    if (type === "assistant" || type === "ai-assistant" || category?.includes("Problem Solver")) {
      return <Zap className="w-3.5 h-3.5 text-amber-400" />;
    }
    switch (type) {
      case "seo":
        return <SearchCode className="w-3.5 h-3.5 text-cyan-400" />;
      case "social":
        return <Smartphone className="w-3.5 h-3.5 text-pink-400" />;
      case "export":
        return <Globe2 className="w-3.5 h-3.5 text-blue-400" />;
      default:
        return <Briefcase className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  return (
    <div className="space-y-5 pb-6">
      {/* 1. Header Banner & Auth Status */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-cyan-950/60 via-slate-900/80 to-purple-950/60 border border-cyan-500/30 backdrop-blur-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Bookmark className="w-4 h-4" />
              <span>Cloud Firestore Trade Vault</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              Client Reports & Growth Intelligence
            </h1>
            <p className="text-xs text-slate-300 mt-1">
              {user 
                ? `Signed in as ${user.email}. All reports are securely stored in your private Firestore collection.` 
                : "Sign in with Google to protect and sync your reports across devices in Cloud Firestore."}
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-700/80 rounded-xl p-1.5 pr-3">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || "User"} className="w-7 h-7 rounded-lg" />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-cyan-600 flex items-center justify-center font-bold text-xs text-white">
                    {user.email ? user.email[0].toUpperCase() : "U"}
                  </div>
                )}
                <div className="text-left hidden xs:block">
                  <div className="text-[11px] font-bold text-white leading-tight">
                    {user.displayName || user.email?.split("@")[0]}
                  </div>
                  <div className="text-[9px] text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-2.5 h-2.5" />
                    <span>Cloud Sync Active</span>
                  </div>
                </div>
                {onSignOut && (
                  <button
                    onClick={() => onSignOut()}
                    title="Sign Out"
                    className="ml-1 p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : onSignIn ? (
              <button
                onClick={() => onSignIn()}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In with Google</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* Real Statistics Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-800/80">
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Reports</span>
            <span className="text-lg font-extrabold text-white mt-0.5 block">{totalReports}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
            <span className="text-[10px] uppercase font-bold text-cyan-400 block">SEO Reports</span>
            <span className="text-lg font-extrabold text-cyan-300 mt-0.5 block">{seoReports}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
            <span className="text-[10px] uppercase font-bold text-pink-400 block">Social Reports</span>
            <span className="text-lg font-extrabold text-pink-300 mt-0.5 block">{socialReports}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
            <span className="text-[10px] uppercase font-bold text-blue-400 block">Export Reports</span>
            <span className="text-lg font-extrabold text-blue-300 mt-0.5 block">{exportReports}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center col-span-2 sm:col-span-1">
            <span className="text-[10px] uppercase font-bold text-emerald-400 block">Business Reports</span>
            <span className="text-lg font-extrabold text-emerald-300 mt-0.5 block">{businessReports}</span>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-200 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* 2. Search & Type Filters */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reports by title, keyword, or summary..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/80 focus:border-cyan-400 text-white text-xs sm:text-sm outline-none backdrop-blur-md"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {typeFilters.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedType(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border shrink-0 cursor-pointer ${
                selectedType === tab.id
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/60 shadow-md shadow-cyan-500/10"
                  : "bg-slate-900/60 text-slate-400 hover:text-slate-200 border-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Loading State */}
      {isLoading ? (
        <div className="p-10 text-center rounded-2xl bg-slate-900/40 border border-slate-800 space-y-2.5">
          <Loader2 className="w-8 h-8 mx-auto text-cyan-400 animate-spin" />
          <p className="text-xs text-slate-300 font-medium">Syncing with Cloud Firestore...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        /* 4. Empty State */
        <div className="p-8 sm:p-10 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400 space-y-3">
          <FolderPlus className="w-10 h-10 mx-auto text-slate-600" />
          <div>
            <h3 className="text-base font-bold text-slate-200">No reports yet</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
              {searchQuery
                ? `No reports match your search query "${searchQuery}".`
                : "You don't have any saved reports yet. Run an SEO audit, social media plan, export analysis, or ask the AI assistant, then click 'Save' to securely store your reports here."}
            </p>
          </div>
          {setActiveTab && (
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              <button
                onClick={() => setActiveTab("seo")}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
              >
                Run SEO Audit
              </button>
              <button
                onClick={() => setActiveTab("export")}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-300 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
              >
                Analyze Export Market
              </button>
              <button
                onClick={() => setActiveTab("social")}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-pink-300 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
              >
                Plan Social Content
              </button>
            </div>
          )}
        </div>
      ) : (
        /* 5. Real Reports List */
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-slate-900/70 hover:bg-slate-900/90 border border-slate-800 hover:border-slate-700 backdrop-blur-xl transition-all shadow-lg space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 pr-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                      {getTypeIcon(item.type, item.category)}
                      <span>{item.category || item.type}</span>
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(item.createdAt).toLocaleDateString()} at {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h3 
                    onClick={() => setActiveItemModal(item)}
                    className="text-sm font-bold text-white hover:text-cyan-300 transition-colors cursor-pointer"
                  >
                    {item.title}
                  </h3>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleCopy(item)}
                    title="Copy full report content"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer"
                  >
                    {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={() => handleDownload(item)}
                    title="Download as Markdown"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
                    title="Delete report"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {deletingId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {item.summary && (
                <p className="text-xs text-slate-300 line-clamp-2">
                  {item.summary}
                </p>
              )}

              {item.tags && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {item.tags.map((tag, i) => (
                    <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <button
                onClick={() => setActiveItemModal(item)}
                className="text-xs text-cyan-400 font-semibold hover:underline flex items-center gap-1 pt-1 cursor-pointer"
              >
                <span>View Full Strategic Document</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 6. View Report Full Modal */}
      {activeItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-xl max-h-[85vh] flex flex-col rounded-2xl bg-slate-900 border border-cyan-500/50 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex-1 pr-3">
                <span className="text-[10px] text-cyan-400 uppercase font-bold tracking-wider inline-flex items-center gap-1">
                  {getTypeIcon(activeItemModal.type, activeItemModal.category)}
                  <span>{activeItemModal.category || activeItemModal.type}</span>
                </span>
                <h3 className="font-bold text-sm sm:text-base text-white">
                  {activeItemModal.title}
                </h3>
              </div>
              <button
                onClick={() => setActiveItemModal(null)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* Input Context if available */}
            {activeItemModal.context && (
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 space-y-1">
                <span className="text-[10px] uppercase font-bold text-cyan-400 block">Inquiry / Context:</span>
                <p>{activeItemModal.context}</p>
              </div>
            )}

            <div className="flex-1 overflow-y-auto pr-1 text-xs sm:text-sm text-slate-200 whitespace-pre-wrap font-sans leading-relaxed space-y-3">
              {typeof activeItemModal.content === "string"
                ? activeItemModal.content
                : JSON.stringify(activeItemModal.content, null, 2)}
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Created on {new Date(activeItemModal.createdAt).toLocaleString()}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(activeItemModal)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy All</span>
                </button>
                <button
                  onClick={() => handleDownload(activeItemModal)}
                  className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .md</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

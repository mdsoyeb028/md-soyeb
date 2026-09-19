import React, { useState } from "react";
import { 
  Bookmark, 
  Search, 
  Copy, 
  Trash2, 
  Download, 
  ExternalLink, 
  Check, 
  FileText, 
  FolderPlus,
  Globe2,
  Share2,
  Calendar,
  Briefcase
} from "lucide-react";
import { SavedItem } from "../types";

interface DashboardViewProps {
  savedItems: SavedItem[];
  onDeleteItem: (id: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ savedItems, onDeleteItem }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeItemModal, setActiveItemModal] = useState<SavedItem | null>(null);

  const categories = [
    { id: "all", label: "All Items" },
    { id: "Export Research", label: "Export Research" },
    { id: "SEO Report", label: "SEO Reports" },
    { id: "Social Media", label: "Social Calendar" },
    { id: "Business Strategy", label: "Business Tools" },
    { id: "AI Strategic Consultation", label: "AI Consultations" },
  ];

  const filteredItems = savedItems.filter((item) => {
    const matchesCat = selectedCategory === "all" || item.category === selectedCategory || item.type.includes(selectedCategory.toLowerCase());
    const matchesSearch = 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (typeof item.content === "string" && item.content.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const handleCopy = (item: SavedItem) => {
    const textToCopy = typeof item.content === "string" ? item.content : JSON.stringify(item.content, null, 2);
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = (item: SavedItem) => {
    const textContent = `# ${item.title}\nCategory: ${item.category || item.type}\nSaved Date: ${new Date(item.createdAt).toLocaleDateString()}\n\n---\n\n${
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

  return (
    <div className="space-y-5 pb-6">
      {/* Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/60 via-slate-900/80 to-purple-950/60 border border-cyan-500/30 backdrop-blur-xl">
        <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1">
          <Bookmark className="w-4 h-4" />
          <span>Client Trade Vault & Workspaces</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-white">
          Client Dashboard & Saved Work
        </h1>
        <p className="text-xs text-slate-300 mt-1">
          Revisit, copy, and export your market research, SEO audits, social calendars, and export roadmaps.
        </p>
      </div>

      {/* Search & Category Filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search saved reports, products, keywords..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/80 focus:border-cyan-400 text-white text-xs sm:text-sm outline-none backdrop-blur-md"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border shrink-0 ${
                selectedCategory === cat.id
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/60 shadow-md shadow-cyan-500/10"
                  : "bg-slate-900/60 text-slate-400 hover:text-slate-200 border-slate-800"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Items List */}
      {filteredItems.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400 space-y-2">
          <FolderPlus className="w-8 h-8 mx-auto text-slate-600" />
          <p className="text-sm font-semibold text-slate-300">No saved items found</p>
          <p className="text-xs text-slate-500">
            Generate an export analysis, SEO audit, or social plan and click "Save" to keep it here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-slate-900/70 hover:bg-slate-900/90 border border-slate-800 hover:border-slate-700 backdrop-blur-xl transition-all shadow-lg space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                      {item.category || item.type}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white hover:text-cyan-300 transition-colors cursor-pointer" onClick={() => setActiveItemModal(item)}>
                    {item.title}
                  </h3>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleCopy(item)}
                    title="Copy content"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 transition-colors"
                  >
                    {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={() => handleDownload(item)}
                    title="Download as Markdown"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onDeleteItem(item.id)}
                    title="Delete item"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-300 line-clamp-2">
                {item.summary}
              </p>

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
                className="text-xs text-cyan-400 font-semibold hover:underline flex items-center gap-1 pt-1"
              >
                <span>View Full Strategic Document</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Full Document Preview Modal */}
      {activeItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl bg-slate-900 border border-cyan-500/50 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] text-cyan-400 uppercase font-bold tracking-wider">
                  {activeItemModal.category || activeItemModal.type}
                </span>
                <h3 className="font-bold text-sm sm:text-base text-white">
                  {activeItemModal.title}
                </h3>
              </div>
              <button
                onClick={() => setActiveItemModal(null)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
              >
                Close
              </button>
            </div>

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
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy All</span>
                </button>
                <button
                  onClick={() => handleDownload(activeItemModal)}
                  className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold flex items-center gap-1.5"
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

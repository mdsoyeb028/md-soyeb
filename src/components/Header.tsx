import React from "react";
import { Globe, Bookmark, Sparkles } from "lucide-react";
import { ActiveTab } from "../types";

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  savedCount: number;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, savedCount }) => {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#070b16]/80 border-b border-slate-800/80 px-4 py-3 transition-colors">
      <div className="max-w-md mx-auto sm:max-w-2xl lg:max-w-4xl flex items-center justify-between gap-2">
        <button
          onClick={() => setActiveTab("home")}
          className="flex items-center gap-2.5 text-left group focus:outline-none"
          id="header-brand-btn"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-purple-600 p-[1px] shadow-lg shadow-cyan-900/30">
            <div className="w-full h-full rounded-[11px] bg-slate-950 flex items-center justify-center text-cyan-400 group-hover:text-cyan-300 transition-colors">
              <Globe className="w-5 h-5 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm sm:text-base tracking-tight text-white group-hover:text-cyan-300 transition-colors">
                GROWTH & EXPORT HUB
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/50">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium leading-none">
              Reach Customers • Go Global
            </p>
          </div>
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Saved Reports / Client Dashboard shortcut */}
          <button
            id="nav-saved-btn"
            onClick={() => setActiveTab("dashboard")}
            className={`relative p-2 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === "dashboard"
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm shadow-cyan-500/20"
                : "bg-slate-900/70 text-slate-300 hover:text-white border-slate-800 hover:border-slate-700"
            }`}
            title="Saved Reports"
          >
            <Bookmark className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Saved</span>
            {savedCount > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-cyan-500/30 text-cyan-300 border border-cyan-400/40">
                {savedCount}
              </span>
            )}
          </button>

          {/* Pricing Button */}
          <button
            id="nav-pricing-btn"
            onClick={() => setActiveTab("pricing")}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === "pricing"
                ? "bg-purple-600/30 text-purple-200 border-purple-400/60 shadow-sm shadow-purple-500/20"
                : "bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-purple-300 hover:text-white border-purple-500/30 hover:border-purple-400/60"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Plans</span>
          </button>
        </div>
      </div>
    </header>
  );
};

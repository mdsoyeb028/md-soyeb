import React from "react";
import { User } from "firebase/auth";
import { Globe, Bookmark, Sparkles, LogIn, LogOut, User as UserIcon } from "lucide-react";
import { ActiveTab } from "../types";

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  savedCount: number;
  user?: User | null;
  onSignIn?: () => void;
  onSignOut?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  activeTab, 
  setActiveTab, 
  savedCount,
  user,
  onSignIn,
  onSignOut
}) => {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#070b16]/80 border-b border-slate-800/80 px-4 py-3 transition-colors">
      <div className="max-w-md mx-auto sm:max-w-2xl lg:max-w-4xl flex items-center justify-between gap-2">
        <button
          onClick={() => setActiveTab("home")}
          className="flex items-center gap-2.5 text-left group focus:outline-none cursor-pointer"
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
            className={`relative p-2 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "dashboard"
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm shadow-cyan-500/20"
                : "bg-slate-900/70 text-slate-300 hover:text-white border-slate-800 hover:border-slate-700"
            }`}
            title="Saved Reports"
          >
            <Bookmark className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Saved</span>
            {savedCount > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-cyan-500/30 text-cyan-300 border border-cyan-400/40 font-bold">
                {savedCount}
              </span>
            )}
          </button>

          {/* Pricing Button */}
          <button
            id="nav-pricing-btn"
            onClick={() => setActiveTab("pricing")}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "pricing"
                ? "bg-purple-600/30 text-purple-200 border-purple-400/60 shadow-sm shadow-purple-500/20"
                : "bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-purple-300 hover:text-white border-purple-500/30 hover:border-purple-400/60"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Plans</span>
          </button>

          {/* Auth Button in Header */}
          {user ? (
            <button
              onClick={() => setActiveTab("dashboard")}
              title={`Signed in as ${user.email}`}
              className="flex items-center gap-1.5 p-1 sm:px-2 sm:py-1 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-xs text-slate-200 transition-colors cursor-pointer"
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || "User"} className="w-6 h-6 rounded-lg object-cover" />
              ) : (
                <div className="w-6 h-6 rounded-lg bg-cyan-600 flex items-center justify-center text-white text-[11px] font-bold">
                  {user.email ? user.email[0].toUpperCase() : "U"}
                </div>
              )}
              <span className="hidden md:inline max-w-[80px] truncate text-[11px] text-slate-300">
                {user.displayName?.split(" ")[0] || "Account"}
              </span>
            </button>
          ) : onSignIn ? (
            <button
              onClick={onSignIn}
              title="Sign in with Google"
              className="px-2.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
};

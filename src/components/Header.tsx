import React, { useState } from "react";
import { User } from "firebase/auth";
import { Bot, Sparkles, LogIn, Zap, Menu, X, ArrowRight, Shield, Layers } from "lucide-react";
import { ActiveTab } from "../types";
import { useCredits } from "../context/CreditsContext";

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  savedCount: number;
  user?: User | null;
  onSignIn?: () => void;
  onSignOut?: () => void;
  onCreateAgent?: () => void;
  onOpenTools?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  activeTab, 
  setActiveTab, 
  user,
  onSignIn,
  onSignOut,
  onCreateAgent,
  onOpenTools,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { 
    isAnonymous, 
    consultationsUsed, 
    plan, 
    dailyLimit, 
    creditsRemaining,
    openSignupModal,
    openStatusModal 
  } = useCredits();

  const handleNavClick = (tabOrAnchor: string) => {
    setMobileMenuOpen(false);
    if (tabOrAnchor === "how-it-works" || tabOrAnchor === "product" || tabOrAnchor === "capabilities") {
      if (activeTab !== "home") {
        setActiveTab("home");
        setTimeout(() => {
          const el = document.getElementById(tabOrAnchor);
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }, 150);
      } else {
        const el = document.getElementById(tabOrAnchor);
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }
    } else if (tabOrAnchor === "pricing") {
      setActiveTab("pricing");
    } else if (tabOrAnchor === "home") {
      setActiveTab("home");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleCreateAgentClick = () => {
    setMobileMenuOpen(false);
    if (onCreateAgent) {
      onCreateAgent();
    } else {
      setActiveTab("agent");
    }
  };

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#070b16]/85 border-b border-slate-800/80 px-4 sm:px-6 py-3 transition-colors">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        {/* Brand Logo: MD SOYEB AI */}
        <button
          onClick={() => handleNavClick("home")}
          className="flex items-center gap-2.5 text-left group focus:outline-none cursor-pointer"
          id="header-brand-btn"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-purple-600 p-[1px] shadow-md shadow-cyan-950/50 shrink-0">
            <div className="w-full h-full rounded-[11px] bg-slate-950 flex items-center justify-center text-cyan-400 group-hover:text-cyan-300 transition-colors">
              <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm sm:text-base tracking-tight text-white group-hover:text-cyan-300 transition-colors">
              MD SOYEB <span className="text-cyan-400">AI</span>
            </span>
            <span className="hidden sm:inline-block text-[10px] font-semibold tracking-wider px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/50">
              AGENT SAAS
            </span>
          </div>
        </button>

        {/* Minimal Desktop Navigation: Product • How it works • Pricing */}
        <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-slate-300">
          <button
            onClick={() => handleNavClick("product")}
            className="hover:text-white transition-colors cursor-pointer py-1"
          >
            Product
          </button>
          <button
            onClick={() => handleNavClick("how-it-works")}
            className="hover:text-white transition-colors cursor-pointer py-1"
          >
            How it works
          </button>
          <button
            onClick={() => handleNavClick("pricing")}
            className={`transition-colors cursor-pointer py-1 ${activeTab === "pricing" ? "text-cyan-400 font-bold" : "hover:text-white"}`}
          >
            Pricing
          </button>
          {onOpenTools && (
            <button
              onClick={onOpenTools}
              className={`flex items-center gap-1.5 transition-colors cursor-pointer py-1 px-2 rounded-lg ${
                activeTab !== "home" && activeTab !== "pricing"
                  ? "text-cyan-400 font-bold bg-slate-900 border border-cyan-500/30"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>All Tools & OS</span>
            </button>
          )}
        </nav>

        {/* Right side controls: Credits / Login / Create Agent */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Credit Tracker Pill */}
          <button
            type="button"
            onClick={isAnonymous && consultationsUsed >= 1 ? openSignupModal : openStatusModal}
            className={`hidden sm:flex px-2.5 py-1 rounded-xl text-xs font-semibold items-center gap-1.5 border transition-all cursor-pointer ${
              isAnonymous
                ? consultationsUsed === 0
                  ? "bg-purple-950/50 border-purple-500/30 text-purple-300 hover:bg-purple-900/50"
                  : "bg-rose-950/50 border-rose-500/30 text-rose-300 hover:bg-rose-900/50"
                : plan === "pro"
                ? "bg-emerald-950/50 border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/50"
                : creditsRemaining === 0
                ? "bg-rose-950/50 border-rose-500/30 text-rose-300 hover:bg-rose-900/50"
                : "bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700"
            }`}
            title="AI Credits Status"
          >
            <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="text-[11px] font-mono">
              {isAnonymous 
                ? (consultationsUsed === 0 ? "1 Free AI Agent" : "Sign Up")
                : plan === "pro" 
                ? "PRO Active" 
                : `${creditsRemaining}/${dailyLimit} Credits`
              }
            </span>
          </button>

          {/* User Sign In / Account */}
          {user ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveTab("dashboard")}
                title={`Signed in as ${user.email}`}
                className="flex items-center gap-1.5 p-1 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-xs text-slate-200 transition-colors cursor-pointer"
              >
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || "User"} className="w-5 h-5 rounded-md object-cover" />
                ) : (
                  <div className="w-5 h-5 rounded-md bg-cyan-600 flex items-center justify-center text-white text-[10px] font-bold">
                    {user.email ? user.email[0].toUpperCase() : "U"}
                  </div>
                )}
                <span className="hidden sm:inline max-w-[70px] truncate text-[11px] text-slate-300">
                  {user.displayName?.split(" ")[0] || "Account"}
                </span>
              </button>
            </div>
          ) : onSignIn ? (
            <button
              onClick={onSignIn}
              title="Sign In"
              className="text-slate-300 hover:text-white text-xs font-semibold px-2 py-1.5 cursor-pointer transition-colors"
            >
              Login
            </button>
          ) : null}

          {/* Primary CTA: Create Agent */}
          <button
            onClick={handleCreateAgentClick}
            id="header-create-agent-btn"
            className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Create Agent</span>
          </button>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-3 pt-3 border-t border-slate-800/80 flex flex-col gap-2 pb-2">
          {onOpenTools && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenTools();
              }}
              className="text-left px-3 py-2 rounded-lg text-sm text-cyan-300 font-semibold bg-cyan-950/40 border border-cyan-800/40 flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>All 25 Tools & Modules</span>
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-900/60 text-cyan-200">OS</span>
            </button>
          )}
          <button
            onClick={() => handleNavClick("product")}
            className="text-left px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-slate-800/50"
          >
            Product
          </button>
          <button
            onClick={() => handleNavClick("how-it-works")}
            className="text-left px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-slate-800/50"
          >
            How it works
          </button>
          <button
            onClick={() => handleNavClick("pricing")}
            className="text-left px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-slate-800/50"
          >
            Pricing
          </button>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              setActiveTab("dashboard");
            }}
            className="text-left px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-slate-800/50"
          >
            Saved Vault
          </button>
          {user && onSignOut && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onSignOut();
              }}
              className="text-left px-3 py-2 rounded-lg text-sm text-rose-300 hover:bg-rose-950/30"
            >
              Sign Out
            </button>
          )}
        </div>
      )}
    </header>
  );
};

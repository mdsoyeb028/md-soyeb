import React from "react";
import { Zap, X, ArrowRight, Sparkles, Check, Crown } from "lucide-react";
import { useCredits } from "../context/CreditsContext";
import { CENTRAL_PLANS } from "../data/plans";

interface PlanLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToPricing: () => void;
}

export const PlanLimitModal: React.FC<PlanLimitModalProps> = ({
  isOpen,
  onClose,
  onNavigateToPricing,
}) => {
  const { plan, dailyLimit, queriesUsedToday } = useCredits();

  if (!isOpen) return null;

  const handleGoPricing = () => {
    onClose();
    onNavigateToPricing();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-purple-500/40 p-6 sm:p-8 shadow-2xl shadow-purple-950/50 space-y-6 relative overflow-hidden text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow ambient effects */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-amber-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all border border-slate-700/50"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Title */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-300 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Daily AI Limit Reached</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            AI Credits: 0/{dailyLimit} today
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            You've used all <strong>{queriesUsedToday}/{dailyLimit}</strong> AI queries for today on your <strong>{plan.toUpperCase()}</strong> plan. Your quota will reset automatically tomorrow, or you can upgrade immediately for higher limits.
          </p>
        </div>

        {/* Plan Upgrade Options */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
            <div className="text-[11px] font-bold text-slate-400">STARTER</div>
            <div className="text-lg font-black text-white">$19<span className="text-[10px] text-slate-400 font-normal">/mo</span></div>
            <div className="text-[11px] text-cyan-300 font-semibold">50 queries/day</div>
          </div>

          <div className="p-3 rounded-2xl bg-purple-950/40 border border-purple-500/50 space-y-1.5 relative">
            <span className="absolute -top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-black bg-purple-500 text-white">Popular</span>
            <div className="text-[11px] font-bold text-purple-300">BUSINESS</div>
            <div className="text-lg font-black text-white">$49<span className="text-[10px] text-slate-400 font-normal">/mo</span></div>
            <div className="text-[11px] text-purple-200 font-semibold">250 queries/day</div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/80 border border-emerald-500/40 space-y-1.5">
            <div className="text-[11px] font-bold text-emerald-400">PRO</div>
            <div className="text-lg font-black text-white">$99<span className="text-[10px] text-slate-400 font-normal">/mo</span></div>
            <div className="text-[11px] text-emerald-300 font-semibold">Unlimited</div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2.5 pt-1">
          <button
            onClick={handleGoPricing}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-purple-600/30 transition-all active:scale-[0.98] cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-purple-300" />
            <span>View All Plans & Upgrade</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>

          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl text-slate-400 hover:text-slate-200 text-xs font-medium transition-colors cursor-pointer"
          >
            I'll Wait for Tomorrow's Reset
          </button>
        </div>
      </div>
    </div>
  );
};

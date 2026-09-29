import React from "react";
import { Zap, X, ArrowRight, ShieldCheck, Check, Sparkles, UserCheck } from "lucide-react";
import { useCredits } from "../context/CreditsContext";
import { CENTRAL_PLANS } from "../data/plans";

interface CreditStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToPricing: () => void;
  onOpenSignup: () => void;
}

export const CreditStatusModal: React.FC<CreditStatusModalProps> = ({
  isOpen,
  onClose,
  onNavigateToPricing,
  onOpenSignup,
}) => {
  const { 
    user, 
    isAnonymous, 
    plan, 
    consultationsUsed, 
    queriesUsedToday, 
    dailyLimit, 
    creditsRemaining 
  } = useCredits();

  if (!isOpen) return null;

  const currentPlanConfig = CENTRAL_PLANS[plan] || CENTRAL_PLANS.free;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-purple-500/40 p-6 shadow-2xl shadow-purple-950/50 space-y-5 relative overflow-hidden text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all border border-slate-700/50"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
            <Zap className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white">AI Credit & Quota Status</h3>
            <p className="text-xs text-slate-400">MD Soyeb Business Platform</p>
          </div>
        </div>

        {/* Current State Info Box */}
        {isAnonymous ? (
          <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300 font-semibold">Account State:</span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                Visitor / Anonymous
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300 font-semibold">Free Consultation:</span>
              <span className="text-xs font-mono font-bold text-white">
                {consultationsUsed === 0 ? "1 of 1 Remaining" : "0 of 1 Remaining (Used)"}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed pt-1 border-t border-purple-500/20">
              Sign up with Google for free to unlock <strong>10 AI queries every day</strong> and permanent cloud sync.
            </p>
            <button
              onClick={() => {
                onClose();
                onOpenSignup();
              }}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer"
            >
              <span>Create Free Account (10 Queries/Day)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Current Plan:</span>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[11px] font-extrabold border border-purple-500/30 uppercase">
                {currentPlanConfig.name}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Today's AI Usage:</span>
              <span className="text-xs font-mono font-bold text-white">
                {dailyLimit === Infinity ? "Unlimited" : `${queriesUsedToday} / ${dailyLimit} used`}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Credits Remaining:</span>
              <span className="text-sm font-mono font-extrabold text-cyan-400">
                {dailyLimit === Infinity ? "Unlimited" : `${creditsRemaining} today`}
              </span>
            </div>

            {dailyLimit !== Infinity && (
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-cyan-500 to-purple-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (queriesUsedToday / dailyLimit) * 100)}%` }}
                />
              </div>
            )}

            <div className="text-[10px] text-slate-400 flex items-center gap-1.5 pt-1 border-t border-slate-800/80">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Resets every midnight at 00:00 UTC</span>
            </div>
          </div>
        )}

        {/* Pricing upgrade link */}
        <div className="space-y-2 pt-1">
          <button
            onClick={() => {
              onClose();
              onNavigateToPricing();
            }}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Manage Plans & Subscriptions</span>
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from "react";
import { Sparkles, Shield, Zap, X, Check, Lock, ArrowRight, Loader2 } from "lucide-react";
import { useCredits } from "../context/CreditsContext";

interface SignupGateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SignupGateModal: React.FC<SignupGateModalProps> = ({ isOpen, onClose }) => {
  const { handleGoogleSignup } = useCredits();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const onGoogleClick = async () => {
    try {
      setIsSubmitting(true);
      await handleGoogleSignup();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-purple-500/40 p-6 sm:p-8 shadow-2xl shadow-purple-950/50 space-y-6 relative overflow-hidden text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow ambient effects */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all border border-slate-700/50"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Badge & Title */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-500/40 text-purple-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
            <span>AI Consultation Limit</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Your free AI consultation has been used
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Create your free account to continue using MD Soyeb Business Platform.
          </p>
        </div>

        {/* Benefits Card */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Free Account Benefits:
          </div>
          <ul className="space-y-2 text-xs text-slate-200">
            <li className="flex items-center gap-2.5">
              <div className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center shrink-0">
                <Check className="w-2.5 h-2.5" />
              </div>
              <span><strong>10 AI queries every single day</strong> on the Free Plan</span>
            </li>
            <li className="flex items-center gap-2.5">
              <div className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center shrink-0">
                <Check className="w-2.5 h-2.5" />
              </div>
              <span>Keep your first consultation & reports permanently saved</span>
            </li>
            <li className="flex items-center gap-2.5">
              <div className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center shrink-0">
                <Check className="w-2.5 h-2.5" />
              </div>
              <span>Full multi-link presence analysis & real SEO crawler access</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-1">
          {/* Continue with Google */}
          <button
            onClick={onGoogleClick}
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:via-indigo-500 hover:to-cyan-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-purple-600/30 transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Upgrading your account...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>

          {/* Secondary Sign Up button */}
          <button
            onClick={onGoogleClick}
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 text-xs font-semibold transition-all active:scale-[0.98] cursor-pointer"
          >
            Sign Up with Google Account
          </button>

          {/* Maybe Later */}
          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl text-slate-400 hover:text-slate-200 text-xs font-medium transition-colors cursor-pointer"
          >
            Maybe Later
          </button>
        </div>

        {/* Security badge note */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <Shield className="w-3.5 h-3.5 text-cyan-400" />
          <span>Firebase authenticated • No credit card required • Instant access</span>
        </div>
      </div>
    </div>
  );
};

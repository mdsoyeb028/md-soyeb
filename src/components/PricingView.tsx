import React, { useState } from "react";
import { 
  Sparkles, 
  Check, 
  ShieldCheck, 
  CreditCard, 
  Zap, 
  HelpCircle, 
  X,
  Lock,
  ArrowRight,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  RefreshCw,
  ExternalLink
} from "lucide-react";
import { CENTRAL_PLANS, PRICING_PLANS_LIST } from "../data/plans";
import { PlanConfig, SubscriptionPlanId, ActiveTab } from "../types";
import { useLanguage } from "../i18n/LanguageContext";
import { useCredits } from "../context/CreditsContext";
import { launchRazorpayCheckout } from "../services/razorpayService";

interface PricingViewProps {
  setActiveTab?: (tab: ActiveTab) => void;
}

export const PricingView: React.FC<PricingViewProps> = ({ setActiveTab }) => {
  const { t } = useLanguage();
  const { 
    user, 
    isAnonymous, 
    plan: activePlan, 
    planExpiresAt,
    refreshProfile,
    openSignupModal 
  } = useCredits();

  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [checkoutLoadingPlan, setCheckoutLoadingPlan] = useState<string | null>(null);
  const [checkoutStatus, setCheckoutStatus] = useState<{
    status: "idle" | "success" | "failed" | "dismissed";
    message?: string;
  }>({ status: "idle" });

  // Read Razorpay test mode flag if key starts with rzp_test_
  const isTestMode = typeof window !== "undefined" && (
    window.location.hostname === "localhost" ||
    (import.meta.env.VITE_RAZORPAY_KEY_ID && import.meta.env.VITE_RAZORPAY_KEY_ID.startsWith("rzp_test_"))
  );

  const handleUpgradeClick = async (plan: PlanConfig) => {
    if (isAnonymous || !user) {
      openSignupModal();
      return;
    }

    if (plan.id === "free") {
      return;
    }

    setCheckoutLoadingPlan(plan.id);
    setCheckoutStatus({ status: "idle" });

    try {
      await launchRazorpayCheckout({
        planId: plan.id as "starter" | "business" | "pro",
        period: billingCycle,
        userEmail: user.email,
        userName: user.displayName || user.email?.split("@")[0],
        onSuccess: async (verifyData) => {
          setCheckoutLoadingPlan(null);
          setCheckoutStatus({
            status: "success",
            message: verifyData.message || `Your ${plan.name} plan is now active for ${billingCycle === "yearly" ? "365 days" : "30 days"}!`,
          });
          await refreshProfile();
        },
        onFailure: (errorMessage) => {
          setCheckoutLoadingPlan(null);
          setCheckoutStatus({
            status: "failed",
            message: errorMessage || "Payment was not completed. Please try again or use another payment method.",
          });
        },
        onDismiss: () => {
          setCheckoutLoadingPlan(null);
          setCheckoutStatus({
            status: "dismissed",
            message: "Checkout was closed before completing payment.",
          });
        },
      });
    } catch (err: any) {
      setCheckoutLoadingPlan(null);
      setCheckoutStatus({
        status: "failed",
        message: err?.message || "Could not launch checkout.",
      });
    }
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Title & Badge */}
      <div className="text-center space-y-2 pt-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-500/30 text-purple-300 text-xs font-semibold backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span>{t("pricing.title", "Transparent Prepaid Plans for Indian & Global Trade")}</span>
          {isTestMode && (
            <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
              Test Mode
            </span>
          )}
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          {t("pricing.title", "Invest in Direct Business Growth")}
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
          Prepaid 30-day or 365-day access. No surprise recurring deductions, cancel or extend anytime.
        </p>

        {/* Monthly vs Yearly Toggle */}
        <div className="inline-flex items-center gap-2 p-1 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-semibold mt-3">
          <button
            onClick={() => setBillingCycle("monthly")}
            className={`px-4 py-1.5 rounded-xl transition-all cursor-pointer ${
              billingCycle === "monthly"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Monthly (30 Days)
          </button>
          <button
            onClick={() => setBillingCycle("yearly")}
            className={`px-4 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              billingCycle === "yearly"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>Annual (365 Days)</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
              Save ~17%
            </span>
          </button>
        </div>
      </div>

      {/* Checkout Status Notification Banner */}
      {checkoutStatus.status === "success" && (
        <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 flex items-start gap-3 text-emerald-200 text-xs sm:text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <p className="font-bold text-white">Payment Successful!</p>
            <p>{checkoutStatus.message}</p>
          </div>
          <button
            onClick={() => setCheckoutStatus({ status: "idle" })}
            className="text-emerald-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {checkoutStatus.status === "failed" && (
        <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-500/50 flex items-start gap-3 text-rose-200 text-xs sm:text-sm">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <p className="font-bold text-white">Payment Unsuccessful</p>
            <p>{checkoutStatus.message}</p>
          </div>
          <button
            onClick={() => setCheckoutStatus({ status: "idle" })}
            className="text-rose-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {checkoutStatus.status === "dismissed" && (
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between text-slate-300 text-xs">
          <span>{checkoutStatus.message}</span>
          <button
            onClick={() => setCheckoutStatus({ status: "idle" })}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Plan Cards Grid */}
      <div id="pricing-plans-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PRICING_PLANS_LIST.map((plan) => {
          const inrPrice = billingCycle === "monthly" ? plan.priceMonthlyINR : plan.priceAnnualINR;
          const isCurrentActive = !isAnonymous && activePlan === plan.id;
          const isPopular = plan.popular;
          const isLoading = checkoutLoadingPlan === plan.id;

          return (
            <div
              key={plan.id}
              className={`relative p-5 rounded-2xl backdrop-blur-xl border transition-all flex flex-col justify-between ${
                isPopular
                  ? "bg-gradient-to-b from-purple-950/70 via-slate-900/90 to-slate-950 border-purple-500/60 shadow-2xl shadow-purple-900/20"
                  : "bg-slate-900/60 hover:bg-slate-900/80 border-slate-800"
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-md">
                  Most Popular
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-extrabold text-white tracking-wide">{plan.name}</h3>
                  {isCurrentActive ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      ✓ Active Plan
                    </span>
                  ) : plan.id === "free" ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                      Forever Free
                    </span>
                  ) : (
                    <span className="text-[10px] text-purple-300 font-semibold">
                      Prepaid {billingCycle === "yearly" ? "365d" : "30d"}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400 mb-4 min-h-[32px]">
                  {plan.description}
                </p>

                <div className="flex items-baseline gap-1 mb-4">
                  {plan.id === "free" ? (
                    <span className="text-3xl font-black text-white font-mono">₹0</span>
                  ) : (
                    <>
                      <span className="text-3xl font-black text-white font-mono">
                        ₹{inrPrice?.toLocaleString("en-IN")}
                      </span>
                      <span className="text-xs text-slate-400">
                        {billingCycle === "yearly" ? "/ year" : "/ month"}
                      </span>
                    </>
                  )}
                </div>

                {/* AI Business Agent Specifications */}
                <div className="mb-4 p-3 rounded-xl bg-slate-950/80 border border-cyan-500/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-cyan-300 tracking-wide flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      AI Capabilities
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                      {plan.dailyQueryLimit === Infinity ? "Unlimited*" : `${plan.dailyQueryLimit}/day`}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-1 text-[11px] text-slate-200 pl-0.5">
                    {plan.agentFeatures?.summaryPills?.map((pill, pIdx) => (
                      <div key={pIdx} className="flex items-center gap-1.5">
                        <Check className="w-3 h-3 text-cyan-400 shrink-0" />
                        <span>{pill}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Plan Highlights */}
                <ul className="space-y-2 text-xs text-slate-300 mb-6 pl-0.5">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {isCurrentActive ? (
                <div className="w-full py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 bg-emerald-950/60 text-emerald-300 border border-emerald-500/40">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Current Active Plan</span>
                </div>
              ) : plan.id === "free" ? (
                <button
                  disabled
                  className="w-full py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed"
                >
                  <span>Included</span>
                </button>
              ) : (
                <button
                  onClick={() => handleUpgradeClick(plan)}
                  disabled={isLoading}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-60 ${
                    isPopular
                      ? "bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/30"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Opening Checkout...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>{isAnonymous ? "Sign Up to Upgrade" : `Upgrade to ${plan.name}`}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Trust & Guarantee Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-300">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-purple-400 shrink-0" />
          <div>
            <p className="font-bold text-white">Prepaid Razorpay Checkout</p>
            <p className="text-slate-400 text-[11px]">Supports UPI (GPay, PhonePe, Paytm), Net Banking, RuPay, Visa, Mastercard.</p>
          </div>
        </div>

        {user && !isAnonymous && setActiveTab && (
          <button
            onClick={() => setActiveTab("billing")}
            className="px-3.5 py-1.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 border border-purple-500/30 font-semibold flex items-center gap-1.5 transition-all cursor-pointer text-xs"
          >
            <span>View Billing & Invoices</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

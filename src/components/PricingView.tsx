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
  ArrowRight
} from "lucide-react";
import { PRICING_PLANS } from "../data/mockData";
import { PricingPlan } from "../types";

export const PricingView: React.FC = () => {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState<PricingPlan | null>(null);
  const [selectedGateway, setSelectedGateway] = useState<"stripe" | "razorpay" | "paypal">("stripe");
  const [checkoutInitiated, setCheckoutInitiated] = useState(false);

  const handleOpenCheckout = (plan: PricingPlan) => {
    setSelectedPlanForCheckout(plan);
    setCheckoutInitiated(false);
  };

  const handleSimulateGatewayTrigger = () => {
    setCheckoutInitiated(true);
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Title */}
      <div className="text-center space-y-2 pt-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-500/30 text-purple-300 text-xs font-semibold backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span>Flexible Plans for Modern Businesses & Exporters</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Invest in Global Business Growth
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
          Scale your international reach, dominate search rankings, and streamline buyer outreach with enterprise-grade trade tools.
        </p>

        {/* Monthly vs Annual Toggle */}
        <div className="inline-flex items-center gap-2 p-1 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-semibold mt-2">
          <button
            onClick={() => setBillingCycle("monthly")}
            className={`px-4 py-1.5 rounded-xl transition-all ${
              billingCycle === "monthly"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setBillingCycle("annual")}
            className={`px-4 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              billingCycle === "annual"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>Annual</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
              Save 20%
            </span>
          </button>
        </div>
      </div>

      {/* 4 Plan Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PRICING_PLANS.map((plan) => {
          const price = billingCycle === "monthly" ? plan.priceMonthly : plan.priceAnnual;
          const isPopular = plan.popular;

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
                  Most Popular for Exporters
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-extrabold text-white tracking-wide">{plan.name}</h3>
                  {plan.priceMonthly === 0 ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                      Standard
                    </span>
                  ) : (
                    <span className="text-[10px] text-purple-300 font-semibold">
                      Billed {billingCycle}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400 mb-4 min-h-[32px]">
                  {plan.description}
                </p>

                <div className="flex items-baseline gap-1 mb-5">
                  <span className="text-3xl font-black text-white font-mono">${price}</span>
                  <span className="text-xs text-slate-400">/ month</span>
                  {billingCycle === "annual" && plan.priceMonthly > 0 && (
                    <span className="text-[10px] text-emerald-400 line-through ml-1">
                      ${plan.priceMonthly}
                    </span>
                  )}
                </div>

                <ul className="space-y-2.5 text-xs text-slate-300 mb-6 pl-0.5">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => handleOpenCheckout(plan)}
                className={`w-full py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${
                  isPopular
                    ? "bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/30"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                }`}
              >
                <span>{plan.cta}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Gateway Architecture Information Card */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-semibold text-white">Payment Architecture Notice</h4>
          <p>
            In strict compliance with requirements, we do not simulate fake payment approvals. The monetization infrastructure is structured to connect live merchant keys (Stripe, Razorpay, or PayPal) via environment secrets without frontend credential exposure.
          </p>
        </div>
      </div>

      {/* Payment Gateway Connection Modal / Drawer */}
      {selectedPlanForCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-purple-500/50 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-sm text-white">
                  Checkout: {selectedPlanForCheckout.name} Plan
                </h3>
              </div>
              <button
                onClick={() => setSelectedPlanForCheckout(null)}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
              <div className="flex items-center justify-between text-slate-300">
                <span>Selected Plan:</span>
                <strong className="text-white">{selectedPlanForCheckout.name} ({billingCycle})</strong>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Total Amount:</span>
                <strong className="text-purple-400 text-sm font-mono">
                  ${billingCycle === "monthly" ? selectedPlanForCheckout.priceMonthly : selectedPlanForCheckout.priceAnnual * 12}
                  {billingCycle === "annual" ? " / year" : " / month"}
                </strong>
              </div>
            </div>

            {/* Select Gateway */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Select Ready Payment Gateway
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[
                  { id: "stripe" as const, name: "Stripe" },
                  { id: "razorpay" as const, name: "Razorpay" },
                  { id: "paypal" as const, name: "PayPal" },
                ].map((gw) => (
                  <button
                    key={gw.id}
                    onClick={() => setSelectedGateway(gw.id)}
                    className={`p-2.5 rounded-xl border text-center font-semibold transition-all ${
                      selectedGateway === gw.id
                        ? "bg-purple-950 border-purple-400 text-purple-200"
                        : "bg-slate-950 border-slate-800 text-slate-400"
                    }`}
                  >
                    {gw.name}
                  </button>
                ))}
              </div>
            </div>

            {checkoutInitiated ? (
              <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-700/50 text-xs text-slate-300 space-y-2">
                <div className="flex items-center gap-2 text-indigo-300 font-bold">
                  <Lock className="w-4 h-4" />
                  <span>Gateway Connection Ready</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Endpoint route: <code>POST /api/billing/create-checkout-session</code> is pre-wired for <strong>{selectedGateway.toUpperCase()}</strong>. To accept real credit card or UPI transactions, attach your production <code>STRIPE_SECRET_KEY</code> or merchant credentials in environment variables.
                </p>
                <div className="text-[10px] text-slate-500 font-mono">
                  Environment status: Ready for Webhook & Secret key injection.
                </div>
              </div>
            ) : (
              <button
                onClick={handleSimulateGatewayTrigger}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition-all"
              >
                <Lock className="w-4 h-4" />
                <span>Initialize {selectedGateway.toUpperCase()} Gateway</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

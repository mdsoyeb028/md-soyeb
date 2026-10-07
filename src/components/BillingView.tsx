import React, { useState, useEffect } from "react";
import { 
  CreditCard, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowUpRight, 
  RefreshCw, 
  Receipt, 
  ShieldCheck, 
  Sparkles,
  ChevronRight,
  ExternalLink
} from "lucide-react";
import { useCredits } from "../context/CreditsContext";
import { CENTRAL_PLANS } from "../data/plans";
import { ActiveTab } from "../types";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "../firebase";

interface BillingViewProps {
  setActiveTab?: (tab: ActiveTab) => void;
}

interface PaymentRecord {
  id: string;
  orderId?: string;
  paymentId?: string;
  planId: string;
  period?: "monthly" | "yearly";
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

export const BillingView: React.FC<BillingViewProps> = ({ setActiveTab }) => {
  const { user, isAnonymous, plan, planExpiresAt, planPeriod, refreshProfile, openSignupModal } = useCredits();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);

  const planDetails = CENTRAL_PLANS[plan] || CENTRAL_PLANS.free;

  // Calculate days left
  let daysLeft: number | null = null;
  let isExpiringSoon = false;
  let formattedExpiry = "Never (Free Tier)";

  if (plan !== "free" && planExpiresAt) {
    const expiryMs = new Date(planExpiresAt).getTime();
    const nowMs = Date.now();
    const diffDays = Math.ceil((expiryMs - nowMs) / (1000 * 60 * 60 * 24));
    daysLeft = Math.max(0, diffDays);
    isExpiringSoon = daysLeft <= 5;
    formattedExpiry = new Date(planExpiresAt).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  // Fetch owner payments history from payments collection
  useEffect(() => {
    async function loadPayments() {
      if (!user || isAnonymous) {
        setLoadingPayments(false);
        return;
      }

      try {
        setLoadingPayments(true);
        const paymentsRef = collection(db, "payments");
        const q = query(
          paymentsRef,
          where("uid", "==", user.uid)
        );
        const snap = await getDocs(q);
        const list: PaymentRecord[] = [];
        snap.forEach((doc) => {
          const data = doc.data();
          list.push({
            id: doc.id,
            orderId: data.orderId,
            paymentId: data.paymentId,
            planId: data.planId,
            period: data.period,
            amount: Number(data.amount || 0),
            currency: data.currency || "INR",
            status: data.status || "completed",
            createdAt: data.createdAt || new Date().toISOString(),
          });
        });
        // Sort descending by date
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setPayments(list);
      } catch (err) {
        console.warn("Could not load payments history:", err);
      } finally {
        setLoadingPayments(false);
      }
    }

    loadPayments();
  }, [user, isAnonymous]);

  if (isAnonymous || !user) {
    return (
      <div className="p-8 text-center space-y-4 max-w-md mx-auto my-12 rounded-2xl bg-slate-900/60 border border-slate-800">
        <CreditCard className="w-10 h-10 text-purple-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Sign In to View Billing</h2>
        <p className="text-xs text-slate-400">
          Sign in with your Google account to view your active subscription, expiration date, and verified payment invoices.
        </p>
        <button
          onClick={openSignupModal}
          className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs cursor-pointer shadow-lg shadow-purple-600/30"
        >
          Sign In / Register
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      {/* Expiry Warning Banner (Shown 5 days before expiry) */}
      {isExpiringSoon && (
        <div className="p-4 rounded-2xl bg-amber-950/80 border border-amber-500/50 flex items-start gap-3.5 text-amber-200">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1 text-xs sm:text-sm">
            <h4 className="font-bold text-white">Plan Expiring Soon</h4>
            <p>
              Your {planDetails.name} plan expires in <strong>{daysLeft} days</strong> ({formattedExpiry}). Renew now to maintain uninterrupted AI quotas and customer agent hosting.
            </p>
          </div>
          <button
            onClick={() => setActiveTab && setActiveTab("pricing")}
            className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs shrink-0 cursor-pointer transition-all"
          >
            Renew Plan
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">Billing & Subscriptions</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-500/30 text-xs font-semibold">
              Prepaid
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage your prepaid plan, track expiration countdown, and review Razorpay transaction history.
          </p>
        </div>

        <button
          onClick={() => setActiveTab && setActiveTab("pricing")}
          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-purple-600/25 cursor-pointer transition-all"
        >
          <span>Renew / Upgrade Plan</span>
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      {/* Current Plan Overview Card */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400">Current Active Plan</span>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-black text-white">{planDetails.name} PLAN</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Active
              </span>
            </div>
            <p className="text-xs text-slate-400">{planDetails.description}</p>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-[11px] text-slate-400">Quota Allowance</span>
            <p className="text-lg font-black text-white font-mono">
              {planDetails.dailyQueryLimit === Infinity ? "Unlimited AI Queries" : `${planDetails.dailyQueryLimit} Queries / Day`}
            </p>
          </div>
        </div>

        {/* Expiry Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-purple-400" />
              Expiration Date
            </span>
            <p className="text-sm font-bold text-white font-mono">{formattedExpiry}</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              Remaining Duration
            </span>
            <p className="text-sm font-bold text-white font-mono">
              {daysLeft !== null ? `${daysLeft} Days Remaining` : "Perpetual Free"}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Prepaid Protection
            </span>
            <p className="text-sm font-bold text-white font-mono">
              {planPeriod === "yearly" ? "365-Day Cycle" : planPeriod === "monthly" ? "30-Day Cycle" : "Standard"}
            </p>
          </div>
        </div>
      </div>

      {/* Payment & Invoices History */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Receipt className="w-4 h-4 text-purple-400" />
            <span>Razorpay Transaction History</span>
          </h3>
          <button
            onClick={refreshProfile}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Refresh</span>
          </button>
        </div>

        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden">
          {loadingPayments ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading invoices...</div>
          ) : payments.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <Receipt className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">No payment transactions found yet.</p>
              <p className="text-[11px] text-slate-500">
                When you purchase or upgrade a prepaid plan via Razorpay, your receipts will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {payments.map((p) => (
                <div key={p.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white uppercase">{p.planId} Plan</span>
                      <span className="px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800 text-[10px]">
                        {p.period || "prepaid"}
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold">
                        {p.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      ID: {p.paymentId || p.orderId || p.id} • {new Date(p.createdAt).toLocaleDateString("en-IN", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-sm font-bold text-white font-mono">
                      ₹{p.amount.toLocaleString("en-IN")}
                    </span>
                    <span className="text-[10px] text-slate-400 block">{p.currency}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

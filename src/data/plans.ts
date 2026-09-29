import { PlanConfig, SubscriptionPlanId } from "../types";

export const CENTRAL_PLANS: Record<SubscriptionPlanId, PlanConfig> = {
  free: {
    id: "free",
    name: "FREE",
    priceMonthly: 0,
    priceAnnual: 0,
    dailyQueryLimit: 10,
    description: "Essential starter toolkit for solo creators and early-stage micro enterprises.",
    features: [
      "Basic SEO suggestions & meta generator",
      "Standard social media caption ideas",
      "Basic export checklist & HS code guide",
      "Limited AI usage (10 queries/day)",
      "Local dashboard storage",
    ],
    cta: "Current Free Plan",
  },
  starter: {
    id: "starter",
    name: "STARTER",
    priceMonthly: 19,
    priceAnnual: 15,
    dailyQueryLimit: 50,
    description: "For ambitious freelancers and emerging local brands scaling customer acquisition.",
    features: [
      "Full SEO audit & keyword volume estimates",
      "7-Day social media content planner",
      "Target country trade briefs",
      "50 AI queries/day with faster processing",
      "Saved reports & export to markdown",
      "Commercial message generator",
    ],
    cta: "Upgrade to Starter",
  },
  business: {
    id: "business",
    name: "BUSINESS",
    priceMonthly: 49,
    priceAnnual: 39,
    dailyQueryLimit: 250,
    popular: true,
    description: "Comprehensive growth engine for manufacturers, exporters, and established startups.",
    features: [
      "Advanced Export Market Intelligence",
      "Buyer cold email & WhatsApp generator",
      "Competitor SWOT & pricing margin models",
      "Full business & marketing plan blueprints",
      "250 AI queries/day + deep research mode",
      "Team report sharing & priority support",
    ],
    cta: "Start Business Plan",
  },
  pro: {
    id: "pro",
    name: "PRO",
    priceMonthly: 99,
    priceAnnual: 79,
    dailyQueryLimit: Infinity,
    description: "Unlimited enterprise trade intelligence and dedicated expansion advisory.",
    features: [
      "Full international business concierge",
      "Live tariff & customs documentation checks",
      "Unlimited AI consultations & generation",
      "Custom brand voice & multi-language campaigns",
      "Export container logistics & Incoterms advisor",
      "Dedicated account manager & API access",
    ],
    cta: "Go Enterprise Pro",
  },
};

export const PRICING_PLANS_LIST: PlanConfig[] = [
  CENTRAL_PLANS.free,
  CENTRAL_PLANS.starter,
  CENTRAL_PLANS.business,
  CENTRAL_PLANS.pro,
];

export function getDailyLimitForPlan(planId: SubscriptionPlanId): number {
  return CENTRAL_PLANS[planId]?.dailyQueryLimit ?? 10;
}

export function isPlanQueryUnlimited(planId: SubscriptionPlanId): boolean {
  return CENTRAL_PLANS[planId]?.dailyQueryLimit === Infinity;
}

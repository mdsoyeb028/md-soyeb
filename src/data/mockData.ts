import { PricingPlan, SavedItem } from "../types";

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "free",
    name: "FREE",
    priceMonthly: 0,
    priceAnnual: 0,
    description: "Essential starter toolkit for solo creators and early-stage micro enterprises.",
    features: [
      "Basic SEO suggestions & meta generator",
      "Standard social media caption ideas",
      "Basic export checklist & HS code guide",
      "Limited AI usage (10 queries/day)",
      "Local dashboard storage",
    ],
    cta: "Get Started Free",
  },
  {
    id: "starter",
    name: "STARTER",
    priceMonthly: 19,
    priceAnnual: 15,
    description: "For ambitious freelancers and emerging local brands scaling customer acquisition.",
    features: [
      "Full SEO audit & keyword volume estimates",
      "7-Day social media content planner",
      "Target country trade briefs",
      "50 AI queries/day with faster processing",
      "Saved reports & export to markdown",
      "Commercial message generator",
    ],
    cta: "Choose Starter",
  },
  {
    id: "business",
    name: "BUSINESS",
    priceMonthly: 49,
    priceAnnual: 39,
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
  {
    id: "pro",
    name: "PRO",
    priceMonthly: 99,
    priceAnnual: 79,
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
];

export const INITIAL_SAVED_ITEMS: SavedItem[] = [
  {
    id: "demo-export-1",
    type: "export",
    title: "Handicrafts & Home Decor Export to Germany",
    summary: "Target market analysis: High consumer affinity for sustainable wooden and brass artisan goods.",
    content: `Target Market: Germany & Netherlands
Recommended Incoterm: FOB Nhava Sheva (or CIF Hamburg)
Target Buyer Types: Premium concept lifestyle stores, Fair Trade retail chains, and Amazon EU Brand Registry sellers.
Key Certifications: FSC certified wood, REACH compliance for metal finishes.`,
    createdAt: "2026-09-15T14:30:00.000Z",
    category: "Export Research",
    tags: ["Handicrafts", "Germany", "Eco-friendly"],
  },
  {
    id: "demo-seo-1",
    type: "seo",
    title: "SEO Strategy: organic-spices-direct.com",
    summary: "Audit Score: 84/100. Targeted commercial keywords in US & UK gourmet markets.",
    content: `Core Focus: 'Wholesale single-origin spice exporters'
Meta Title: Pure Single-Origin Spices | Bulk B2B Exporters & Certified Organic
Recommended Action: Add JSON-LD Product schema and submit sitemap for faster regional indexing.`,
    createdAt: "2026-09-17T09:15:00.000Z",
    category: "SEO Report",
    tags: ["Spices", "B2B SEO", "Schema"],
  },
  {
    id: "demo-social-1",
    type: "social",
    title: "7-Day Instagram & LinkedIn Reels Strategy",
    summary: "Visual hook: Factory stress-test and export container packing time-lapses.",
    content: `Theme: 'Zero-damage international shipping guarantees'.
Key Hashtags: #GlobalTrade #ExportQuality #ManufacturingExcellence #ArtisanCrafts
CTA: Link in bio for 2026 wholesale catalog.`,
    createdAt: "2026-09-18T11:20:00.000Z",
    category: "Social Media",
    tags: ["Reels", "Instagram", "B2B"],
  },
];

export const QUICK_PROMPTS = [
  "I want to export handicrafts from India.",
  "How can I find reliable B2B buyers in the UAE?",
  "Give me an SEO plan for my local manufacturing startup.",
  "Create a 7-day Instagram content calendar for organic tea.",
  "What documents are needed to export textiles to the USA?",
  "Calculate healthy wholesale margins for handcrafted goods.",
];

export const BUSINESS_TOOLS_LIST = [
  { id: "idea-gen", name: "Business Idea Generator", desc: "Validate market demand & niche angles" },
  { id: "biz-plan", name: "Business Plan Generator", desc: "Executive summary, USP & monetization" },
  { id: "mkt-plan", name: "Marketing Plan", desc: "Organic, paid & B2B referral roadmaps" },
  { id: "pricing-calc", name: "Pricing Calculator", desc: "COGS, gross margin, wholesale & FOB export rates" },
  { id: "customer-msg", name: "Customer Message Generator", desc: "Inquiries, follow-ups & review requests" },
  { id: "brand-names", name: "Brand Name Generator", desc: "Memorable, modern & trademark-friendly names" },
  { id: "tagline-gen", name: "Tagline Generator", desc: "High-converting brand slogans & hooks" },
  { id: "competitor-analysis", name: "Competitor Analysis", desc: "SWOT, differentiation & price positioning" },
  { id: "prod-desc", name: "Product Description Generator", desc: "B2B catalog & e-commerce descriptions" },
];

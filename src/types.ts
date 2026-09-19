export type ActiveTab = "home" | "seo" | "social" | "export" | "business" | "dashboard" | "pricing";

export interface SavedItem {
  id: string;
  type: "ai-assistant" | "seo" | "social" | "export" | "business";
  title: string;
  summary: string;
  content: string | Record<string, unknown>;
  createdAt: string;
  category?: string;
  tags?: string[];
}

export interface SeoAnalysisResult {
  score: number;
  summary: string;
  technicalSeo: {
    mobile: string;
    speed: string;
    ssl: string;
    crawlability: string;
  };
  onPageSeo: {
    headings: string;
    contentQuality: string;
    internalLinks: string;
  };
  keywords: Array<{
    term: string;
    volume: string;
    difficulty: string;
    intent: string;
  }>;
  metaTitle: string;
  metaDescription: string;
  suggestions: Array<{
    priority: "Critical" | "High" | "Medium";
    title: string;
    action: string;
  }>;
  source?: string;
}

export interface SocialMediaResult {
  postIdeas: Array<{
    hook: string;
    description: string;
    format: string;
  }>;
  reelIdeas: Array<{
    visual: string;
    audioHook: string;
    onScreenText: string;
  }>;
  captions: Array<{
    headline: string;
    body: string;
    cta: string;
  }>;
  hashtags: string[];
  videoHooks: string[];
  calendar: Array<{
    day: string;
    theme: string;
    content: string;
    bestTime: string;
  }>;
  source?: string;
}

export interface ExportAnalysisResult {
  product: string;
  country: string;
  customerTypes: string[];
  marketInfo: string;
  incoterms: string;
  suggestedSteps: string[];
  rawText?: string;
  source?: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  priceMonthly: number;
  priceAnnual: number;
  popular?: boolean;
  description: string;
  features: string[];
  cta: string;
}

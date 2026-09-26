export type ActiveTab = "home" | "seo" | "social" | "export" | "business" | "dashboard" | "pricing";

export interface SavedItem {
  id: string;
  userId?: string;
  type: "seo" | "social" | "export" | "business" | "assistant" | "ai-assistant";
  title: string;
  summary: string;
  input?: Record<string, unknown> | string;
  context?: string;
  result?: Record<string, unknown> | string;
  content: string | Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
  category?: string;
  tags?: string[];
}

export interface SeoAnalysisResult {
  score: number;
  url?: string;
  normalizedUrl?: string;
  responseTimeMs?: number;
  pageSizeKb?: number;
  isHttps?: boolean;
  httpStatus?: number;
  summary: string;
  technicalSeo: {
    mobile: string;
    speed: string;
    ssl: string;
    crawlability: string;
    coreWebVitalsNotice?: string;
  };
  onPageSeo: {
    headings: string;
    contentQuality: string;
    internalLinks: string;
  };
  detectedData?: {
    title: string;
    titleLength: number;
    metaDescription: string;
    descriptionLength: number;
    canonical: string | null;
    hasViewport: boolean;
    viewportContent: string | null;
    h1Count: number;
    h1Samples: string[];
    h2Count: number;
    h2Samples: string[];
    h3Count: number;
    totalImages: number;
    imagesWithAlt: number;
    imagesMissingAlt: number;
    internalLinksCount: number;
    externalLinksCount: number;
    robotsTxtFound: boolean;
    sitemapFound: boolean;
    wordCount: number;
  };
  keywords: Array<{
    term: string;
    volume: string;
    difficulty: string;
    intent: string;
  }>;
  keywordNotice?: string;
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
  platform: string;
  businessName: string;
  category?: string;
  topic?: string;
  language?: string;
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
  platformDeliverables?: {
    instagram?: {
      caption: string;
      reelHook: string;
    };
    facebook?: {
      postContent: string;
      engagementQuestion: string;
    };
    youtube?: {
      videoTitle: string;
      videoDescription: string;
      shortsIdea: string;
      searchTags: string[];
    };
    linkedin?: {
      thoughtLeadershipPost: string;
      keyTakeaway: string;
    };
  };
  hashtags: string[];
  videoHooks: string[];
  ctaSuggestions: string[];
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
  category?: string;
  originCountry?: string;
  targetCountry: string;
  customerTypes?: string[];
  marketSuitability?: string;
  incotermsGuidance?: string;
  hsCodeGuidance?: string;
  paymentGuidance?: string;
  logisticsPackaging?: string;
  requiredDocuments?: string[];
  complianceChecklist?: string[];
  verificationNotice?: string;
  buyerOutreachDraft?: string;
  quotationDraft?: string;
  suggestedSteps?: string[];
  content: string;
  source?: string;
}

export interface ReadyMaterial {
  id: string;
  category: 
    | "website_copy" 
    | "headline_cta" 
    | "whatsapp_message" 
    | "email_sequence" 
    | "sales_script" 
    | "objection_handling" 
    | "google_business" 
    | "social_content" 
    | "faq" 
    | "offer_positioning" 
    | "other";
  title: string;
  description: string;
  content: string; // The ready-to-copy exact text
  oldVsNew?: { 
    oldText: string; 
    newText: string; 
    reason: string; 
  };
  instructions?: string; // "I prepared everything. You only need to copy and paste/send it."
}

export interface NextActionItem {
  title: string;
  actionText: string;
  materialToCopy?: string;
  whereToUse: string;
  stepIndex: number;
}

export interface ImplementationStep {
  id: string;
  stepNumber: number;
  timeframe: string;
  title: string;
  action: string;
  readyMaterialSnippet?: string;
  completed?: boolean;
}

export interface DiagnosisDetails {
  summary: string;
  likelyBottlenecks: string[];
  confirmedFindings: string[];
  assumptions: string[];
  priorityFix: string;
}

export interface AssistantResult {
  answer: string;
  actions: string[];
  stepByStepPlan?: string[];
  importantConsiderations?: string[];
  nextSteps?: string[];
  category?: string;
  verificationNotice?: string;
  content?: string;
  source?: string;
  // Self-Solving Problem Solver additions:
  diagnosis?: DiagnosisDetails;
  readyMaterials?: ReadyMaterial[];
  nextAction?: NextActionItem;
  implementationSteps?: ImplementationStep[];
  actionPlan?: {
    today?: string[];
    next7Days?: string[];
    next30Days?: string[];
    next60Days?: string[];
    next90Days?: string[];
  };
  websiteCrawlData?: {
    url: string;
    detectedTitle?: string;
    detectedH1?: string[];
    score?: number;
    observableIssues?: string[];
  };
  isLowBudgetMode?: boolean;
  problemType?: string;
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

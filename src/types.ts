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
    | "ad_copy"
    | "lead_form"
    | "landing_page"
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
  whatWeKnow?: string[];
  whatWeFound?: string[];
  evidence?: string[];
  missingInformation?: string[];
  businessImpact?: string;
  priority?: "CRITICAL" | "HIGH" | "MEDIUM";
  distinctions?: {
    facts: string[];
    userProvided: string[];
    websiteObservations: string[];
    currentResearch: string[];
    inferences: string[];
    hypotheses: string[];
  };
}

export interface DayActionPlanItem {
  day: string; // e.g. "Day 1", "Day 2", ... "Day 7"
  focus: string;
  action: string;
  materialSnippet?: string;
  completed?: boolean;
}

export interface BusinessProfile {
  businessName?: string;
  businessType?: string;
  industry?: string;
  country?: string;
  city?: string;
  targetArea?: string;
  website?: string;
  googleBusinessUrl?: string;
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    youtube?: string;
    other?: string;
  };
  productsServices?: string;
  priceRange?: string;
  targetCustomers?: string;
  currentCustomerSource?: string;
  monthlyMarketingBudget?: string;
  currentMetrics?: {
    monthlySales?: string;
    monthlyLeads?: string;
    conversionRate?: string;
  };
  mainGoal?: string;
  timePeriod?: string;
}

export interface CustomerStrategy {
  targetCustomerProfile?: {
    who: string;
    whyBuy: string;
    whereToReach: string;
    coreProblem: string;
    buyingIntent: string;
  };
  offer?: {
    coreOffer: string;
    valueProposition: string;
    pricingGuidance?: string;
    urgencyRiskReversal?: string;
  };
  channelOptions?: Array<{
    channel: string;
    type: "FREE" | "LOW_COST" | "PAID";
    effort: "Low" | "Medium" | "High";
    difficulty: "Beginner" | "Intermediate" | "Advanced";
    targetAudienceReach: string;
    howToExecute: string;
    whatToMeasure: string;
  }>;
  acquisitionPlanSummary?: string;
}

export interface HundredProspectPlan {
  title: string;
  targetProfile: {
    industry: string;
    location: string;
    customerType: string;
    companySize?: string;
    coreNeed: string;
  };
  channelDistribution: Array<{
    channel: string;
    activityTarget: number;
    actionMethod: string;
    qualificationCriteria: string;
  }>;
  totalTarget: number;
  disclaimer: string;
  verifiedProspectsSample?: Array<{
    business: string;
    website: string;
    location: string;
    relevantService: string;
    publicContactMethod: string;
    whyRelevant: string;
    source: string;
  }>;
}

export interface AdsCampaignPlan {
  platform: "google" | "meta" | "instagram" | "facebook" | "youtube" | "multi";
  campaignObjective: string;
  targetAudience: {
    demographics: string;
    location: string;
    interestsOrKeywords: string[];
  };
  budgetPlan: {
    recommendedDailyBudget: string;
    duration: string;
    biddingStrategy: string;
  };
  campaignStructure: {
    campaignName: string;
    adGroups: Array<{
      name: string;
      targetKeywordsOrAudience: string[];
      negativeKeywords?: string[];
      headlines: string[];
      descriptions: string[];
      cta: string;
    }>;
  };
  landingPageStructure?: {
    headline: string;
    subheadline: string;
    heroCta: string;
    leadFormQuestions: string[];
    trustSignals: string[];
    whatsappCtaText?: string;
  };
  creativeBriefs?: {
    imageAdCopy: string;
    imageDesignBrief: string;
    imagePromptForGeneration?: string;
    videoAdScript?: {
      hook: string;
      body: string;
      cta: string;
      visualDirection: string;
    };
  };
  trackingAndOptimization?: {
    conversionEvents: string[];
    pixelOrTagGuidance: string;
    optimizationRules: string[];
  };
}

export interface OrganicAcquisitionPlan {
  gbpPlan?: {
    businessDescription: string;
    categorySuggestions: string[];
    serviceDescriptions: string[];
    photoChecklist: string[];
    weeklyPostIdeas: string[];
    genuineReviewRequestTemplate: string;
    reviewResponseTemplates: {
      positive: string;
      neutralOrConstructive: string;
    };
  };
  referralSystem?: {
    offer: string;
    requestScript: string;
    incentiveModel: string;
  };
  partnershipIdeas?: string[];
  organicOutreachStrategy?: string;
}

export interface SalesSolverPlan {
  salesPitch?: string;
  phoneCallScript?: string;
  whatsappSalesScript?: string;
  emailSalesScript?: string;
  objectionResponses?: Array<{
    objection: string;
    response: string;
  }>;
  closingQuestions?: string[];
  followUpSequence?: Array<{
    timing: "Day 0" | "Day 2" | "Day 5" | "Day 10";
    channel: "WhatsApp" | "Email" | "Phone";
    subjectOrHook: string;
    messageCopy: string;
    cta: string;
    instructions: string;
  }>;
}

export interface ContentCalendarDay {
  dayNumber: number;
  format: "Instagram Reel" | "Carousel" | "Story" | "Facebook Post" | "YouTube Short" | "LinkedIn Post" | "Blog";
  topic: string;
  hook: string;
  caption: string;
  cta: string;
  targetCustomer: string;
  purpose: string;
}

export interface WebsiteConversionFixes {
  url?: string;
  currentHeadline?: string;
  recommendedHeadline: string;
  headlineWhyItConverts: string;
  currentCta?: string;
  recommendedCta: string;
  ctaWhyItConverts: string;
  serviceSectionCopy?: string;
  trustSectionStructure?: string[];
  faqContent?: Array<{ question: string; answer: string }>;
  leadFormQuestions?: string[];
  whatsappCtaCopy?: string;
  seoFixes?: {
    metaTitle: string;
    metaDescription: string;
    h1Suggestion: string;
    h2Suggestions: string[];
    targetKeywords: string[];
    technicalFixChecklist: string[];
  };
}

export interface ActionCenterItem {
  id: string;
  timeframe: "TODAY" | "THIS WEEK" | "NEXT 30 DAYS" | "NEXT 60 DAYS" | "NEXT 90 DAYS";
  action: string;
  why: string;
  how: string;
  tool: string;
  costCategory: "FREE" | "LOW_COST" | "PAID";
  difficulty: "Easy" | "Medium" | "Advanced";
  expectedMeasurement: string;
  status: "Not Started" | "In Progress" | "Completed";
  materialSnippet?: string;
}

export interface MeasurementMetrics {
  metricsToTrack: Array<{
    metric: string;
    whyTrack: string;
    targetBaseline: string;
    howToMeasure: string;
  }>;
  benchmarkGuidance: string;
}

export interface OptimizationExperiment {
  inputSpend?: string;
  inputClicks?: string;
  inputLeads?: string;
  inputSales?: string;
  analysis: string;
  recommendations: {
    keep: string[];
    change: string[];
    pause: string[];
    test: string[];
    improve: string[];
  };
  nextExperiment: string;
}

export interface VerifiedSourceItem {
  sourceTitle: string;
  sourceUrl: string;
  whatWasFound: string;
  whyItMatters: string;
  howAppUsedIt: string;
}

export interface ExternalActionPreview {
  actionName: string;
  targetPlatform: string;
  contentToPublishOrSend: string;
  estimatedCost: string;
  userConfirmationRequired: boolean;
  status: "READY TO PUBLISH" | "READY TO SEND" | "OPEN ADS SETUP" | "OPEN WEBSITE" | "MARK COMPLETE";
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
  // All-In-One Self-Solving Problem Solver suite:
  diagnosis?: DiagnosisDetails;
  customerStrategy?: CustomerStrategy;
  hundredProspectPlan?: HundredProspectPlan;
  adsPlan?: AdsCampaignPlan;
  organicPlan?: OrganicAcquisitionPlan;
  salesSolver?: SalesSolverPlan;
  contentCalendar?: ContentCalendarDay[];
  websiteFixes?: WebsiteConversionFixes;
  actionCenter?: ActionCenterItem[];
  readyMaterials?: ReadyMaterial[];
  nextAction?: NextActionItem;
  implementationSteps?: ImplementationStep[];
  sevenDayPlan?: DayActionPlanItem[];
  measurement?: MeasurementMetrics;
  optimization?: OptimizationExperiment;
  sources?: VerifiedSourceItem[];
  externalActions?: ExternalActionPreview[];
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

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
  serviceArea?: string;
  website?: string;
  googleBusinessUrl?: string;
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    youtube?: string;
    linkedin?: string;
    other?: string;
  };
  products?: string;
  services?: string;
  productsServices?: string;
  priceRange?: string;
  targetCustomer?: string;
  targetCustomers?: string;
  currentCustomerSource?: string;
  marketingBudget?: string;
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

export interface SolutionPackDiagnosis {
  main_problem: string;
  root_causes: string[];
  severity: "High" | "Medium" | "Low";
  summary: string;
}

export interface SolutionPackMaterials {
  headline_options: string[];
  whatsapp_scripts: string[];
  email_or_dm_scripts: string[];
  offer_or_pricing: string;
  cta_examples: string[];
  faqs: Array<{ question: string; answer: string }>;
}

export interface SolutionPackDayPlan {
  day: number;
  title: string;
  tasks: string[];
  time_required: string;
  completed?: boolean;
}

export interface SolutionPackRoadmap {
  day_30: string;
  day_60: string;
  day_90: string;
}

export interface SolutionPack {
  diagnosis: SolutionPackDiagnosis;
  ready_materials: SolutionPackMaterials;
  seven_day_plan: SolutionPackDayPlan[];
  growth_roadmap: SolutionPackRoadmap;
  expected_outcome: string;
  next_action: string;
  website_data?: {
    url: string;
    detectedTitle?: string;
    detectedH1?: string[];
    score?: number;
    observableIssues?: string[];
  };
}

export interface PracticalProblemSolverResult {
  understood: string;
  real_problem: string;
  immediate_action: string;
  ready_materials: {
    main_script: string;
    headline_or_offer: string;
    cta: string;
    extra_material: string;
  };
  action_plan: Array<{
    day: number;
    task: string;
    time_required?: string;
    completed?: boolean;
  }>;
  expected_result: string;
  next_one_thing: string;
  website_data?: {
    url: string;
    detectedTitle?: string;
    detectedH1?: string[];
    score?: number;
    observableIssues?: string[];
  };
  // Real Research Layer
  real_research?: {
    live_research_status: "active" | "unavailable";
    notice: string;
    query_analyzed?: string;
    sources: Array<{
      source: string;
      source_url: string;
      what_was_found: string;
      why_it_matters: string;
      date_or_recency?: string;
    }>;
  };
  // Comprehensive Business Growth Operating System engines:
  root_cause_diagnosis?: {
    primary_problem: string;
    secondary_problems?: string[];
    evidence?: string[];
    possible_causes?: string[];
    confirmed_facts?: string[];
    assumptions?: string[];
    hypothesis_or_suspected_issue?: string[];
    missing_information?: string[];
    missing_data_needed_to_confirm?: string[];
    fix_this_first?: string;
  };
  website_analysis?: {
    what_found?: string;
    why_it_matters?: string;
    what_to_change?: string;
    distinctions?: {
      observed_facts: string[];
      user_input: string[];
      research_findings: string[];
      inferences_and_hypotheses: string[];
    };
    exact_replacement?: {
      current_headline?: string;
      recommended_headline: string;
      current_cta?: string;
      recommended_cta: string;
    };
    homepage_copy?: string;
    service_copy?: string;
    cta?: string;
    faq?: Array<{ question: string; answer: string }>;
    lead_form?: string[];
    whatsapp_cta?: string;
    landing_page_structure?: string[];
  };
  customer_acquisition?: {
    summary: string;
    evaluated_channels?: Array<{
      channel: string;
      why_it_fits: string;
      cost_category: "FREE" | "LOW_COST" | "PAID";
      difficulty: "Beginner" | "Intermediate" | "Advanced";
      expected_workload: string;
      how_to_start: string;
      what_to_measure: string;
      source_or_link?: string;
    }>;
    free_organic_channels?: Array<{ channel: string; how_to_execute: string; target_reach: string; what_to_measure?: string; cost_category?: string; difficulty?: string }>;
    low_cost_channels?: Array<{ channel: string; how_to_execute: string; target_reach: string; what_to_measure?: string; cost_category?: string; difficulty?: string }>;
    paid_channels?: Array<{ channel: string; how_to_execute: string; budget_needed: string; what_to_measure?: string; cost_category?: string; difficulty?: string }>;
    hundred_prospects_plan?: {
      target_profile: { 
        industry: string; 
        location: string; 
        core_need: string;
        service?: string;
        target_customer?: string;
        customer_type?: string;
      };
      requested_count?: number;
      verified_count?: number;
      channels: Array<{ channel: string; activity_target: number; qualification_criteria: string; action_method: string }>;
      verified_prospects?: Array<{
        business_name: string;
        industry_or_category: string;
        city_country: string;
        website?: string;
        public_business_url?: string;
        public_contact_page_url?: string;
        why_matches: string;
        relevant_need_or_opportunity: string;
        personalization_idea: string;
        source: string;
        verification_status: "Verified Public Business" | "Public Directory Record" | "Search Verified" | "Official Registry";
      }>;
      fallback_discovery?: {
        exact_search_queries: string[];
        directories_and_platforms: Array<{ name: string; url: string; how_to_use: string }>;
        qualification_criteria: string[];
        outreach_workflow: string;
      };
      outreach_script: string;
    };
  };
  sales_strategy?: {
    sales_pitch?: string;
    phone_script?: string;
    whatsapp_sales_script?: string;
    email_sales_script?: string;
    objection_handling?: Array<{ objection: string; response: string }>;
    closing_questions?: string[];
    follow_up_sequence?: Array<{ timing: string; channel: string; subject_or_hook: string; message_copy: string; cta: string }>;
  };
  ads_strategy?: {
    recommended_platform?: string;
    campaign_objective?: string;
    campaign_structure?: {
      campaign_name: string;
      ad_groups: Array<{
        name: string;
        keyword_themes: string[];
        negative_keywords: string[];
        headlines: string[];
        descriptions: string[];
        cta: string;
      }>;
    };
    target_audience?: { demographics: string; location: string; interests_or_keywords: string[]; negative_keywords: string[] };
    budget_plan?: { daily_budget: string; bidding_strategy: string };
    budget_scenarios?: {
      low_budget_test: { daily_budget: string; test_duration: string; purpose: string };
      standard_test: { daily_budget: string; test_duration: string; purpose: string };
      higher_test: { daily_budget: string; test_duration: string; purpose: string };
    };
    ad_copy?: { headlines: string[]; descriptions: string[]; cta: string };
    landing_page_advice?: string;
    creative_direction?: { image_brief: string; video_script?: { hook: string; body: string; cta: string } };
    tracking_guidance?: string;
    safeguards_notice?: string;
  };
  meta_ads_strategy?: {
    campaign_objective: string;
    audience: string;
    location: string;
    creative_concept: string;
    primary_text: string;
    headline: string;
    cta: string;
    image_brief: string;
    video_reel_script: {
      hook: string;
      body: string;
      cta: string;
    };
    landing_page: string;
    tracking_events: string[];
    budget_test: {
      low_budget_test: string;
      standard_test: string;
    };
  };
  organic_local_strategy?: {
    gbp_plan?: {
      category_suggestions: string[];
      description: string;
      attributes_checklist?: string[];
      photo_checklist: string[];
      weekly_post_ideas: string[];
      authentic_review_rules?: string[];
      review_request_template: string;
      review_response_templates: { positive: string; critical: string };
    };
    referral_system?: { offer: string; request_script: string; incentive_model: string };
    content_calendar?: Array<{ day: number; format: string; topic: string; hook: string; caption: string; cta: string }>;
  };
  official_sources?: Array<{
    title: string;
    url: string;
    category: string;
    guidance: string;
  }>;
  action_center?: Array<{ timeframe: string; action: string; why: string; how: string; tool: string; cost_category: string; expected_metric: string }>;
  growth_roadmap?: { day_30: string; day_60: string; day_90: string };
  tracking_and_metrics?: Array<{ metric: string; target_baseline: string; how_to_measure: string }>;
  optimization_guidance?: { keep: string[]; change: string[]; pause: string[]; test: string[]; improve: string[]; next_experiment: string };
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

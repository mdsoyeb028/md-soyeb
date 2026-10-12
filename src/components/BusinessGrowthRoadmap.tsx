import React, { useState, useEffect, useMemo } from "react";
import {
  Rocket,
  TrendingUp,
  Globe,
  Award,
  Check,
  CheckSquare,
  Square,
  Copy,
  BookmarkCheck,
  Sparkles,
  RefreshCw,
  Plus,
  Trash2,
  AlertTriangle,
  Clock,
  Target,
  Download,
  Loader2,
  ChevronDown,
  ChevronUp,
  Briefcase,
  Layers,
  ArrowRight,
  Zap,
  CheckCircle2,
  ListChecks,
  SlidersHorizontal,
  Info
} from "lucide-react";
import { SavedItem } from "../types";
import { authFetch } from "../utils/apiHelper";
import { normalizeErrorMessage } from "../utils/errorUtils";
import { useLanguage } from "../i18n/LanguageContext";
import { useCredits } from "../context/CreditsContext";

export type BusinessStage = "startup" | "scaling" | "exporting" | "mature";

export interface RoadmapTask {
  id: string;
  title: string;
  phaseId: string;
  timeframe: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM";
  guidance: string;
  deliverable?: string;
  completed: boolean;
  isCustom?: boolean;
}

export interface RoadmapPhase {
  id: string;
  phaseNumber: number;
  title: string;
  focus: string;
  timeframe: string;
  tasks: RoadmapTask[];
}

export interface GrowthRoadmapData {
  businessName: string;
  businessType: string;
  stage: BusinessStage;
  stageLabel: string;
  timeHorizon: string;
  summary: string;
  keyBottleneckToAvoid?: string;
  recommendedQuickWin?: string;
  graduationMilestone?: string;
  phases: RoadmapPhase[];
}

interface BusinessGrowthRoadmapProps {
  onSaveItem: (item: Omit<SavedItem, "id" | "createdAt">) => void;
  defaultBusinessName?: string;
  defaultBusinessType?: string;
}

const STAGES_CONFIG: Array<{
  id: BusinessStage;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  description: string;
}> = [
  {
    id: "startup",
    label: "Startup & Launch",
    subtitle: "Idea to First 50 Paying Customers",
    icon: Rocket,
    accentColor: "from-emerald-500 to-teal-500",
    description: "Validate customer demand, legal entity setup, unit economics & direct client acquisition.",
  },
  {
    id: "scaling",
    label: "Scaling & Growth",
    subtitle: "Unit Economics & Systematization",
    icon: TrendingUp,
    accentColor: "from-blue-500 to-indigo-500",
    description: "Conversion funnels, paid/organic multi-channel growth, team delegation & margin expansion.",
  },
  {
    id: "exporting",
    label: "Global Exporting",
    subtitle: "Cross-Border Trade & B2B Importers",
    icon: Globe,
    accentColor: "from-cyan-500 to-blue-500",
    description: "HS code & IEC compliance, international Incoterms (FOB/CIF), buyer sourcing & freight logistics.",
  },
  {
    id: "mature",
    label: "Enterprise Moat",
    subtitle: "Optimization & Margin Defensibility",
    icon: Award,
    accentColor: "from-purple-500 to-pink-500",
    description: "Operational redundancy, supply chain integration, diversification & market dominance.",
  },
];

const BUSINESS_TYPE_PRESETS = [
  "E-Commerce & D2C Brands",
  "Handicrafts & Manufacturing",
  "B2B Consulting & Services",
  "SaaS & Digital Software",
  "Retail & Local Commercial Store",
  "Food, Beverage & FMCG",
  "Wholesale & Cross-Border Export",
  "Creative & Marketing Agency",
];

// Rich, grounded default templates for each stage
const DEFAULT_PRESETS: Record<BusinessStage, GrowthRoadmapData> = {
  startup: {
    businessName: "Aura Artisan Goods",
    businessType: "Handicrafts & Manufacturing",
    stage: "startup",
    stageLabel: "Startup & Launch Stage",
    timeHorizon: "90-Day Sprint",
    summary: "Your primary mandate is achieving customer validation and healthy unit margins before spending on broad marketing. Secure the first 10-50 paying customers through high-touch outreach.",
    recommendedQuickWin: "Conduct 5 interviews with target prospects to confirm problem urgency and minimum viable price resistance.",
    keyBottleneckToAvoid: "Over-investing in inventory or complex software before validating that customers will pay profitable prices.",
    graduationMilestone: "Achieve $5,000+ in monthly revenue with at least 20 organic or directly referred repeat customers.",
    phases: [
      {
        id: "startup-p1",
        phaseNumber: 1,
        title: "Phase 1: Market Validation & Unit Economics",
        focus: "Verify customer willingness to pay and establish profitable gross margins",
        timeframe: "Weeks 1 - 2",
        tasks: [
          {
            id: "su-t1",
            title: "Build Ideal Customer Profile (ICP) & Interview 10 Qualified Buyers",
            phaseId: "startup-p1",
            timeframe: "Days 1-3",
            priority: "CRITICAL",
            guidance: "Don't ask friends if they like the idea. Ask real prospects what they currently pay to solve this problem and what frustrates them.",
            deliverable: "1-page ICP profile document with validated price tolerance points.",
            completed: false,
          },
          {
            id: "su-t2",
            title: "Calculate COGS Floor, Gross Margin (≥45%) & Break-Even Volume",
            phaseId: "startup-p1",
            timeframe: "Days 4-6",
            priority: "CRITICAL",
            guidance: "Include direct labor, packaging, payment processing (2-3%), and shipping cushion into your unit cost basis.",
            deliverable: "Standardized unit pricing matrix for retail and initial wholesale.",
            completed: false,
          },
          {
            id: "su-t3",
            title: "Draft 1-Page Value Proposition & Unfair Advantage Statement",
            phaseId: "startup-p1",
            timeframe: "Week 2",
            priority: "HIGH",
            guidance: "State clearly: Who is it for, what exact bottleneck does it eliminate, and why can competitors not easily duplicate it?",
            deliverable: "30-second elevator pitch and core website hero copy.",
            completed: false,
          },
        ],
      },
      {
        id: "startup-p2",
        phaseNumber: 2,
        title: "Phase 2: Legal Foundation & Commercial Infrastructure",
        focus: "Legitimize the enterprise, secure compliance, and setup payment processing",
        timeframe: "Weeks 3 - 4",
        tasks: [
          {
            id: "su-t4",
            title: "Register Entity, Obtain Tax ID (GST/EIN) & Open Commercial Account",
            phaseId: "startup-p2",
            timeframe: "Week 3",
            priority: "HIGH",
            guidance: "Keep personal and business transactions 100% separate from Day 1 to avoid accounting nightmares and tax liability.",
            deliverable: "Active commercial business bank account with merchant gateway integration.",
            completed: false,
          },
          {
            id: "su-t5",
            title: "Launch Lean High-Speed Landing Page with Live Payment/Booking",
            phaseId: "startup-p2",
            timeframe: "Week 3-4",
            priority: "CRITICAL",
            guidance: "Do not build a 20-page website. A single conversion-optimized page with social proof, transparent pricing, and instant checkout converts 2x better.",
            deliverable: "Live mobile-responsive sales page with SSL and working checkout.",
            completed: false,
          },
          {
            id: "su-t6",
            title: "Draft Clear Terms, Refund Policy & Service Level Agreements",
            phaseId: "startup-p2",
            timeframe: "Week 4",
            priority: "MEDIUM",
            guidance: "A clear, reassuring 30-day money-back guarantee or transparent trial policy reduces purchase friction significantly.",
            deliverable: "Published commercial terms and customer satisfaction policy.",
            completed: false,
          },
        ],
      },
      {
        id: "startup-p3",
        phaseNumber: 3,
        title: "Phase 3: Direct Client Acquisition & First 25 Sales",
        focus: "Hand-to-hand customer acquisition without relying on expensive ad spend",
        timeframe: "Weeks 5 - 8",
        tasks: [
          {
            id: "su-t7",
            title: "Execute Direct Outreach to 50 Targeted Warm Prospects",
            phaseId: "startup-p3",
            timeframe: "Week 5",
            priority: "CRITICAL",
            guidance: "Use personalized messages explaining that you are taking on a limited cohort of 10 pilot clients with founder-level attention.",
            deliverable: "Minimum 12 scheduled calls or product demonstration samples sent.",
            completed: false,
          },
          {
            id: "su-t8",
            title: "Launch Time-Sensitive Early-Adopter Pricing Tier",
            phaseId: "startup-p3",
            timeframe: "Week 6",
            priority: "HIGH",
            guidance: "Offer special pricing or bonus onboarding in exchange for a detailed written review or video case study upon completion.",
            deliverable: "First 10 confirmed paying orders processed.",
            completed: false,
          },
          {
            id: "su-t9",
            title: "Capture High-Impact Client Testimonials & Visual Case Studies",
            phaseId: "startup-p3",
            timeframe: "Weeks 7-8",
            priority: "CRITICAL",
            guidance: "Document specific quantitative before-and-after results (e.g. 'Saved 6 hours/week', 'Delivered 3 days ahead of schedule').",
            deliverable: "3 published case study testimonials embedded on the sales page.",
            completed: false,
          },
        ],
      },
      {
        id: "startup-p4",
        phaseNumber: 4,
        title: "Phase 4: Feedback Loops & Repeatable Traction",
        focus: "Iterate on feedback, eliminate churn, and prepare for scale",
        timeframe: "Weeks 9 - 12",
        tasks: [
          {
            id: "su-t10",
            title: "Conduct 15-Minute Post-Purchase Experience Audits",
            phaseId: "startup-p4",
            timeframe: "Week 9",
            priority: "HIGH",
            guidance: "Ask: 'What almost prevented you from buying?' and 'What is the one thing we should improve?'",
            deliverable: "List of top 3 product/service refinements implemented.",
            completed: false,
          },
          {
            id: "su-t11",
            title: "Deploy Automated Referral & Repeat Purchase Incentive Flow",
            phaseId: "startup-p4",
            timeframe: "Week 10-11",
            priority: "MEDIUM",
            guidance: "Happy buyers are 4x more likely to refer friends within 7 days of their initial satisfaction.",
            deliverable: "Automated post-purchase referral incentive sequence.",
            completed: false,
          },
          {
            id: "su-t12",
            title: "Validate Unit Economics to Confirm Readiness for Scaling",
            phaseId: "startup-p4",
            timeframe: "Week 12",
            priority: "CRITICAL",
            guidance: "Ensure Gross Margin is above 45% and Customer Acquisition Cost is below 30% of first-order gross profit.",
            deliverable: "Monthly P&L summary showing positive contribution margin.",
            completed: false,
          },
        ],
      },
    ],
  },

  scaling: {
    businessName: "Summit Growth Dynamics",
    businessType: "B2B Services & Agency",
    stage: "scaling",
    stageLabel: "Scaling & Expansion Stage",
    timeHorizon: "90-Day Quarter",
    summary: "Your core product has achieved initial validation. The objective now is transforming manual founder efforts into systematized, predictable lead acquisition, delegation SOPs, and resilient cash flow.",
    recommendedQuickWin: "Audit customer acquisition channels to reallocate 40% of ad/effort budget directly into the single highest-converting channel.",
    keyBottleneckToAvoid: "Scaling un-delegated founder delivery tasks, creating quality control degradation and burnout.",
    graduationMilestone: "Reach $50,000+ MRR with a documented management layer and less than 15% customer churn.",
    phases: [
      {
        id: "scaling-p1",
        phaseNumber: 1,
        title: "Phase 1: Funnel Economics & Conversion Rate Optimization",
        focus: "Maximize revenue per website visitor and tighten unit margins",
        timeframe: "Month 1 (Weeks 1 - 4)",
        tasks: [
          {
            id: "sc-t1",
            title: "Audit Lifetime Value (LTV) to Customer Acquisition Cost (CAC) Ratio",
            phaseId: "scaling-p1",
            timeframe: "Week 1",
            priority: "CRITICAL",
            guidance: "A healthy scaling enterprise targets an LTV:CAC ratio above 3.5:1. If lower, focus on retention and pricing before ad scaling.",
            deliverable: "Cohort LTV vs CAC analytical report across key channels.",
            completed: false,
          },
          {
            id: "sc-t2",
            title: "Execute Conversion Rate Optimization (CRO) on Core Buying Paths",
            phaseId: "scaling-p1",
            timeframe: "Weeks 2-3",
            priority: "HIGH",
            guidance: "Eliminate checkout steps, test trust badges, introduce live chat assistance, and add 1-click payment methods.",
            deliverable: "Minimum 15-25% increase in baseline checkout completion rate.",
            completed: false,
          },
          {
            id: "sc-t3",
            title: "Deploy Automated Abandoned Cart & Incomplete Inquiry Retargeting",
            phaseId: "scaling-p1",
            timeframe: "Week 4",
            priority: "HIGH",
            guidance: "Send a 3-step sequence: 1 hour (help/inquiry), 24 hours (social proof), 48 hours (limited-time incentive).",
            deliverable: "Automated sequence recovering 8-14% of abandoned prospects.",
            completed: false,
          },
        ],
      },
      {
        id: "scaling-p2",
        phaseNumber: 2,
        title: "Phase 2: Systematic Multi-Channel Acquisition Engine",
        focus: "Diversify from word-of-mouth into reliable paid and organic acquisition pipelines",
        timeframe: "Month 2 (Weeks 5 - 8)",
        tasks: [
          {
            id: "sc-t4",
            title: "Scale Paid Performance Acquisition with Strict ROAS Thresholds",
            phaseId: "scaling-p2",
            timeframe: "Weeks 5-6",
            priority: "CRITICAL",
            guidance: "Increase budget only on ad creatives that maintain target Return on Ad Spend (ROAS ≥ 2.8x) over a 7-day rolling window.",
            deliverable: "Profitable paid advertising dashboard generating predictable inbound inquiries.",
            completed: false,
          },
          {
            id: "sc-t5",
            title: "Build High-Intent Commercial Search Engine Optimization (SEO) Hub",
            phaseId: "scaling-p2",
            timeframe: "Weeks 6-7",
            priority: "HIGH",
            guidance: "Target buyer-intent keywords (e.g. 'best wholesale brass tableware supplier') rather than high-volume informational terms.",
            deliverable: "5 commercial landing pages indexed with schema markup and backlink strategy.",
            completed: false,
          },
          {
            id: "sc-t6",
            title: "Launch Structured Strategic B2B Partner / Affiliate Referral System",
            phaseId: "scaling-p2",
            timeframe: "Week 8",
            priority: "MEDIUM",
            guidance: "Partner with complementary non-competing businesses that already serve your exact target customer.",
            deliverable: "3 signed commercial partner referral agreements with clear revenue-share terms.",
            completed: false,
          },
        ],
      },
      {
        id: "scaling-p3",
        phaseNumber: 3,
        title: "Phase 3: Operational Systematization & Team Delegation",
        focus: "Remove founder bottlenecks by standardizing operating procedures",
        timeframe: "Month 3 (Weeks 9 - 12)",
        tasks: [
          {
            id: "sc-t7",
            title: "Document Step-by-Step SOPs for Top 5 Repetitive Workflows",
            phaseId: "scaling-p3",
            timeframe: "Week 9-10",
            priority: "CRITICAL",
            guidance: "Record short screencasts with checklists for order processing, customer support handoffs, and fulfillment checks.",
            deliverable: "Internal Knowledge Base with documented operational protocols.",
            completed: false,
          },
          {
            id: "sc-t8",
            title: "Implement CRM Lead Scoring & Intelligent Task Routing",
            phaseId: "scaling-p3",
            timeframe: "Week 11",
            priority: "HIGH",
            guidance: "Ensure high-budget inquiries are routed to senior closers within 5 minutes of form submission.",
            deliverable: "Automated CRM pipeline with SLA notifications for response times under 15 minutes.",
            completed: false,
          },
          {
            id: "sc-t9",
            title: "Hire or Delegate Operational Manager / Project Lead",
            phaseId: "scaling-p3",
            timeframe: "Week 12",
            priority: "CRITICAL",
            guidance: "The founder must transition from 'doing the work' to 'architecting the system and closing key deals'.",
            deliverable: "Onboarded operations manager handling day-to-day fulfillment execution.",
            completed: false,
          },
        ],
      },
    ],
  },

  exporting: {
    businessName: "Vedic Crafts Global Trade",
    businessType: "Wholesale & Cross-Border Export",
    stage: "exporting",
    stageLabel: "Global Export & Expansion Stage",
    timeHorizon: "90-Day Quarter",
    summary: "Cross-border global expansion requires strict trade compliance, containerized Incoterms costing, overseas buyer vetting, and risk-hedged international payment mechanisms.",
    recommendedQuickWin: "Identify your exact 8-digit HS Code and verify destination country import tariffs and duty-free trade agreements.",
    keyBottleneckToAvoid: "Quoting destination prices without factoring in maritime insurance, customs brokerage fees, and foreign exchange hedging.",
    graduationMilestone: "Successfully dispatch and clear first 2 full commercial export shipments with zero customs compliance penalties.",
    phases: [
      {
        id: "export-p1",
        phaseNumber: 1,
        title: "Phase 1: International Market Selection & Regulatory Clearance",
        focus: "Target country compliance, trade codes, and statutory licensing",
        timeframe: "Month 1 (Weeks 1 - 4)",
        tasks: [
          {
            id: "ex-t1",
            title: "Determine 8-Digit HS Codes & Analyze Import Duties in Target Countries",
            phaseId: "export-p1",
            timeframe: "Week 1",
            priority: "CRITICAL",
            guidance: "Verify if preferential trade agreements (e.g. CEPA, FTA) offer lower tariffs for your origin country.",
            deliverable: "Comprehensive tariff & regulatory matrix for top 3 target countries.",
            completed: false,
          },
          {
            id: "ex-t2",
            title: "Secure Mandatory Export Licensing (IEC, RCMC & Chamber of Commerce)",
            phaseId: "export-p1",
            timeframe: "Weeks 2-3",
            priority: "CRITICAL",
            guidance: "Ensure your commercial invoice entity matches your registered Import-Export Code (IEC) and bank records exactly.",
            deliverable: "Verified IEC certification and Export Promotion Council registration.",
            completed: false,
          },
          {
            id: "ex-t3",
            title: "Confirm Destination Regulatory Compliance (FDA, CE, REACH, UKCA)",
            phaseId: "export-p1",
            timeframe: "Weeks 3-4",
            priority: "CRITICAL",
            guidance: "Non-compliant shipments can be impounded or destroyed at destination customs. Secure test lab certificates in advance.",
            deliverable: "Product safety compliance certificates and Material Safety Data Sheets (MSDS).",
            completed: false,
          },
        ],
      },
      {
        id: "export-p2",
        phaseNumber: 2,
        title: "Phase 2: Landed Cost Modeling, Incoterms & Protective Packaging",
        focus: "Establish profitable cross-border pricing and sea/air freight protection",
        timeframe: "Month 2 (Weeks 5 - 8)",
        tasks: [
          {
            id: "ex-t4",
            title: "Build Landed Cost & Incoterms Calculator (FOB, CIF & DDP)",
            phaseId: "export-p2",
            timeframe: "Week 5",
            priority: "CRITICAL",
            guidance: "Clearly separate product price from origin port handling (FOB), ocean freight & insurance (CIF), and destination duty (DDP).",
            deliverable: "Standardized Incoterms quote template with Minimum Order Quantities (MOQ).",
            completed: false,
          },
          {
            id: "ex-t5",
            title: "Design Export-Grade Palletized Packaging & Barcoding (GS1)",
            phaseId: "export-p2",
            timeframe: "Weeks 6-7",
            priority: "HIGH",
            guidance: "International transit requires 5-ply to 7-ply corrugated cartons, desiccants, and fumigated wooden pallets (ISPM-15).",
            deliverable: "Drop-tested export packaging specifications and GS1 barcode labels.",
            completed: false,
          },
          {
            id: "ex-t6",
            title: "Establish Multi-Currency Business Account & Letter of Credit (L/C) Desk",
            phaseId: "export-p2",
            timeframe: "Week 8",
            priority: "HIGH",
            guidance: "Protect against non-payment by demanding Irrevocable Confirmed Letters of Credit or 30% advance with 70% against Bill of Lading.",
            deliverable: "Active multi-currency receiving accounts (USD, EUR, GBP, AED).",
            completed: false,
          },
        ],
      },
      {
        id: "export-p3",
        phaseNumber: 3,
        title: "Phase 3: Overseas B2B Importer Sourcing & Outreach",
        focus: "Target international wholesalers, trade catalogs, and sample evaluation",
        timeframe: "Month 3 (Weeks 9 - 12)",
        tasks: [
          {
            id: "ex-t7",
            title: "Build Directory of 100 Verified Importers & Distributors in Target Market",
            phaseId: "export-p3",
            timeframe: "Week 9-10",
            priority: "CRITICAL",
            guidance: "Leverage trade directories (Kompass, Panjiva, ImportGenius) and trade council buyer lists rather than generic web scrapers.",
            deliverable: "Database of 100 decision-maker purchasing contacts with verified corporate emails.",
            completed: false,
          },
          {
            id: "ex-t8",
            title: "Publish International B2B Wholesale Lookbook & Spec Catalog",
            phaseId: "export-p3",
            timeframe: "Week 11",
            priority: "HIGH",
            guidance: "Highlight MOQs, lead times, container packing metrics (CBM), and high-resolution product photography.",
            deliverable: "High-resolution PDF export catalog and secure B2B wholesale portal link.",
            completed: false,
          },
          {
            id: "ex-t9",
            title: "Partner with Licensed Customs Freight Broker & Dispatch Evaluation Samples",
            phaseId: "export-p3",
            timeframe: "Week 12",
            priority: "CRITICAL",
            guidance: "Partner with an experienced Freight Forwarder with offices at both your origin port and target destination.",
            deliverable: "Signed freight logistics agreement and first commercial sample orders dispatched.",
            completed: false,
          },
        ],
      },
    ],
  },

  mature: {
    businessName: "OmniCorp Industrial",
    businessType: "Manufacturing & Enterprise",
    stage: "mature",
    stageLabel: "Enterprise Maturity & Moat Stage",
    timeHorizon: "180-Day Strategic Plan",
    summary: "With established market position, the strategic focus centers on margin defensibility, proprietary supplier exclusivity, technology automation, and exploring M&A or new territory expansion.",
    recommendedQuickWin: "Conduct a vendor renegotiation across your top 5 suppliers to extract a 5-8% margin improvement on bulk contracts.",
    keyBottleneckToAvoid: "Bureaucratic inertia and declining customer responsiveness to innovative competitor offerings.",
    graduationMilestone: "Achieve consistent 25%+ operating margins and automated, founder-independent executive leadership.",
    phases: [
      {
        id: "mature-p1",
        phaseNumber: 1,
        title: "Phase 1: Operational Margin Expansion & Supply Chain Exclusivity",
        focus: "Extract hidden profits and protect raw material access",
        timeframe: "Month 1 - 2",
        tasks: [
          {
            id: "mt-t1",
            title: "Renegotiate Tier-1 Supply Contracts with Volume Guarantees",
            phaseId: "mature-p1",
            timeframe: "Weeks 1-3",
            priority: "CRITICAL",
            guidance: "Leverage historical reliable payment history to negotiate extended payment terms (Net 60/90) and volume price breaks.",
            deliverable: "Updated supply agreements saving 4-8% on annual procurement costs.",
            completed: false,
          },
          {
            id: "mt-t2",
            title: "Implement Automated ERP Inventory & Working Capital Forecasting",
            phaseId: "mature-p1",
            timeframe: "Weeks 4-8",
            priority: "HIGH",
            guidance: "Prevent cash dead-weight in slow-moving inventory with automated reorder trigger algorithms.",
            deliverable: "Live inventory management dashboard with 60-day predictive ordering.",
            completed: false,
          },
        ],
      },
      {
        id: "mature-p2",
        phaseNumber: 2,
        title: "Phase 2: Proprietary Moats & Intellectual Property Protection",
        focus: "Defend against lower-cost copycats and build enterprise valuation",
        timeframe: "Month 3 - 6",
        tasks: [
          {
            id: "mt-t3",
            title: "File Core Trademarks, Patents & Exclusive Design Rights",
            phaseId: "mature-p2",
            timeframe: "Month 3",
            priority: "HIGH",
            guidance: "Register international trademarks via the Madrid System in all key export and operational markets.",
            deliverable: "Registered IP portfolio documentation protecting commercial brand assets.",
            completed: false,
          },
          {
            id: "mt-t4",
            title: "Formulate Strategic M&A or Channel Acquisition Target List",
            phaseId: "mature-p2",
            timeframe: "Month 4-6",
            priority: "MEDIUM",
            guidance: "Identify smaller boutique competitors or regional distributors that can be acquired for faster market share capture.",
            deliverable: "Executive M&A pipeline and business valuation briefing.",
            completed: false,
          },
        ],
      },
    ],
  },
};

export const BusinessGrowthRoadmap: React.FC<BusinessGrowthRoadmapProps> = ({
  onSaveItem,
  defaultBusinessName = "My Business",
  defaultBusinessType = "Handicrafts & Manufacturing",
}) => {
  const { languageInfo } = useLanguage();
  const { canPerformAIAction, consumeCredit, openSignupModal, openLimitModal } = useCredits();

  // Configuration Form State
  const [selectedStage, setSelectedStage] = useState<BusinessStage>("startup");
  const [businessName, setBusinessName] = useState(defaultBusinessName);
  const [businessType, setBusinessType] = useState(defaultBusinessType);
  const [customBusinessType, setCustomBusinessType] = useState("");
  const [growthGoals, setGrowthGoals] = useState("Acquire first 50 paying customers and scale monthly revenue");
  const [targetMarket, setTargetMarket] = useState("Domestic & International Tier-1 Cities");
  const [timeHorizon, setTimeHorizon] = useState("90-Day Quarter");

  // Active Roadmap Data
  const [roadmap, setRoadmap] = useState<GrowthRoadmapData>(() => DEFAULT_PRESETS["startup"]);
  const [activeFilter, setActiveFilter] = useState<"all" | "pending" | "completed">("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "CRITICAL">("all");
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTaskIds, setExpandedTaskIds] = useState<Record<string, boolean>>({});

  // New Custom Task modal/input state
  const [showAddTaskModal, setShowAddTaskModal] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"CRITICAL" | "HIGH" | "MEDIUM">("HIGH");
  const [newTaskTimeframe, setNewTaskTimeframe] = useState("Next 7 Days");
  const [newTaskGuidance, setNewTaskGuidance] = useState("");

  // Loading & Feedback
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  // Sync preset when user switches stage if not generated by AI yet
  const handleStageChange = (newStage: BusinessStage) => {
    setSelectedStage(newStage);
    const preset = DEFAULT_PRESETS[newStage];
    setRoadmap({
      ...preset,
      businessName: businessName || preset.businessName,
      businessType: businessType || preset.businessType,
      timeHorizon: timeHorizon || preset.timeHorizon,
    });
    setHasSaved(false);
  };

  // Toggle Task Completion
  const toggleTaskCompletion = (taskId: string) => {
    setRoadmap((prev) => {
      const updatedPhases = prev.phases.map((phase) => ({
        ...phase,
        tasks: phase.tasks.map((task) =>
          task.id === taskId ? { ...task, completed: !task.completed } : task
        ),
      }));
      return { ...prev, phases: updatedPhases };
    });
    setHasSaved(false);
  };

  // Toggle Guidance Details
  const toggleGuidance = (taskId: string) => {
    setExpandedTaskIds((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  // Add Custom Task
  const handleAddCustomTask = (phaseId: string) => {
    if (!newTaskTitle.trim()) return;
    const newTask: RoadmapTask = {
      id: `custom-${Date.now()}`,
      title: newTaskTitle.trim(),
      phaseId,
      timeframe: newTaskTimeframe || "This Week",
      priority: newTaskPriority,
      guidance: newTaskGuidance.trim() || "Custom task prioritized by business owner.",
      completed: false,
      isCustom: true,
    };

    setRoadmap((prev) => ({
      ...prev,
      phases: prev.phases.map((phase) =>
        phase.id === phaseId ? { ...phase, tasks: [...phase.tasks, newTask] } : phase
      ),
    }));

    setNewTaskTitle("");
    setNewTaskGuidance("");
    setShowAddTaskModal(null);
  };

  // Remove Task
  const handleDeleteTask = (taskId: string) => {
    setRoadmap((prev) => ({
      ...prev,
      phases: prev.phases.map((phase) => ({
        ...phase,
        tasks: phase.tasks.filter((t) => t.id !== taskId),
      })),
    }));
  };

  // Generate Bespoke Roadmap with AI
  const handleGenerateAiRoadmap = async () => {
    const creditCheck = canPerformAIAction();
    if (!creditCheck.allowed) {
      if (creditCheck.reason === "need_signup") openSignupModal();
      else if (creditCheck.reason === "daily_limit_reached") openLimitModal();
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);

    const activeType = businessType === "Other" && customBusinessType ? customBusinessType : businessType;

    try {
      const res = await authFetch("/api/ai/business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toolType: "growth-roadmap",
          inputData: {
            businessName: businessName.trim() || "My Business",
            businessType: activeType,
            stage: selectedStage,
            goals: growthGoals,
            targetMarket,
            timeframe: timeHorizon,
          },
          language: languageInfo.code,
          languageName: `${languageInfo.nativeName} (${languageInfo.name})`,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.error || "Failed to generate AI growth roadmap.");
      }

      const generated = data.roadmap || data.data?.roadmap;
      if (generated && generated.phases && Array.isArray(generated.phases)) {
        // Map server phases to interactive checklist tasks
        const formattedPhases: RoadmapPhase[] = generated.phases.map((p: any, pIdx: number) => ({
          id: `phase-${pIdx + 1}-${Date.now()}`,
          phaseNumber: p.phaseNumber || pIdx + 1,
          title: p.title || `Phase ${pIdx + 1}`,
          focus: p.focus || "",
          timeframe: p.timeframe || "",
          tasks: (p.tasks || []).map((t: any, tIdx: number) => ({
            id: `task-${pIdx + 1}-${tIdx + 1}-${Date.now()}`,
            title: t.title || "Actionable Milestone",
            phaseId: `phase-${pIdx + 1}-${Date.now()}`,
            timeframe: t.timeframe || "Upcoming",
            priority: (t.priority?.toUpperCase() as any) || "HIGH",
            guidance: t.guidance || t.description || "",
            deliverable: t.deliverable || "",
            completed: false,
          })),
        }));

        setRoadmap({
          businessName: generated.businessName || businessName,
          businessType: generated.businessType || activeType,
          stage: selectedStage,
          stageLabel: generated.stageLabel || STAGES_CONFIG.find((s) => s.id === selectedStage)?.label || "Custom Stage",
          timeHorizon: generated.timeHorizon || timeHorizon,
          summary: generated.summary || "Actionable customized commercial growth roadmap.",
          keyBottleneckToAvoid: generated.keyBottleneckToAvoid,
          recommendedQuickWin: generated.recommendedQuickWin,
          graduationMilestone: generated.graduationMilestone,
          phases: formattedPhases,
        });

        await consumeCredit();
      } else {
        // Fallback to text if structured JSON wasn't delivered
        const fallbackText = data.content || data.data?.content || "";
        throw new Error("AI returned raw brief. Using customized preset structure with tailored parameters.");
      }
    } catch (err: unknown) {
      console.warn("AI roadmap generation notice:", err);
      const msg = normalizeErrorMessage(err, "Could not generate fresh AI plan. Loaded verified tactical blueprint.");
      setErrorMessage(msg);
      // Ensure user always has a high-quality roadmap loaded
      const preset = DEFAULT_PRESETS[selectedStage];
      setRoadmap({
        ...preset,
        businessName: businessName || preset.businessName,
        businessType: activeType,
        timeHorizon,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Overall Metrics Calculation
  const totalTasks = useMemo(() => {
    return roadmap.phases.reduce((acc, p) => acc + p.tasks.length, 0);
  }, [roadmap]);

  const completedTasks = useMemo(() => {
    return roadmap.phases.reduce(
      (acc, p) => acc + p.tasks.filter((t) => t.completed).length,
      0
    );
  }, [roadmap]);

  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const criticalTasksCount = useMemo(() => {
    return roadmap.phases.reduce(
      (acc, p) => acc + p.tasks.filter((t) => t.priority === "CRITICAL").length,
      0
    );
  }, [roadmap]);

  // Filtered Task Display
  const filteredPhases = useMemo(() => {
    return roadmap.phases
      .filter((p) => selectedPhaseFilter === "all" || p.id === selectedPhaseFilter)
      .map((phase) => {
        const filteredTasks = phase.tasks.filter((task) => {
          // Status filter
          if (activeFilter === "pending" && task.completed) return false;
          if (activeFilter === "completed" && !task.completed) return false;
          // Priority filter
          if (priorityFilter === "CRITICAL" && task.priority !== "CRITICAL") return false;
          // Search query
          if (
            searchQuery.trim() &&
            !task.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
            !task.guidance.toLowerCase().includes(searchQuery.toLowerCase())
          ) {
            return false;
          }
          return true;
        });

        return { ...phase, tasks: filteredTasks };
      });
  }, [roadmap, selectedPhaseFilter, activeFilter, priorityFilter, searchQuery]);

  // Markdown Checklist Generator for Copy & Export
  const generateMarkdownChecklist = (): string => {
    let md = `# Business Growth Roadmap: ${roadmap.businessName}\n`;
    md += `**Stage:** ${roadmap.stageLabel} | **Horizon:** ${roadmap.timeHorizon} | **Progress:** ${completedTasks}/${totalTasks} (${completionPercentage}%)\n\n`;
    md += `> ${roadmap.summary}\n\n`;

    if (roadmap.recommendedQuickWin) {
      md += `**⚡ 48-Hour Quick Win:** ${roadmap.recommendedQuickWin}\n`;
    }
    if (roadmap.keyBottleneckToAvoid) {
      md += `**⚠️ Key Bottleneck to Avoid:** ${roadmap.keyBottleneckToAvoid}\n`;
    }
    if (roadmap.graduationMilestone) {
      md += `**🎯 Graduation Milestone:** ${roadmap.graduationMilestone}\n\n`;
    }

    md += `---\n\n`;

    roadmap.phases.forEach((phase) => {
      md += `### ${phase.title} (${phase.timeframe})\n`;
      if (phase.focus) md += `*Focus:* ${phase.focus}\n\n`;

      phase.tasks.forEach((t) => {
        const check = t.completed ? "[x]" : "[ ]";
        md += `- ${check} **[${t.priority}] ${t.title}** (${t.timeframe})\n`;
        if (t.guidance) md += `  - *Guidance:* ${t.guidance}\n`;
        if (t.deliverable) md += `  - *Deliverable:* ${t.deliverable}\n`;
      });
      md += `\n`;
    });

    return md;
  };

  // Copy to Clipboard
  const handleCopy = () => {
    const md = generateMarkdownChecklist();
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  // Save to Saved Items
  const handleSaveToVault = () => {
    if (hasSaved) return;
    const md = generateMarkdownChecklist();
    onSaveItem({
      type: "business",
      title: `Roadmap: ${roadmap.businessName} (${roadmap.stageLabel})`,
      summary: `${roadmap.stageLabel} checklist. ${completedTasks}/${totalTasks} milestones completed (${completionPercentage}%).`,
      content: md,
      category: "Growth Roadmap",
      tags: [roadmap.stage, roadmap.businessType, "Roadmap", "Checklist"],
    });
    setHasSaved(true);
  };

  // Download File
  const handleDownloadFile = () => {
    const md = generateMarkdownChecklist();
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `growth-roadmap-${roadmap.businessName.toLowerCase().replace(/[^a-z0-9]/g, "-")}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-950/80 via-slate-900/90 to-cyan-950/80 border border-emerald-500/30 backdrop-blur-2xl shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <ListChecks className="w-3.5 h-3.5" />
              <span>Step-by-Step Execution Engine</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Business Growth Roadmap Generator
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Create an interactive, milestone-based checklist customized for your specific business type and stage.
              Track your progress from startup launch to unit-economic scaling and global exporting.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopy}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-600 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              title="Copy checklist in Markdown"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copied ? "Copied Checklist!" : "Copy Markdown"}</span>
            </button>

            <button
              onClick={handleSaveToVault}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border cursor-pointer shadow-md ${
                hasSaved
                  ? "bg-emerald-950 text-emerald-300 border-emerald-500/50"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500"
              }`}
              title="Save to your cloud vault"
            >
              <BookmarkCheck className="w-3.5 h-3.5" />
              <span>{hasSaved ? "Saved in Vault" : "Save Roadmap"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Stage & Business Type Configurator */}
      <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              1. Select Your Business Stage &amp; Parameters
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            Roadmap dynamically customizes tasks for this stage
          </span>
        </div>

        {/* Stage Selector Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {STAGES_CONFIG.map((st) => {
            const Icon = st.icon;
            const isSelected = selectedStage === st.id;
            return (
              <button
                key={st.id}
                onClick={() => handleStageChange(st.id)}
                className={`p-3.5 rounded-2xl text-left transition-all border flex flex-col justify-between gap-3 cursor-pointer group relative overflow-hidden ${
                  isSelected
                    ? "bg-slate-950/90 border-emerald-500/80 shadow-lg shadow-emerald-500/15 ring-1 ring-emerald-500/40"
                    : "bg-slate-950/40 hover:bg-slate-950/80 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                        isSelected ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-white">{st.label}</h4>
                  <span className="text-[10px] text-emerald-400/90 font-medium block mt-0.5">
                    {st.subtitle}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {st.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Detailed Business Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Business / Brand Name
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Aura Artisan Goods"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Business Type / Industry
            </label>
            <select
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white outline-none transition-colors"
            >
              {BUSINESS_TYPE_PRESETS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
              <option value="Other">Other (Custom Niche)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Time Horizon
            </label>
            <select
              value={timeHorizon}
              onChange={(e) => setTimeHorizon(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white outline-none transition-colors"
            >
              <option value="30-Day Sprint">30-Day Sprint (Immediate Traction)</option>
              <option value="90-Day Quarter">90-Day Quarter (Recommended)</option>
              <option value="6-Month Strategic Plan">6-Month Scale Plan</option>
              <option value="1-Year Expansion Plan">1-Year Expansion Plan</option>
            </select>
          </div>
        </div>

        {businessType === "Other" && (
          <div className="text-xs">
            <label className="block text-slate-300 font-semibold mb-1">
              Specify Custom Business Type &amp; Core Niche
            </label>
            <input
              type="text"
              value={customBusinessType}
              onChange={(e) => setCustomBusinessType(e.target.value)}
              placeholder="e.g. Solar panel installation, artisanal vegan cheese, boutique legal advisory"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white outline-none"
            />
          </div>
        )}

        {/* Primary Growth Goal & AI Generation CTA */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
          <div className="sm:col-span-3 text-xs">
            <label className="block text-slate-300 font-semibold mb-1">
              Primary Growth Target / Current Bottleneck
            </label>
            <input
              type="text"
              value={growthGoals}
              onChange={(e) => setGrowthGoals(e.target.value)}
              placeholder="e.g. Acquire first 50 B2B buyers, double wholesale revenue, secure reliable suppliers"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white outline-none"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleGenerateAiRoadmap}
              disabled={isGenerating}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-emerald-200" />
                  <span>Generate AI Roadmap</span>
                </>
              )}
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* 3. Interactive Progress Tracker & Roadmap Dashboard */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 backdrop-blur-xl shadow-2xl space-y-6">
        {/* Top Progress & Executive Insights */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">
                  {roadmap.businessName} — Growth Checklist
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase">
                  {roadmap.stageLabel}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Target Horizon: <span className="text-slate-200 font-semibold">{roadmap.timeHorizon}</span> • Business Type: <span className="text-slate-200 font-semibold">{roadmap.businessType}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadFile}
                className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export .md</span>
              </button>
            </div>
          </div>

          {/* Progress Bar Container */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Roadmap Completion Progress</span>
              </span>
              <span className="font-mono font-bold text-emerald-400">
                {completedTasks} of {totalTasks} milestones completed ({completionPercentage}%)
              </span>
            </div>

            {/* Visual Bar */}
            <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 rounded-full transition-all duration-500 ease-out shadow-sm"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>

            {/* Quick Metrics Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center text-xs">
              <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase font-semibold">Total Milestones</span>
                <span className="font-mono font-bold text-white text-sm">{totalTasks}</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase font-semibold">Completed</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">{completedTasks}</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase font-semibold">Remaining</span>
                <span className="font-mono font-bold text-amber-400 text-sm">{totalTasks - completedTasks}</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase font-semibold">Critical Tasks</span>
                <span className="font-mono font-bold text-rose-400 text-sm">{criticalTasksCount}</span>
              </div>
            </div>
          </div>

          {/* Strategic Executive Insights Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {roadmap.recommendedQuickWin && (
              <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                  <Zap className="w-3.5 h-3.5 text-emerald-400" />
                  <span>48-Hour Quick Win</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {roadmap.recommendedQuickWin}
                </p>
              </div>
            )}

            {roadmap.keyBottleneckToAvoid && (
              <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/30 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Key Pitfall to Avoid</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {roadmap.keyBottleneckToAvoid}
                </p>
              </div>
            )}

            {roadmap.graduationMilestone && (
              <div className="p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-cyan-300">
                  <Target className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Next Stage Graduation Gate</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {roadmap.graduationMilestone}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 4. Filter & Search Controls */}
        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800">
            <button
              onClick={() => setActiveFilter("all")}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                activeFilter === "all" ? "bg-emerald-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              All ({totalTasks})
            </button>
            <button
              onClick={() => setActiveFilter("pending")}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                activeFilter === "pending" ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              Pending ({totalTasks - completedTasks})
            </button>
            <button
              onClick={() => setActiveFilter("completed")}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                activeFilter === "completed" ? "bg-emerald-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              Completed ({completedTasks})
            </button>
          </div>

          {/* Priority & Phase Dropdowns */}
          <div className="flex items-center gap-2">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs outline-none"
            >
              <option value="all">All Priorities</option>
              <option value="CRITICAL">🔴 Critical Only</option>
            </select>

            <select
              value={selectedPhaseFilter}
              onChange={(e) => setSelectedPhaseFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs outline-none max-w-[180px] truncate"
            >
              <option value="all">All Phases</option>
              {roadmap.phases.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-xs outline-none w-36 sm:w-48"
            />
          </div>
        </div>

        {/* 5. Sequential Phase Cards */}
        <div className="space-y-5">
          {filteredPhases.map((phase) => {
            const phaseCompletedCount = phase.tasks.filter((t) => t.completed).length;
            const phaseTotalCount = phase.tasks.length;
            const isPhaseDone = phaseTotalCount > 0 && phaseCompletedCount === phaseTotalCount;

            return (
              <div
                key={phase.id}
                className={`rounded-2xl border transition-all ${
                  isPhaseDone
                    ? "bg-slate-950/40 border-emerald-500/30 shadow-sm"
                    : "bg-slate-950/80 border-slate-800 shadow-md"
                }`}
              >
                {/* Phase Header */}
                <div className="p-4 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs ${
                        isPhaseDone
                          ? "bg-emerald-500 text-slate-950"
                          : "bg-slate-800 text-emerald-400 border border-emerald-500/30"
                      }`}
                    >
                      {phase.phaseNumber}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white">{phase.title}</h4>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-900 text-slate-400 border border-slate-800">
                          {phase.timeframe}
                        </span>
                      </div>
                      {phase.focus && (
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          <strong className="text-slate-300">Focus:</strong> {phase.focus}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <span className="text-[11px] font-mono text-slate-400">
                      {phaseCompletedCount}/{phaseTotalCount} done
                    </span>
                    <button
                      onClick={() => setShowAddTaskModal(phase.id)}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-800 hover:border-emerald-500/40 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Add task to this phase"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Task</span>
                    </button>
                  </div>
                </div>

                {/* Task Checklist Items */}
                <div className="divide-y divide-slate-800/50">
                  {phase.tasks.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      No milestones match current filters for this phase.
                    </div>
                  ) : (
                    phase.tasks.map((task) => {
                      const isExpanded = Boolean(expandedTaskIds[task.id]);

                      return (
                        <div
                          key={task.id}
                          className={`p-3.5 sm:p-4 transition-colors ${
                            task.completed ? "bg-slate-950/20 opacity-75" : "hover:bg-slate-900/30"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {/* Checkbox */}
                            <button
                              type="button"
                              onClick={() => toggleTaskCompletion(task.id)}
                              className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                                task.completed
                                  ? "bg-emerald-500 text-slate-950 border border-emerald-400 shadow-sm shadow-emerald-500/30"
                                  : "border-2 border-slate-600 hover:border-emerald-400 text-transparent hover:text-emerald-400/50"
                              }`}
                              title={task.completed ? "Mark incomplete" : "Mark milestone complete"}
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </button>

                            {/* Task Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                {/* Priority badge */}
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                    task.priority === "CRITICAL"
                                      ? "bg-rose-950/80 text-rose-300 border border-rose-500/40"
                                      : task.priority === "HIGH"
                                      ? "bg-amber-950/80 text-amber-300 border border-amber-500/40"
                                      : "bg-blue-950/80 text-blue-300 border border-blue-500/40"
                                  }`}
                                >
                                  {task.priority}
                                </span>

                                {/* Timeframe */}
                                <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5" />
                                  <span>{task.timeframe}</span>
                                </span>

                                {task.isCustom && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-950 text-purple-300 border border-purple-800">
                                    Custom Task
                                  </span>
                                )}
                              </div>

                              <p
                                className={`text-xs sm:text-sm font-semibold transition-all ${
                                  task.completed
                                    ? "line-through text-slate-500 font-normal"
                                    : "text-white"
                                }`}
                              >
                                {task.title}
                              </p>

                              {/* Guidance & Deliverable Snippets */}
                              {(task.guidance || task.deliverable) && (
                                <div className="mt-2 space-y-1.5 text-xs">
                                  {task.guidance && (
                                    <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-slate-300 leading-relaxed text-[11px]">
                                      <strong className="text-emerald-400 font-semibold block mb-0.5">
                                        💡 Tactical Execution Guidance:
                                      </strong>
                                      {task.guidance}
                                    </div>
                                  )}

                                  {task.deliverable && (
                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono pt-0.5">
                                      <Target className="w-3 h-3 text-cyan-400 shrink-0" />
                                      <span>
                                        <strong className="text-slate-300">KPI / Deliverable:</strong> {task.deliverable}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 shrink-0">
                              {task.isCustom && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                                  title="Delete custom task"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Add Custom Task Form Inline */}
                {showAddTaskModal === phase.id && (
                  <div className="p-4 bg-slate-900/90 border-t border-slate-800 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs flex items-center gap-1.5">
                        <Plus className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Add Custom Milestone to {phase.title}</span>
                      </span>
                      <button
                        onClick={() => setShowAddTaskModal(null)}
                        className="text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>

                    <input
                      type="text"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="e.g. Schedule call with local freight forwarder, finalize distributor agreement..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-emerald-500 outline-none"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">Priority</label>
                        <select
                          value={newTaskPriority}
                          onChange={(e) => setNewTaskPriority(e.target.value as any)}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none"
                        >
                          <option value="CRITICAL">🔴 CRITICAL</option>
                          <option value="HIGH">🟠 HIGH</option>
                          <option value="MEDIUM">🔵 MEDIUM</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">Timeframe</label>
                        <input
                          type="text"
                          value={newTaskTimeframe}
                          onChange={(e) => setNewTaskTimeframe(e.target.value)}
                          placeholder="e.g. Next 3 Days"
                          className="w-full px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none"
                        />
                      </div>

                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => handleAddCustomTask(phase.id)}
                          className="w-full py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors cursor-pointer"
                        >
                          Save Task
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

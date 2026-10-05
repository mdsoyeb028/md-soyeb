import React, { useState } from "react";
import { 
  Bot, 
  Search, 
  CheckCircle2, 
  FileText, 
  Sliders, 
  Layers, 
  FileCheck, 
  Settings as SettingsIcon,
  Mic,
  TrendingUp,
  Globe,
  Share2,
  Package,
  BarChart3,
  Users,
  Target,
  Youtube,
  Smartphone,
  MapPin,
  ShieldAlert,
  Image as ImageIcon,
  ExternalLink,
  Code,
  Lock,
  Zap,
  CreditCard,
  User as UserIcon,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  X,
  Sparkles,
  MessageSquare,
  PhoneCall,
  UserCheck,
  MessageCircle,
  Calendar,
  BookOpen,
  UserX,
  Link2
} from "lucide-react";
import { ActiveTab } from "../types";

export interface DashboardSidebarProps {
  activeTab: ActiveTab;
  currentSection: string;
  onNavigate: (tab: ActiveTab, section?: any) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  agentName?: string;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  activeTab,
  currentSection,
  onNavigate,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  agentName,
}) => {
  // Category expanded state (defaults open for active section)
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    agent: true,
    customerAgent: true,
    tools: true,
    analysis: true,
    reports: true,
    deployment: true,
    account: true,
  });

  const toggleCategory = (catKey: string) => {
    setOpenCategories((prev) => ({ ...prev, [catKey]: !prev[catKey] }));
  };

  const navCategories = [
    {
      id: "agent",
      title: "1. AI BUSINESS AGENT",
      icon: Bot,
      items: [
        { id: "home", label: "Agent Home", icon: Bot, tab: "agent" as ActiveTab, section: "home" },
        { id: "chat", label: "AI Chat", icon: Bot, tab: "agent" as ActiveTab, section: "chat" },
        { id: "voice", label: "Voice / Talk", icon: Mic, tab: "agent" as ActiveTab, section: "voice" },
        { id: "analyze", label: "Analyze", icon: Search, tab: "agent" as ActiveTab, section: "analyze" },
        { id: "tasks", label: "Tasks & Actions", icon: CheckCircle2, tab: "agent" as ActiveTab, section: "tasks" },
        { id: "reports", label: "Reports", icon: FileText, tab: "agent" as ActiveTab, section: "reports" },
        { id: "context", label: "Business Memory", icon: Sliders, tab: "agent" as ActiveTab, section: "context" },
        { id: "agents", label: "Manage Agents", icon: Layers, tab: "agent" as ActiveTab, section: "agents" },
        { id: "documents", label: "Knowledge / Documents", icon: FileCheck, tab: "agent" as ActiveTab, section: "documents" },
        { id: "settings", label: "Agent Settings", icon: SettingsIcon, tab: "agent" as ActiveTab, section: "settings" },
      ],
    },
    {
      id: "customerAgent",
      title: "AI CUSTOMER AGENT",
      icon: Users,
      items: [
        { id: "cust-overview", label: "Overview", icon: Users, tab: "customer-agent" as ActiveTab, section: "overview" },
        { id: "cust-chat", label: "AI Chat Agent", icon: MessageSquare, tab: "customer-agent" as ActiveTab, section: "chat" },
        { id: "cust-voice", label: "AI Voice Agent", icon: PhoneCall, tab: "customer-agent" as ActiveTab, section: "voice" },
        { id: "cust-website", label: "Website Agent", icon: Globe, tab: "customer-agent" as ActiveTab, section: "website" },
        { id: "cust-leads", label: "Lead Management", icon: UserCheck, tab: "customer-agent" as ActiveTab, section: "leads" },
        { id: "cust-conversations", label: "Conversations", icon: MessageCircle, tab: "customer-agent" as ActiveTab, section: "conversations" },
        { id: "cust-appointments", label: "Appointments", icon: Calendar, tab: "customer-agent" as ActiveTab, section: "appointments" },
        { id: "cust-knowledge", label: "Knowledge Base", icon: BookOpen, tab: "customer-agent" as ActiveTab, section: "knowledge" },
        { id: "cust-automations", label: "Automations", icon: Zap, tab: "customer-agent" as ActiveTab, section: "automations" },
        { id: "cust-handoff", label: "Human Handoff", icon: UserX, tab: "customer-agent" as ActiveTab, section: "handoff" },
        { id: "cust-settings", label: "Agent Settings", icon: SettingsIcon, tab: "customer-agent" as ActiveTab, section: "settings" },
        { id: "cust-analytics", label: "Usage & Analytics", icon: BarChart3, tab: "customer-agent" as ActiveTab, section: "analytics" },
        { id: "cust-integrations", label: "Integrations", icon: Link2, tab: "customer-agent" as ActiveTab, section: "integrations" },
      ],
    },
    {
      id: "tools",
      title: "2. BUSINESS TOOLS",
      icon: TrendingUp,
      items: [
        { id: "seo", label: "SEO Hub", icon: Search, tab: "seo" as ActiveTab },
        { id: "social", label: "Social Media Hub", icon: Share2, tab: "social" as ActiveTab },
        { id: "business", label: "Business Growth", icon: TrendingUp, tab: "business" as ActiveTab },
        { id: "export", label: "Export Help", icon: Package, tab: "export" as ActiveTab },
        { id: "traffic", label: "Traffic & Analytics", icon: BarChart3, tab: "traffic" as ActiveTab },
        { id: "customers", label: "Customer Acquisition", icon: Users, tab: "business" as ActiveTab },
        { id: "ads", label: "Ads / Campaign Planning", icon: Target, tab: "social" as ActiveTab },
      ],
    },
    {
      id: "analysis",
      title: "3. ANALYSIS",
      icon: Search,
      items: [
        { id: "website-analysis", label: "Website Analyzer", icon: Globe, tab: "agent" as ActiveTab, section: "analyze" },
        { id: "youtube-analysis", label: "YouTube Analyzer", icon: Youtube, tab: "analysis" as ActiveTab },
        { id: "instagram-analysis", label: "Instagram Analyzer", icon: Smartphone, tab: "analysis" as ActiveTab },
        { id: "app-analysis", label: "App Analyzer", icon: Smartphone, tab: "analysis" as ActiveTab },
        { id: "gbp-analysis", label: "Google Business Analyzer", icon: MapPin, tab: "analysis" as ActiveTab },
        { id: "competitor-analysis", label: "Competitor Analysis", icon: ShieldAlert, tab: "business" as ActiveTab },
        { id: "screenshot-analysis", label: "Screenshot / Image Analysis", icon: ImageIcon, tab: "agent" as ActiveTab, section: "analyze" },
        { id: "multi-channel", label: "Multi-Channel Analysis", icon: Layers, tab: "analysis" as ActiveTab },
      ],
    },
    {
      id: "reports",
      title: "4. REPORTS & PERFORMANCE",
      icon: FileText,
      items: [
        { id: "saved-reports", label: "Saved Reports", icon: FileText, tab: "dashboard" as ActiveTab },
        { id: "traffic-performance", label: "Traffic Performance", icon: BarChart3, tab: "traffic" as ActiveTab },
        { id: "seo-performance", label: "SEO Performance", icon: Search, tab: "seo" as ActiveTab },
        { id: "social-performance", label: "Social Performance", icon: Share2, tab: "social" as ActiveTab },
        { id: "youtube-performance", label: "YouTube Performance", icon: Youtube, tab: "analysis" as ActiveTab },
        { id: "business-reports", label: "Business Reports", icon: FileCheck, tab: "agent" as ActiveTab, section: "reports" },
      ],
    },
    {
      id: "deployment",
      title: "5. AGENT DEPLOYMENT",
      icon: Globe,
      items: [
        { id: "public-agent", label: "Public Agent", icon: ExternalLink, tab: "agent" as ActiveTab, section: "settings" },
        { id: "public-agent-link", label: "Public Agent Link", icon: Globe, tab: "agent" as ActiveTab, section: "settings" },
        { id: "website-embed", label: "Website Embed", icon: Code, tab: "agent" as ActiveTab, section: "settings" },
        { id: "embed-code", label: "Embed Code", icon: Code, tab: "agent" as ActiveTab, section: "settings" },
        { id: "access-control", label: "Public / Private control", icon: Lock, tab: "agent" as ActiveTab, section: "settings" },
      ],
    },
    {
      id: "account",
      title: "6. ACCOUNT",
      icon: UserIcon,
      items: [
        { id: "plans-usage", label: "Plans & Usage", icon: Zap, tab: "pricing" as ActiveTab },
        { id: "pricing", label: "Pricing", icon: CreditCard, tab: "pricing" as ActiveTab },
        { id: "account-settings", label: "Settings", icon: SettingsIcon, tab: "agent" as ActiveTab, section: "settings" },
        { id: "profile", label: "Profile", icon: UserIcon, tab: "dashboard" as ActiveTab },
      ],
    },
  ];

  const isItemActive = (item: { tab: ActiveTab; section?: string }) => {
    if (item.tab !== activeTab) return false;
    if (item.tab === "agent") {
      return (item.section || "home") === currentSection;
    }
    if (item.tab === "customer-agent") {
      return (item.section || "overview") === currentSection;
    }
    return true;
  };

  const content = (
    <div className="flex flex-col h-full bg-[#080d1a] border-r border-slate-800 text-slate-300 select-none">
      {/* Sidebar Header */}
      <div className="p-3.5 border-b border-slate-800 flex items-center justify-between gap-2">
        <div className={`flex items-center gap-2.5 overflow-hidden ${isCollapsed ? "justify-center w-full" : ""}`}>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-purple-600 p-[1px] shrink-0">
            <div className="w-full h-full rounded-[11px] bg-slate-950 flex items-center justify-center text-cyan-400">
              <Bot className="w-4 h-4" />
            </div>
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <span className="font-extrabold text-xs text-white block truncate">
                {agentName || "AI Business Agent"}
              </span>
              <span className="text-[10px] text-cyan-400 font-mono tracking-wider">
                BUSINESS OS
              </span>
            </div>
          )}
        </div>

        {/* Toggle Collapse (Desktop) */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>

        {/* Close Button (Mobile) */}
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          title="Close Navigation"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation Categories List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-3 scrollbar-thin scrollbar-thumb-slate-800">
        {navCategories.map((cat) => {
          const isOpen = openCategories[cat.id] ?? true;
          const CategoryIcon = cat.icon;

          if (isCollapsed) {
            // Icon-only view when collapsed
            return (
              <div key={cat.id} className="py-1 border-b border-slate-800/50 flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onToggleCollapse();
                    setOpenCategories((prev) => ({ ...prev, [cat.id]: true }));
                  }}
                  title={cat.title}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:bg-slate-900 transition-colors"
                >
                  <CategoryIcon className="w-4 h-4" />
                </button>
              </div>
            );
          }

          return (
            <div key={cat.id} className="rounded-xl bg-slate-900/40 border border-slate-800/70 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleCategory(cat.id)}
                className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <CategoryIcon className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    {cat.title}
                  </span>
                </div>
                {isOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                )}
              </button>

              {isOpen && (
                <div className="p-1 space-y-0.5">
                  {cat.items.map((item) => {
                    const ItemIcon = item.icon;
                    const active = isItemActive(item);

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          onNavigate(item.tab, item.section);
                          if (onCloseMobile) onCloseMobile();
                        }}
                        className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 text-left transition-all cursor-pointer ${
                          active
                            ? "bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20"
                            : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                        }`}
                      >
                        <ItemIcon className={`w-3.5 h-3.5 shrink-0 ${active ? "text-slate-950" : "text-slate-400"}`} />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer System Status */}
      {!isCollapsed && (
        <div className="p-3 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
          <span>MD SOYEB AI v2.4</span>
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Operational
          </span>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar (shown when not on homepage) */}
      <aside
        className={`hidden lg:block shrink-0 transition-all duration-300 z-30 sticky top-14 h-[calc(100vh-3.5rem)] ${
          isCollapsed ? "w-16" : "w-64"
        }`}
      >
        {content}
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-slideRight">
            {content}
          </div>
        </div>
      )}
    </>
  );
};

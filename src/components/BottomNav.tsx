import React from "react";
import { Home, Search, Smartphone, Globe2, Briefcase } from "lucide-react";
import { ActiveTab } from "../types";
import { useLanguage } from "../i18n/LanguageContext";

interface BottomNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  const { t } = useLanguage();

  const tabs = [
    { id: "home" as const, label: t("nav.home", "Home"), icon: Home },
    { id: "seo" as const, label: t("nav.seo", "SEO"), icon: Search },
    { id: "social" as const, label: t("nav.social", "Social"), icon: Smartphone },
    { id: "export" as const, label: t("nav.export", "Export"), icon: Globe2 },
    { id: "business" as const, label: t("nav.business", "Business"), icon: Briefcase },
  ];

  return (
    <nav 
      aria-label="Bottom Navigation" 
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#070b16]/90 backdrop-blur-xl border-t border-slate-800/80 px-2 py-1.5 shadow-2xl"
    >
      <div className="max-w-md mx-auto sm:max-w-xl flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              id={`bottom-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl min-w-[58px] min-h-[50px] transition-all duration-200 ${
                isActive
                  ? "text-cyan-400 font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {/* Active subtle pill glow indicator */}
              {isActive && (
                <div 
                  aria-hidden="true" 
                  className="absolute inset-0 rounded-xl bg-gradient-to-b from-cyan-500/15 to-indigo-500/10 border border-cyan-500/30" 
                />
              )}
              
              <Icon className={`w-5 h-5 transition-transform duration-200 relative z-10 ${isActive ? "scale-110 text-cyan-300 stroke-[2.2]" : "stroke-[1.8]"}`} />
              <span className={`text-[11px] mt-1 relative z-10 tracking-tight ${isActive ? "text-cyan-300" : "text-slate-400"}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
